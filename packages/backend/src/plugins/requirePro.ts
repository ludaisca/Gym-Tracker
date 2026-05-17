import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export function checkIsPro(user: { plan: string; planExpiresAt: Date | null; trialEndsAt: Date | null } | null): boolean {
  if (!user) return false
  const now = new Date()
  const proActive = user.plan === 'pro' && (!user.planExpiresAt || user.planExpiresAt > now)
  const trialActive = !!user.trialEndsAt && user.trialEndsAt > now
  return proActive || trialActive
}

export function requirePro(fastify: FastifyInstance) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const { sub } = req.user as { sub: string }
    const user = await fastify.prisma.user.findUnique({
      where: { id: sub },
      select: { plan: true, planExpiresAt: true, trialEndsAt: true },
    })
    if (!checkIsPro(user)) {
      return reply.status(403).send({ error: 'Se requiere plan Pro.', code: 'REQUIRES_PRO' })
    }
  }
}
