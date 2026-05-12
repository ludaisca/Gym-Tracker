import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  accentTheme: z.enum(['teal', 'forest', 'ocean', 'ember', 'violet']).optional(),
  currentWeek: z.number().int().min(1).optional(),
  activeRoutineId: z.string().nullable().optional(),
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

  fastify.put('/me', async (request) => {
    const { sub } = request.user as { sub: string }
    const body = updateUserSchema.safeParse(request.body)
    if (!body.success) throw { statusCode: 400, message: body.error.issues[0].message }

    const user = await prisma.user.update({
      where: { id: sub },
      data: body.data,
      include: { settings: true },
    })
    return sanitizeUser(user)
  })

  fastify.put('/me/settings', async (request) => {
    const { sub } = request.user as { sub: string }
    const body = updateSettingsSchema.safeParse(request.body)
    if (!body.success) throw { statusCode: 400, message: body.error.issues[0].message }

    const updated = await prisma.userSettings.upsert({
      where: { userId: sub },
      update: body.data,
      create: { userId: sub, ...body.data },
    })
    const { aiKey, ...safeSettings } = updated
    return { ...safeSettings, aiKeySet: !!aiKey }
  })

  fastify.get('/me/export', async (request) => {
    const { sub } = request.user as { sub: string }
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: sub },
      include: { settings: true, sessions: true, nutritionDays: true, notes: true, savedFoods: true, customRoutines: true },
    })
    const { passwordHash, ...exportData } = user
    return { version: 4, exportedAt: new Date().toISOString(), data: exportData }
  })

  fastify.post('/me/import', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const payload = request.body as { version?: number; data?: Record<string, unknown> }
    if (!payload?.data) return reply.code(400).send({ error: 'Formato inválido' })

    const { sessions, nutritionDays, notes, savedFoods, customRoutines, settings } = payload.data

    if (Array.isArray(sessions)) {
      for (const s of sessions as Array<Record<string, unknown>>) {
        await prisma.workoutSession.upsert({
          where: { userId_weekNumber_dayId: { userId: sub, weekNumber: Number(s.weekNumber), dayId: String(s.dayId) } },
          create: { userId: sub, weekNumber: Number(s.weekNumber), dayId: String(s.dayId), complete: Boolean(s.complete), notes: String(s.notes ?? ''), cardio: (s.cardio ?? Prisma.JsonNull) as Prisma.InputJsonValue, exercises: (s.exercises ?? []) as Prisma.InputJsonValue },
          update: { complete: Boolean(s.complete), notes: String(s.notes ?? ''), cardio: (s.cardio ?? Prisma.JsonNull) as Prisma.InputJsonValue, exercises: (s.exercises ?? []) as Prisma.InputJsonValue },
        })
      }
    }
    if (Array.isArray(customRoutines)) {
      for (const r of customRoutines as Array<Record<string, unknown>>) {
        await prisma.routine.create({ data: { userId: sub, name: String(r.name), description: r.description ? String(r.description) : null, days: r.days ?? {} } })
      }
    }
    if (settings && typeof settings === 'object') {
      const s = settings as Record<string, unknown>
      await prisma.userSettings.upsert({
        where: { userId: sub },
        create: { userId: sub, sessionLength: String(s.sessionLength ?? '90-120 min'), goal: String(s.goal ?? 'Hipertrofia') },
        update: { sessionLength: String(s.sessionLength ?? '90-120 min'), goal: String(s.goal ?? 'Hipertrofia') },
      })
    }

    return { imported: true }
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
}

export default usersRoutes
