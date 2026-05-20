import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requirePro } from '../plugins/requirePro'
import { isUCError } from '../use-cases/errors'
import {
  listChallenges, createChallenge, joinChallenge,
  getChallengeDetail, deleteChallenge, registerCheckIn, getVersusData,
} from '../use-cases/challenges'

const createSchema = z.object({
  type: z.enum(['checkin', 'versus', 'both']).default('both'),
  durationDays: z.number().int().min(1).max(90).default(30),
})

const joinSchema = z.object({ code: z.string().length(6) })

const checkinSchema = z.object({
  challengeId: z.string(),
  photoBase64: z.string().min(100),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

const challengesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)
  fastify.addHook('onRequest', requirePro(fastify))

  fastify.get('/challenges', async (req) => {
    const userId = (req.user as { sub: string }).sub
    return listChallenges(fastify.repos.challenges, userId)
  })

  fastify.post('/challenges', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const body = createSchema.parse(req.body)
    const result = await createChallenge(fastify.repos.challenges, userId, body)
    return reply.code(201).send(result)
  })

  fastify.post('/challenges/join', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const { code } = joinSchema.parse(req.body)
    const result = await joinChallenge(fastify.repos.challenges, userId, code)
    if (isUCError(result)) return reply.code(result.statusCode).send({ error: result.error })
    return reply.code(200).send(result)
  })

  fastify.get<{ Params: { id: string } }>('/challenges/:id', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const result = await getChallengeDetail(fastify.repos.challenges, userId, req.params.id)
    if (isUCError(result)) return reply.code(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.delete<{ Params: { id: string } }>('/challenges/:id', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const result = await deleteChallenge(fastify.repos.challenges, userId, req.params.id)
    if (isUCError(result)) return reply.code(result.statusCode).send({ error: result.error })
    return reply.code(204).send()
  })

  fastify.post<{ Params: { id: string } }>('/challenges/:id/checkin', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const { photoBase64, lat, lng } = checkinSchema.parse(req.body)
    const result = await registerCheckIn(fastify.repos.challenges, userId, req.params.id, { photoBase64, lat, lng })
    if (isUCError(result)) return reply.code(result.statusCode).send({ error: result.error })
    return reply.code(201).send(result)
  })

  fastify.get<{ Params: { id: string } }>('/challenges/:id/versus', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const result = await getVersusData(fastify.repos, userId, req.params.id)
    if (isUCError(result)) return reply.code(result.statusCode).send({ error: result.error })
    return result
  })
}

export default challengesRoutes
