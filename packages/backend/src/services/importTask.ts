import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

type Tx = Prisma.TransactionClient

const MAX_SESSIONS      = 1000
const MAX_NUTRITION     = 400
const MAX_NOTES         = 500
const MAX_FOODS         = 200
const MAX_ROUTINES      = 50
const MAX_BODY_WEIGHTS  = 400

export interface ImportSummary {
  sessions:     { imported: number; skipped: number; truncated: boolean }
  nutritionDays:{ imported: number; skipped: number; truncated: boolean }
  notes:        { imported: number; skipped: number; truncated: boolean }
  savedFoods:   { imported: number; skipped: number; truncated: boolean }
  bodyWeights:  { imported: number; skipped: number; truncated: boolean }
  customRoutines:{ imported: number; skipped: number; truncated: boolean }
  settings:     { imported: boolean }
}

export async function processImport(sub: string, data: Record<string, unknown>): Promise<ImportSummary> {
  const { sessions, nutritionDays, notes, savedFoods, customRoutines, bodyWeights, settings } = data
  const summary: ImportSummary = {
    sessions:      { imported: 0, skipped: 0, truncated: false },
    nutritionDays: { imported: 0, skipped: 0, truncated: false },
    notes:         { imported: 0, skipped: 0, truncated: false },
    savedFoods:    { imported: 0, skipped: 0, truncated: false },
    bodyWeights:   { imported: 0, skipped: 0, truncated: false },
    customRoutines:{ imported: 0, skipped: 0, truncated: false },
    settings:      { imported: false },
  }

  if (Array.isArray(sessions)) {
    const all = sessions as Array<Record<string, unknown>>
    summary.sessions.truncated = all.length > MAX_SESSIONS
    const batch = all.slice(0, MAX_SESSIONS)
    await prisma.$transaction(
      async (tx: Tx) => {
        for (const s of batch) {
          await tx.workoutSession.upsert({
            where: { userId_weekNumber_dayId: { userId: sub, weekNumber: Number(s.weekNumber), dayId: String(s.dayId) } },
            create: {
              userId: sub,
              weekNumber: Number(s.weekNumber),
              dayId: String(s.dayId),
              complete: Boolean(s.complete),
              notes: String(s.notes ?? ''),
              cardio: (s.cardio ?? null) as object,
              exercises: (s.exercises ?? []) as object,
            },
            update: {
              complete: Boolean(s.complete),
              notes: String(s.notes ?? ''),
              cardio: (s.cardio ?? null) as object,
              exercises: (s.exercises ?? []) as object,
            },
          })
          summary.sessions.imported++
        }
      },
      { timeout: 60_000 }
    ).catch((err: unknown) => {
      summary.sessions.imported = 0
      summary.sessions.skipped = batch.length
      console.error('import sessions transaction failed:', (err as Error).message)
    })
  }

  if (Array.isArray(nutritionDays)) {
    const all = nutritionDays as Array<Record<string, unknown>>
    summary.nutritionDays.truncated = all.length > MAX_NUTRITION
    const batch = all.slice(0, MAX_NUTRITION)
    await prisma.$transaction(
      async (tx: Tx) => {
        for (const n of batch) {
          await tx.nutritionDay.upsert({
            where: { userId_date: { userId: sub, date: String(n.date) } },
            create: {
              userId: sub,
              date: String(n.date),
              water: Number(n.water) || 0,
              meals: (n.meals ?? {}) as object,
            },
            update: {
              water: Number(n.water) || 0,
              meals: (n.meals ?? {}) as object,
            },
          })
          summary.nutritionDays.imported++
        }
      },
      { timeout: 30_000 }
    ).catch((err: unknown) => {
      summary.nutritionDays.imported = 0
      summary.nutritionDays.skipped = batch.length
      console.error('import nutrition transaction failed:', (err as Error).message)
    })
  }

  if (Array.isArray(notes)) {
    const all = notes as Array<Record<string, unknown>>
    summary.notes.truncated = all.length > MAX_NOTES
    const batch = all.slice(0, MAX_NOTES)
    await prisma.$transaction(
      async (tx: Tx) => {
        for (const n of batch) {
          await tx.globalNote.create({
            data: {
              userId: sub,
              text: String(n.text),
              done: Boolean(n.done),
              position: Number(n.position) || 0,
            },
          })
          summary.notes.imported++
        }
      },
      { timeout: 30_000 }
    ).catch((err: unknown) => {
      const code = (err as { code?: string })?.code
      if (code !== 'P2002') console.error('import notes transaction failed:', (err as Error).message)
      summary.notes.skipped = batch.length - summary.notes.imported
    })
  }

  if (Array.isArray(savedFoods)) {
    const all = savedFoods as Array<Record<string, unknown>>
    summary.savedFoods.truncated = all.length > MAX_FOODS
    const batch = all.slice(0, MAX_FOODS)
    await prisma.$transaction(
      async (tx: Tx) => {
        for (const f of batch) {
          await tx.savedFood.create({
            data: {
              userId: sub,
              name: String(f.name),
              kcal: Number(f.kcal) || 0,
              protein: Number(f.protein) || 0,
              carbs: Number(f.carbs) || 0,
              fat: Number(f.fat) || 0,
            },
          })
          summary.savedFoods.imported++
        }
      },
      { timeout: 30_000 }
    ).catch((err: unknown) => {
      console.error('import foods transaction failed:', (err as Error).message)
      summary.savedFoods.skipped = batch.length - summary.savedFoods.imported
    })
  }

  if (Array.isArray(bodyWeights)) {
    const all = bodyWeights as Array<Record<string, unknown>>
    summary.bodyWeights.truncated = all.length > MAX_BODY_WEIGHTS
    const batch = all.slice(0, MAX_BODY_WEIGHTS)
    await prisma.$transaction(
      async (tx: Tx) => {
        for (const bw of batch) {
          await tx.bodyWeight.upsert({
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
          summary.bodyWeights.imported++
        }
      },
      { timeout: 30_000 }
    ).catch((err: unknown) => {
      console.error('import bodyWeights transaction failed:', (err as Error).message)
      summary.bodyWeights.imported = 0
      summary.bodyWeights.skipped = batch.length
    })
  }

  if (Array.isArray(customRoutines)) {
    const all = customRoutines as Array<Record<string, unknown>>
    summary.customRoutines.truncated = all.length > MAX_ROUTINES
    const batch = all.slice(0, MAX_ROUTINES)
    await prisma.$transaction(
      async (tx: Tx) => {
        for (const r of batch) {
          await tx.routine.create({
            data: {
              userId: sub,
              name: String(r.name),
              description: r.description ? String(r.description) : null,
              days: r.days ?? {},
            },
          })
          summary.customRoutines.imported++
        }
      },
      { timeout: 15_000 }
    ).catch((err: unknown) => {
      console.error('import routines transaction failed:', (err as Error).message)
      summary.customRoutines.skipped = batch.length - summary.customRoutines.imported
    })
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
    }).then(() => { summary.settings.imported = true })
     .catch((err: unknown) => console.error('import settings failed:', (err as Error).message))
  }

  return summary
}
