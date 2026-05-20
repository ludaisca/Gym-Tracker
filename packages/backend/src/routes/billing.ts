import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { isUCError } from '../use-cases/errors'
import { createCheckoutSession, createPortalSession, handleWebhook } from '../use-cases/billing'

const billingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { plan: 'monthly' | 'annual'; platform?: string } }>(
    '/checkout',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { sub } = req.user as { sub: string }
      const { plan, platform } = req.body as { plan?: string; platform?: string }
      const result = await createCheckoutSession(
        fastify.repos.users, sub, plan ?? '',
        platform,
        req.headers.origin as string | undefined,
        req.headers.referer as string | undefined
      )
      if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
      return result
    }
  )

  fastify.post(
    '/portal',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { sub } = req.user as { sub: string }
      const result = await createPortalSession(fastify.repos.users, sub)
      if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
      return result
    }
  )

  fastify.post(
    '/webhook',
    { config: { rawBody: true } },
    async (req, reply) => {
      const sig = req.headers['stripe-signature'] as string
      const secret = process.env.STRIPE_WEBHOOK_SECRET
      if (!secret) return reply.status(500).send({ error: 'STRIPE_WEBHOOK_SECRET no configurado.' })

      const rawBody = (req as FastifyRequest & { rawBody?: Buffer }).rawBody
      const result = await handleWebhook(
        fastify.repos.users,
        rawBody as Buffer,
        sig,
        secret,
        fastify.log
      )
      if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
      return result
    }
  )
}

export default billingRoutes
