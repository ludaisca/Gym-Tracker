import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { listSessions, upsertSession, deleteSession, deleteWeekSessions } from '../use-cases/sessions'

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
  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    const { week } = request.query as { week?: string }
    const weekNum = week ? parseInt(week) : undefined
    return listSessions(fastify.repos.sessions, sub, weekNum)
  })

  fastify.put('/:weekNumber/:dayId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber, dayId } = request.params as { weekNumber: string; dayId: string }
    const body = upsertSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    return upsertSession(fastify.repos.sessions, sub, parseInt(weekNumber), dayId, body.data)
  })

  fastify.delete('/:weekNumber/:dayId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber, dayId } = request.params as { weekNumber: string; dayId: string }
    await deleteSession(fastify.repos.sessions, sub, parseInt(weekNumber), dayId)
    return reply.status(204).send()
  })

  fastify.delete('/week/:weekNumber', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { weekNumber } = request.params as { weekNumber: string }
    await deleteWeekSessions(fastify.repos.sessions, sub, parseInt(weekNumber))
    return reply.status(204).send()
  })
}

export default sessionsRoutes
