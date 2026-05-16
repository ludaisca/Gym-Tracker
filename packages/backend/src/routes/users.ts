import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { encryptValue } from '../lib/crypto'

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
  const { prisma } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  function sanitizeUser(user: { passwordHash: string; settings?: { aiKey?: string | null; [k: string]: unknown } | null; [k: string]: unknown }) {
    const { passwordHash, ...safe } = user
    if (safe.settings) {
      const { aiKey, ...safeSettings } = safe.settings as { aiKey?: string | null; [k: string]: unknown }
      safe.settings = { ...safeSettings, aiKeySet: !!aiKey }
    }
    return safe
  }

  fastify.get('/me', async (request) => {
    const { sub } = request.user as { sub: string }
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: sub },
      include: { settings: true },
    })
    return sanitizeUser(user)
  })

  fastify.put('/me', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = updateUserSchema.safeParse(request.body)
    if (!body.success) throw { statusCode: 400, message: body.error.issues[0].message }

    const { email, password, currentPassword, activeRoutineId, ...rest } = body.data
    const data: any = { ...rest }

    if (email || password) {
      if (!currentPassword) {
        return reply.status(400).send({ error: 'Se requiere la contraseña actual para cambiar email o contraseña.' })
      }
      const user = await prisma.user.findUniqueOrThrow({ where: { id: sub } })
      const valid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!valid) {
        return reply.status(401).send({ error: 'La contraseña actual es incorrecta.' })
      }
    }

    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id: sub } } })
      if (existing) return reply.status(409).send({ error: 'El email ya está en uso por otro usuario.' })
      data.email = email
    }

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12)
    }

    if (activeRoutineId !== undefined) {
      data.activeRoutineId = activeRoutineId
      // Auto reset if activating a routine
      if (activeRoutineId !== null) {
        data.routineStartDate = new Date()
        data.currentWeek = 1
      } else {
        data.routineStartDate = null
      }
    }

    const user = await prisma.user.update({
      where: { id: sub },
      data,
      include: { settings: true },
    })
    return sanitizeUser(user)
  })

  fastify.put('/me/settings', async (request) => {
    const { sub } = request.user as { sub: string }
    const body = updateSettingsSchema.safeParse(request.body)
    if (!body.success) throw { statusCode: 400, message: body.error.issues[0].message }

    const payload = { ...body.data }
    if (payload.aiKey) payload.aiKey = encryptValue(payload.aiKey)

    const updated = await prisma.userSettings.upsert({
      where: { userId: sub },
      update: payload,
      create: { userId: sub, ...payload },
    })
    const { aiKey, ...safeSettings } = updated
    return { ...safeSettings, aiKeySet: !!aiKey }
  })

  fastify.get('/me/export', async (request) => {
    const { sub } = request.user as { sub: string }
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: sub },
      include: {
        settings: true,
        sessions: true,
        nutritionDays: true,
        notes: true,
        savedFoods: true,
        customRoutines: true,
        bodyWeights: { orderBy: { date: 'asc' } },
      },
    })
    const { passwordHash, verificationToken, verificationExpiry, resetToken, resetExpiry, ...exportData } = user
    if (exportData.settings) {
      const { aiKey, ...safeSettings } = exportData.settings as Record<string, unknown>
      void aiKey
      exportData.settings = safeSettings as typeof exportData.settings
    }
    return { version: 4, exportedAt: new Date().toISOString(), data: exportData }
  })

  fastify.post('/me/import', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const payload = request.body as { version?: number; data?: Record<string, unknown> }
    if (!payload?.data) return reply.code(400).send({ error: 'Formato inválido' })

    const { backgroundQueue } = require('../services/queue')
    await backgroundQueue.add('import-data', {
      type: 'import',
      userId: sub,
      payload: payload.data
    })

    return { imported: true, status: 'processing' }
  })

  // ── Body weight tracker ──────────────────────────────────────────
  fastify.get('/me/bodyweight', async (request) => {
    const { sub } = request.user as { sub: string }
    return prisma.bodyWeight.findMany({
      where: { userId: sub },
      orderBy: { date: 'asc' },
      take: 365,
    })
  })

  fastify.post('/me/bodyweight', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weight_kg: z.number().positive(),
      notes: z.string().optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0].message })

    return prisma.bodyWeight.upsert({
      where: { userId_date: { userId: sub, date: body.data.date } },
      update: { weight_kg: body.data.weight_kg, notes: body.data.notes ?? null },
      create: { userId: sub, ...body.data },
    })
  })

  fastify.delete('/me/bodyweight/:date', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { date } = request.params as { date: string }
    const entry = await prisma.bodyWeight.findUnique({ where: { userId_date: { userId: sub, date } } })
    if (!entry) return reply.status(404).send({ error: 'No encontrado' })
    await prisma.bodyWeight.delete({ where: { userId_date: { userId: sub, date } } })
    return { deleted: true }
  })

  // ── DELETE /me — eliminar cuenta y todos los datos ───────────────────
  fastify.delete('/me', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    await prisma.user.delete({ where: { id: sub } })  // cascade deletes all related data
    return reply.code(200).send({ deleted: true })
  })
}

export default usersRoutes
