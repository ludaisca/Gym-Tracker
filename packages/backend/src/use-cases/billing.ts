import Stripe from 'stripe'
import type { FastifyRequest } from 'fastify'
import type { UserRepository } from '../repositories/UserRepository'
import { ucErr, UCError } from './errors'

// Webhook payload shapes — only the fields we actually use
export interface SubLike {
  status: string
  metadata?: Record<string, string | undefined>
  items: { data: Array<{ price: { recurring?: { interval?: string } } }> }
  current_period_end?: number
}

export interface CheckoutSessionLike {
  id: string
  mode: string
  subscription?: string
  metadata?: Record<string, string | undefined> | null
}

export interface StripeEventLike {
  type: string
  data: { object: unknown }
}

export const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? 'price_1TYIYBDSYiEGEX8AeFBiwHKh',
  annual:  process.env.STRIPE_PRICE_ANNUAL  ?? 'price_1TYIYBDSYiEGEX8AQLmqWzg3',
}

// current_period_end puede ser undefined con la API dahlia.
export function safePeriodEnd(sub: SubLike): Date {
  if (sub.current_period_end) return new Date(sub.current_period_end * 1000)
  const interval = sub.items.data[0]?.price.recurring?.interval ?? 'month'
  const d = new Date()
  if (interval === 'year') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada')
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

export async function createCheckoutSession(
  users: UserRepository,
  userId: string,
  plan: string,
  platform: string | undefined,
  originHeader: string | undefined,
  refererHeader: string | undefined
): Promise<{ url: string | null } | UCError> {
  if (plan !== 'monthly' && plan !== 'annual') {
    return ucErr('Plan inválido. Usa "monthly" o "annual".', 400)
  }

  const user = await users.findById(userId)
  if (!user) return ucErr('Usuario no encontrado.', 404)

  const stripe = getStripe()
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173'

  let customerId = user.stripeCustomerId ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await users.update(userId, { stripeCustomerId: customerId })
  }

  let successUrl: string
  let cancelUrl: string
  if (platform === 'android') {
    successUrl = 'gymtracker://upgrade?success=1'
    cancelUrl  = 'gymtracker://upgrade?canceled=1'
  } else {
    const origin = (originHeader ?? refererHeader?.replace(/\/$/, '') ?? appUrl)
    const baseUrl = origin.startsWith('http') ? origin : appUrl
    successUrl = `${baseUrl}/upgrade?success=1`
    cancelUrl  = `${baseUrl}/upgrade?canceled=1`
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PRICES[plan as 'monthly' | 'annual'], quantity: 1 }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    metadata: { userId: user.id, plan },
    subscription_data: { metadata: { userId: user.id, plan } },
    allow_promotion_codes: true,
    locale: 'es',
  })

  return { url: session.url }
}

export async function createPortalSession(
  users: UserRepository,
  userId: string
): Promise<{ url: string } | UCError> {
  const user = await users.findById(userId)
  if (!user?.stripeCustomerId) return ucErr('No tienes una suscripción activa.', 400)

  const stripe = getStripe()
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173'

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/upgrade`,
  })
  return { url: session.url }
}

export async function handleWebhook(
  users: UserRepository,
  rawBody: Buffer,
  sig: string,
  secret: string,
  log?: { info: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void }
): Promise<{ received: boolean } | UCError> {
  const stripe = getStripe()

  let event: StripeEventLike
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret) as unknown as StripeEventLike
  } catch {
    return ucErr('Webhook signature inválida.', 400)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as CheckoutSessionLike
      if (session.mode !== 'subscription') break
      const userId = session.metadata?.userId
      if (!userId) {
        log?.warn({ sessionId: session.id }, 'checkout.session.completed sin userId en metadata')
        break
      }
      const sub = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as SubLike
      const periodEnd = safePeriodEnd(sub)
      await users.update(userId, { plan: 'pro', planExpiresAt: periodEnd, trialEndsAt: null })
      log?.info({ userId, periodEnd }, 'Plan Pro activado via Stripe')
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as SubLike
      const userId = sub.metadata?.userId
      if (!userId) break
      const isActive = sub.status === 'active' || sub.status === 'trialing'
      const periodEnd = safePeriodEnd(sub)
      await users.update(userId, {
        plan: isActive ? 'pro' : 'free',
        planExpiresAt: isActive ? periodEnd : null,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as SubLike
      const userId = sub.metadata?.userId
      if (!userId) break
      await users.update(userId, { plan: 'free', planExpiresAt: null })
      log?.info({ userId }, 'Suscripción cancelada — plan degradado a Free')
      break
    }
  }

  return { received: true }
}

export { UCError }
export type { FastifyRequest }
