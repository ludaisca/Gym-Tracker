import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { extractBestOneRMs } from '../types/domain'
import { requirePro } from '../plugins/requirePro'

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify
  fastify.addHook('onRequest', fastify.authenticate)
  fastify.addHook('onRequest', requirePro(fastify))

  // ── GET /analytics/week/:week ─────────────────────────────────────────────
  fastify.get<{ Params: { week: string } }>('/week/:week', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const week = parseInt(req.params.week, 10)
    if (isNaN(week) || week < 1) return reply.status(400).send({ error: 'Número de semana inválido.' })

    const sessions = await prisma.workoutSession.findMany({
      where: { userId: sub, weekNumber: week },
    })

    const byExercise = new Map<string, number>()
    let totalVolume = 0

    for (const s of sessions) {
      const exercises = Array.isArray(s.exercises) ? s.exercises as Array<{
        name?: string; done?: boolean; sets?: Array<{ kg: string; reps: string }>
      }> : []

      for (const ex of exercises) {
        if (!ex?.name) continue
        const vol = (ex.sets ?? []).reduce((a, set) => {
          const kg = parseFloat(set.kg)
          const reps = parseFloat(set.reps)
          return a + (isNaN(kg) || isNaN(reps) ? 0 : kg * reps)
        }, 0)
        byExercise.set(ex.name, (byExercise.get(ex.name) ?? 0) + vol)
        totalVolume += vol
      }
    }

    const bests = extractBestOneRMs(sessions)
    const prs = Object.values(bests).map(b => ({
      name: b.name,
      kg: b.weight,
      reps: b.reps,
      oneRM: b.oneRM,
    })).sort((a, b) => b.oneRM - a.oneRM)

    const exercises = [...byExercise.entries()]
      .map(([name, volume]) => ({ name, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume)

    return {
      week,
      sessions: sessions.length,
      totalVolume: Math.round(totalVolume),
      exercises,
      prs,
    }
  })

  // ── GET /analytics/exercise?name=... ─────────────────────────────────────
  fastify.get('/exercise', async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const { name } = req.query as { name?: string }
    if (!name) return reply.status(400).send({ error: 'Parámetro name requerido.' })

    const sessions = await prisma.workoutSession.findMany({
      where: { userId: sub },
      orderBy: { weekNumber: 'asc' },
    })

    const byWeek = new Map<number, { bestKg: number; bestReps: number; oneRM: number }>()

    for (const s of sessions) {
      const exercises = Array.isArray(s.exercises) ? s.exercises as Array<{
        name?: string; done?: boolean; sets?: Array<{ kg: string; reps: string }>
      }> : []

      for (const ex of exercises) {
        if (!ex?.name || ex.name.toLowerCase() !== name.toLowerCase()) continue
        for (const set of (ex.sets ?? [])) {
          const kg = parseFloat(set.kg)
          const reps = parseFloat(set.reps)
          if (isNaN(kg) || isNaN(reps) || kg <= 0 || reps <= 0) continue
          const oneRM = Math.round(kg * (1 + reps / 30))
          const prev = byWeek.get(s.weekNumber)
          if (!prev || oneRM > prev.oneRM) {
            byWeek.set(s.weekNumber, { bestKg: kg, bestReps: reps, oneRM })
          }
        }
      }
    }

    return [...byWeek.entries()]
      .sort(([a], [b]) => a - b)
      .map(([week, data]) => ({ week, ...data }))
  })
}

export default analyticsRoutes
