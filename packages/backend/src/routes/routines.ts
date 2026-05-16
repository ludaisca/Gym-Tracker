import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const routineSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  days: z.record(z.unknown()),
})

const routinesRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    return prisma.routine.findMany({ where: { userId: sub }, orderBy: { id: 'asc' }, take: 50 })
  })

  fastify.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = routineSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })
    return reply.status(201).send(await prisma.routine.create({ data: { userId: sub, ...body.data, days: body.data.days as object } }))
  })

  fastify.put('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const body = routineSchema.partial().safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const routine = await prisma.routine.findFirst({ where: { id, userId: sub } })
    if (!routine) return reply.status(404).send({ error: 'No encontrado' })

    return prisma.routine.update({ where: { id }, data: body.data as object })
  })

  fastify.delete('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const routine = await prisma.routine.findFirst({ where: { id, userId: sub } })
    if (!routine) return reply.status(404).send({ error: 'No encontrado' })
    await prisma.routine.delete({ where: { id } })
    return reply.status(204).send()
  })
}

export default routinesRoutes
