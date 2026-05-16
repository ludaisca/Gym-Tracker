import type { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'crypto'

interface LegacySet { kg: string; reps: string }
interface LegacyExercise { done: boolean; sets: LegacySet[] }
interface LegacySession { complete: boolean; notes: string; cardio: unknown; exercises: LegacyExercise[] }
interface LegacySettings { sessionLength?: string; goal?: string; cardioDefault?: string; calorieGoal?: number; proteinGoal?: number; carbGoal?: number; fatGoal?: number; waterGoal?: number; aiProvider?: string; aiKey?: string; aiModel?: string }
interface LegacyUser { week?: number; activeRoutineId?: string; sessions?: Record<string, LegacySession>; settings?: LegacySettings; globalNotes?: string[]; customRoutines?: Record<string, unknown>; nutritionLog?: Record<string, unknown>; savedFoods?: { name: string; kcal: number; protein: number; carbs: number; fat: number }[] }
interface LegacyState { currentUserId?: string; users?: Record<string, LegacyUser> }

const migrateRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify

  fastify.addHook('onRequest', fastify.authenticate)

  fastify.post('/localstorage', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const data = request.body as LegacyState

    // Find the main user in legacy data (currentUserId or first key)
    const userId = data.currentUserId ?? Object.keys(data.users ?? {})[0]
    const legacy = data.users?.[userId]
    if (!legacy) return reply.status(400).send({ error: 'Datos no válidos' })

    const imported = { sessions: 0, nutritionDays: 0, notes: 0, routines: 0 }

    // Sessions
    for (const [key, session] of Object.entries(legacy.sessions ?? {})) {
      const match = key.match(/^week-(\d+)-(.+)$/)
      if (!match) continue
      const weekNumber = parseInt(match[1])
      const dayId = match[2]
      await prisma.workoutSession.upsert({
        where: { userId_weekNumber_dayId: { userId: sub, weekNumber, dayId } },
        update: { complete: session.complete, notes: session.notes, cardio: session.cardio as object, exercises: session.exercises as object },
        create: { userId: sub, weekNumber, dayId, complete: session.complete, notes: session.notes, cardio: session.cardio as object, exercises: session.exercises as object },
      })
      imported.sessions++
    }

    // Nutrition
    for (const [date, dayData] of Object.entries(legacy.nutritionLog ?? {})) {
      await prisma.nutritionDay.upsert({
        where: { userId_date: { userId: sub, date } },
        update: { meals: dayData as object },
        create: { userId: sub, date, meals: dayData as object },
      })
      imported.nutritionDays++
    }

    // Notes
    const notes = legacy.globalNotes ?? []
    for (let i = 0; i < notes.length; i++) {
      const text = notes[i]
      const done = text.startsWith('✅ ')
      await prisma.globalNote.create({ data: { userId: sub, text: done ? text.slice(3) : text, done, position: i } })
      imported.notes++
    }

    // Custom routines
    for (const [, routine] of Object.entries(legacy.customRoutines ?? {})) {
      await prisma.routine.create({ data: { userId: sub, name: (routine as { name?: string }).name ?? 'Rutina importada', days: routine as object } })
      imported.routines++
    }

    // Settings + week
    if (legacy.settings) {
      await prisma.userSettings.upsert({
        where: { userId: sub },
        update: legacy.settings,
        create: { userId: sub, ...legacy.settings },
      })
    }
    if (legacy.week || legacy.activeRoutineId) {
      await prisma.user.update({
        where: { id: sub },
        data: { currentWeek: legacy.week ?? 1, activeRoutineId: legacy.activeRoutineId },
      })
    }

    // Saved foods
    for (const food of legacy.savedFoods ?? []) {
      await prisma.savedFood.create({ data: { userId: sub, ...food } })
    }

    return { success: true, imported }
  })
}

export default migrateRoutes
