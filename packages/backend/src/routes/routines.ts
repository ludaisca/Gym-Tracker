import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { isUCError } from '../use-cases/errors'
import {
  listRoutines, createRoutine, updateRoutine, deleteRoutine,
  getPublicRoutine, generateShareCode, revokeShareCode,
  importRoutine, publishRoutine, unpublishRoutine,
} from '../use-cases/routines'

const routineSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  days: z.record(z.unknown()),
})

const routinesRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /routines/public/:code — sin autenticación ────────────────────────
  fastify.get<{ Params: { code: string } }>('/public/:code', async (req, reply) => {
    const result = await getPublicRoutine(fastify.repos.routines, req.params.code)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    return listRoutines(fastify.repos.routines, sub)
  })

  fastify.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = routineSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const result = await createRoutine(fastify.repos, sub, body.data)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error, ...(result.code && { code: result.code }) })
    return reply.status(201).send(result)
  })

  fastify.put('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const body = routineSchema.partial().safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const result = await updateRoutine(fastify.repos.routines, sub, id, body.data)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.delete('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const result = await deleteRoutine(fastify.repos.routines, sub, id)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return reply.status(204).send()
  })

  fastify.post<{ Params: { id: string } }>('/:id/share', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = await generateShareCode(fastify.repos.routines, sub, req.params.id)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.delete<{ Params: { id: string } }>('/:id/share', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = await revokeShareCode(fastify.repos.routines, sub, req.params.id)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return reply.status(204).send()
  })

  fastify.post<{ Params: { code: string } }>('/import/:code', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = await importRoutine(fastify.repos.routines, sub, req.params.code)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return reply.status(201).send(result)
  })

  fastify.post<{ Params: { id: string } }>('/:id/publish', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = await publishRoutine(fastify.repos, sub, req.params.id)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error, ...(result.code && { code: result.code }) })
    return result
  })

  fastify.delete<{ Params: { id: string } }>('/:id/publish', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = await unpublishRoutine(fastify.repos.routines, sub, req.params.id)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return reply.status(204).send()
  })
}

export default routinesRoutes
