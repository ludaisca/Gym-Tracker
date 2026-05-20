import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { isUCError } from '../use-cases/errors'
import { getMe, activateTrial, grantPro, updateMe, updateSettings, exportUserData, deleteAccount } from '../use-cases/users'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  currentPassword: z.string().optional(),
  avatar: z.string().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  accentTheme: z.enum(['teal', 'forest', 'ocean', 'ember', 'violet']).optional(),
  currentWeek: z.number().int().min(1).optional(),
  activeRoutineId: z.string().nullable().optional(),
  routineStartDate: z.string().datetime().nullable().optional(),
})

const updateSettingsSchema = z.object({
  sessionLength: z.string().optional(),
  goal: z.string().optional(),
  cardioDefault: z.string().optional(),
  calorieGoal: z.number().int().optional(),
  proteinGoal: z.number().int().optional(),
  carbGoal: z.number().int().optional(),
  fatGoal: z.number().int().optional(),
  waterGoal: z.number().int().optional(),
  aiProvider: z.string().nullable().optional(),
  aiKey: z.string().nullable().optional(),
  aiModel: z.string().nullable().optional(),
})

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/me', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const result = await getMe(fastify.repos.users, sub)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.post('/me/trial', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const result = await activateTrial(fastify.repos.users, sub)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.post('/admin/grant-pro', {
    onRequest: async (req, reply) => {
      const adminToken = process.env.ADMIN_TOKEN
      if (!adminToken || req.headers.authorization !== `Bearer ${adminToken}`) {
        return reply.status(401).send({ error: 'No autorizado.' })
      }
    },
  }, async (request, reply) => {
    const body = z.object({ userId: z.string(), months: z.number().int().min(0) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    const result = await grantPro(fastify.repos.users, body.data.userId, body.data.months)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.put('/me', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = updateUserSchema.safeParse(request.body)
    if (!body.success) throw { statusCode: 400, message: body.error.issues[0].message }

    const result = await updateMe(fastify.repos.users, sub, body.data)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.put('/me/settings', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = updateSettingsSchema.safeParse(request.body)
    if (!body.success) throw { statusCode: 400, message: body.error.issues[0].message }

    const result = await updateSettings(fastify.repos.users, sub, body.data)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error })
    return result
  })

  fastify.get('/me/export', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const result = await exportUserData(fastify.repos.users, sub)
    if (isUCError(result)) return reply.status(result.statusCode).send({ error: result.error, ...(result.code && { code: result.code }) })
    return result
  })

  fastify.post('/me/import', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const payload = request.body as { version?: number; data?: Record<string, unknown> }
    if (!payload?.data) return reply.code(400).send({ error: 'Formato inválido' })

    const { backgroundQueue } = require('../services/queue')
    await backgroundQueue.add('import-data', { type: 'import', userId: sub, payload: payload.data })
    return { imported: true, status: 'processing' }
  })

  fastify.get('/me/bodyweight', async (request) => {
    const { sub } = request.user as { sub: string }
    return fastify.repos.users.findBodyWeights(sub)
  })

  fastify.post('/me/bodyweight', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weight_kg: z.number().positive(),
      notes: z.string().optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    return fastify.repos.users.upsertBodyWeight(sub, body.data.date, body.data.weight_kg, body.data.notes)
  })

  fastify.delete('/me/bodyweight/:date', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { date } = request.params as { date: string }
    const deleted = await fastify.repos.users.deleteBodyWeight(sub, date)
    if (!deleted) return reply.status(404).send({ error: 'No encontrado' })
    return { deleted: true }
  })

  fastify.delete('/me', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    return deleteAccount(fastify.repos.users, sub)
  })
}

export default usersRoutes
