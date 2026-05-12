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
  const { prisma } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    const { week } = request.query as { week?: string }
    const where: Record<string, unknown> = { userId: sub }
    if (week) where.weekNumber = parseInt(week)
    return prisma.workoutSession.findMany({ where, orderBy: [{ weekNumber: 'asc' }, { dayId: 'asc' }], take: 2000 })
  })

  fastify.put('/:weekNumber/:dayId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber, dayId } = request.params as { weekNumber: string; dayId: string }
    const week = parseInt(weekNumber)

    const body = upsertSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    return prisma.workoutSession.upsert({
      where: { userId_weekNumber_dayId: { userId: sub, weekNumber: week, dayId } },
      update: body.data as object,
      create: { userId: sub, weekNumber: week, dayId, ...(body.data as object) },
    })
  })

  fastify.delete('/:weekNumber/:dayId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber, dayId } = request.params as { weekNumber: string; dayId: string }
    await prisma.workoutSession.deleteMany({ where: { userId: sub, weekNumber: parseInt(weekNumber), dayId } })
    return reply.status(204).send()
  })

  fastify.delete('/week/:weekNumber', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber } = request.params as { weekNumber: string }
    await prisma.workoutSession.deleteMany({ where: { userId: sub, weekNumber: parseInt(weekNumber) } })
    return reply.status(204).send()
  })
}

export default sessionsRoutes
