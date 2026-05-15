import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

const MAX_SESSIONS      = 1000
const MAX_NUTRITION     = 400
const MAX_NOTES         = 500
const MAX_FOODS         = 200
const MAX_ROUTINES      = 50
const MAX_BODY_WEIGHTS  = 400

export async function processImport(sub: string, data: Record<string, unknown>) {
  const { sessions, nutritionDays, notes, savedFoods, customRoutines, bodyWeights, settings } = data

  if (Array.isArray(sessions)) {
    for (const s of (sessions as Array<Record<string, unknown>>).slice(0, MAX_SESSIONS)) {
      await prisma.workoutSession.upsert({
        where: { userId_weekNumber_dayId: { userId: sub, weekNumber: Number(s.weekNumber), dayId: String(s.dayId) } },
        create: {
          userId: sub,
          weekNumber: Number(s.weekNumber),
          dayId: String(s.dayId),
          complete: Boolean(s.complete),
          notes: String(s.notes ?? ''),
          cardio: (s.cardio ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          exercises: (s.exercises ?? []) as Prisma.InputJsonValue,
        },
        update: {
          complete: Boolean(s.complete),
          notes: String(s.notes ?? ''),
          cardio: (s.cardio ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          exercises: (s.exercises ?? []) as Prisma.InputJsonValue,
        },
      })
    }
  }

  if (Array.isArray(nutritionDays)) {
    for (const n of (nutritionDays as Array<Record<string, unknown>>).slice(0, MAX_NUTRITION)) {
      await prisma.nutritionDay.upsert({
        where: { userId_date: { userId: sub, date: String(n.date) } },
        create: {
          userId: sub,
          date: String(n.date),
          water: Number(n.water) || 0,
          meals: (n.meals ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          water: Number(n.water) || 0,
          meals: (n.meals ?? {}) as Prisma.InputJsonValue,
        },
      })
    }
  }

  if (Array.isArray(notes)) {
    for (const n of (notes as Array<Record<string, unknown>>).slice(0, MAX_NOTES)) {
      await prisma.globalNote.create({
        data: {
          userId: sub,
          text: String(n.text),
          done: Boolean(n.done),
          position: Number(n.position) || 0,
        },
      }).catch((err: unknown) => {
        const code = (err as { code?: string })?.code
        if (code !== 'P2002') console.warn('import note error:', (err as Error).message)
      })
    }
  }

  if (Array.isArray(savedFoods)) {
    for (const f of (savedFoods as Array<Record<string, unknown>>).slice(0, MAX_FOODS)) {
      await prisma.savedFood.create({
        data: {
          userId: sub,
          name: String(f.name),
          kcal: Number(f.kcal) || 0,
          protein: Number(f.protein) || 0,
          carbs: Number(f.carbs) || 0,
          fat: Number(f.fat) || 0,
        },
      }).catch((err: unknown) => {
        const code = (err as { code?: string })?.code
        if (code !== 'P2002') console.warn('import food error:', (err as Error).message)
      })
    }
  }

  if (Array.isArray(bodyWeights)) {
    for (const bw of (bodyWeights as Array<Record<string, unknown>>).slice(0, MAX_BODY_WEIGHTS)) {
      await prisma.bodyWeight.upsert({
        where: { userId_date: { userId: sub, date: String(bw.date) } },
        create: {
          userId: sub,
          date: String(bw.date),
          weight_kg: Number(bw.weight_kg) || 0,
          notes: bw.notes ? String(bw.notes) : null,
        },
        update: {
          weight_kg: Number(bw.weight_kg) || 0,
          notes: bw.notes ? String(bw.notes) : null,
        },
      })
    }
  }

  if (Array.isArray(customRoutines)) {
    for (const r of (customRoutines as Array<Record<string, unknown>>).slice(0, MAX_ROUTINES)) {
      await prisma.routine.create({
        data: {
          userId: sub,
          name: String(r.name),
          description: r.description ? String(r.description) : null,
          days: r.days ?? {},
        },
      })
    }
  }

  if (settings && typeof settings === 'object') {
    const s = settings as Record<string, unknown>
    await prisma.userSettings.upsert({
      where: { userId: sub },
      create: {
        userId: sub,
        sessionLength: String(s.sessionLength ?? '90-120 min'),
        goal:          String(s.goal ?? 'Hipertrofia'),
        cardioDefault: String(s.cardioDefault ?? '20 min'),
        calorieGoal:   Number(s.calorieGoal)  || 2500,
        proteinGoal:   Number(s.proteinGoal)  || 150,
        carbGoal:      Number(s.carbGoal)     || 250,
        fatGoal:       Number(s.fatGoal)      || 80,
        waterGoal:     Number(s.waterGoal)    || 8,
      },
      update: {
        sessionLength: String(s.sessionLength ?? '90-120 min'),
        goal:          String(s.goal ?? 'Hipertrofia'),
        cardioDefault: String(s.cardioDefault ?? '20 min'),
        calorieGoal:   Number(s.calorieGoal)  || 2500,
        proteinGoal:   Number(s.proteinGoal)  || 150,
        carbGoal:      Number(s.carbGoal)     || 250,
        fatGoal:       Number(s.fatGoal)      || 80,
        waterGoal:     Number(s.waterGoal)    || 8,
      },
    })
  }

  return true
}
