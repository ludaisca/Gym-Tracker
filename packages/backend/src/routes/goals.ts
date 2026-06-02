import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const goalSchema = z.object({
  exerciseName: z.string().min(1).max(100),
  targetKg: z.number().positive().max(1000),
})

const goalsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    return fastify.prisma.liftGoal.findMany({
      where: { userId: sub },
      orderBy: { createdAt: 'desc' },
    })
  })

  fastify.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsed = goalSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0].message })
    const { exerciseName, targetKg } = parsed.data
    const goal = await fastify.prisma.liftGoal.upsert({
      where: { userId_exerciseName: { userId: sub, exerciseName } },
      update: { targetKg },
      create: { userId: sub, exerciseName, targetKg },
    })
    return reply.status(201).send(goal)
  })

  fastify.delete('/:exerciseName', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { exerciseName } = request.params as { exerciseName: string }
    await fastify.prisma.liftGoal.deleteMany({ where: { userId: sub, exerciseName } })
    return reply.status(204).send()
  })
}

export default goalsRoutes
