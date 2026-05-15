import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const upsertSchema = z.object({
  complete: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  cardio: z.object({ machine: z.string(), duration: z.string(), intensity: z.string() }).nullable().optional(),
  exercises: z.array(z.object({
    done: z.boolean(),
    sets: z.array(z.object({ kg: z.string(), reps: z.string() })),
  })).optional(),
  routineId: z.string().nullable().optional(),
})

const sessionsRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma, redis } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  // Helper to invalidate sessions cache for a user
  const invalidateSessionsCache = async (userId: string) => {
    if (redis) {
      await redis.del(`sessions:all:${userId}`)
    }
  }

  fastify.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    const { week } = request.query as { week?: string }
    
    // If a specific week is requested, we don't cache (it's small and frequent)
    if (week) {
      const where: Record<string, unknown> = { userId: sub, weekNumber: parseInt(week) }
      return prisma.workoutSession.findMany({ where, orderBy: [{ weekNumber: 'asc' }, { dayId: 'asc' }] })
    }

    // Cache logic for listAll (full history)
    const cacheKey = `sessions:all:${sub}`
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)
    }

    const where: Record<string, unknown> = { userId: sub }
    const sessions = await prisma.workoutSession.findMany({ where, orderBy: [{ weekNumber: 'asc' }, { dayId: 'asc' }], take: 2000 })
    
    if (redis) {
      // Cache the full history for 24 hours
      await redis.set(cacheKey, JSON.stringify(sessions), 'EX', 60 * 60 * 24)
    }
    
    return sessions
  })

  fastify.put('/:weekNumber/:dayId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber, dayId } = request.params as { weekNumber: string; dayId: string }
    const week = parseInt(weekNumber)

    const body = upsertSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const result = await prisma.workoutSession.upsert({
      where: { userId_weekNumber_dayId: { userId: sub, weekNumber: week, dayId } },
      update: body.data as object,
      create: { userId: sub, weekNumber: week, dayId, ...(body.data as object) },
    })
    
    await invalidateSessionsCache(sub)
    return result
  })

  fastify.delete('/:weekNumber/:dayId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber, dayId } = request.params as { weekNumber: string; dayId: string }
    await prisma.workoutSession.deleteMany({ where: { userId: sub, weekNumber: parseInt(weekNumber), dayId } })
    await invalidateSessionsCache(sub)
    return reply.status(204).send()
  })

  fastify.delete('/week/:weekNumber', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber } = request.params as { weekNumber: string }
    await prisma.workoutSession.deleteMany({ where: { userId: sub, weekNumber: parseInt(weekNumber) } })
    await invalidateSessionsCache(sub)
    return reply.status(204).send()
  })
}

export default sessionsRoutes
