import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const notesRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    return prisma.globalNote.findMany({ where: { userId: sub }, orderBy: { position: 'asc' }, take: 500 })
  })

  fastify.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { text } = z.object({ text: z.string().min(1) }).parse(request.body)
    const count = await prisma.globalNote.count({ where: { userId: sub } })
    return reply.status(201).send(await prisma.globalNote.create({ data: { userId: sub, text, position: count } }))
  })

  fastify.put('/reorder', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { ids } = z.object({ ids: z.array(z.string()) }).parse(request.body)
    await Promise.all(ids.map((id, position) =>
      prisma.globalNote.updateMany({ where: { id, userId: sub }, data: { position } })
    ))
    return reply.status(200).send()
  })

  fastify.put('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const body = z.object({ text: z.string().optional(), done: z.boolean().optional(), position: z.number().optional() }).parse(request.body)
    const note = await prisma.globalNote.findFirst({ where: { id, userId: sub } })
    if (!note) return reply.status(404).send({ error: 'No encontrado' })
    return prisma.globalNote.update({ where: { id }, data: body })
  })

  fastify.delete('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    await prisma.globalNote.deleteMany({ where: { id, userId: sub } })
    return reply.status(204).send()
  })
}

export default notesRoutes
