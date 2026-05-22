import type { FastifyPluginAsync } from 'fastify'
import { isUCError } from '../use-cases/errors'
import { getWeekAnalytics, getExerciseProgress } from '../use-cases/analytics'

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get<{ Params: { week: string } }>('/week/:week', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const week = parseInt(req.params.week, 10)
    const result = await getWeekAnalytics(fastify.repos.sessions, sub, week)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.get('/exercise', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { name } = req.query as { name?: string }
    const result = await getExerciseProgress(fastify.repos.sessions, sub, name ?? '')
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })
}

export default analyticsRoutes
