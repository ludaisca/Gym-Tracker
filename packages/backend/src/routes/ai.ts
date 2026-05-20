import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requirePro } from '../plugins/requirePro'
import { isUCError } from '../use-cases/errors'
import { analyzeFood, analyzeWorkout, chatWithAI, type ChatMessage } from '../use-cases/ai'

const analyzeFoodSchema = z.object({
  imageBase64: z.string().min(1).max(2_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
})

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)
  fastify.addHook('onRequest', requirePro(fastify))

  fastify.post('/analyze-food', {
    bodyLimit: 10 * 1024 * 1024,
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsed = analyzeFoodSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0].message })

    const settings = await fastify.prisma.userSettings.findUnique({ where: { userId: sub } })
    const result = await analyzeFood(sub, settings, parsed.data.imageBase64, parsed.data.mimeType)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.post('/analyze', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const settings = await fastify.prisma.userSettings.findUnique({ where: { userId: sub } })
    const result = await analyzeWorkout(fastify.repos, sub, settings)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.get('/chat', async (request) => {
    const { sub } = request.user as { sub: string }
    const chat = await fastify.prisma.aIChat.findUnique({ where: { userId: sub } })
    return { messages: (chat?.messages ?? []) as unknown as ChatMessage[] }
  })

  fastify.delete('/chat', async (request) => {
    const { sub } = request.user as { sub: string }
    await fastify.prisma.aIChat.deleteMany({ where: { userId: sub } })
    return { cleared: true }
  })

  fastify.post('/chat', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const parsed = chatSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0].message })

    const settings = await fastify.prisma.userSettings.findUnique({ where: { userId: sub } })
    const chatRecord = await fastify.prisma.aIChat.findUnique({ where: { userId: sub } })
    const history = (chatRecord?.messages ?? []) as unknown as ChatMessage[]

    const result = await chatWithAI(fastify.repos, sub, settings, parsed.data.message, history)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })

    await fastify.prisma.aIChat.upsert({
      where: { userId: sub },
      update: { messages: result.updatedMessages as unknown as object },
      create: { userId: sub, messages: result.updatedMessages as unknown as object },
    })

    return { message: result.message }
  })
}

export default aiRoutes
