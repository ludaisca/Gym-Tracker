import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'

// ── helpers ──────────────────────────────────────────────────────────────
function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.randomBytes(len))
    .map(b => chars[b % chars.length])
    .join('')
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ── Schemas ───────────────────────────────────────────────────────────────
const createSchema = z.object({
  type: z.enum(['checkin', 'versus', 'both']).default('both'),
  durationDays: z.number().int().min(1).max(90).default(30),
})

const joinSchema = z.object({ code: z.string().length(6) })

const checkinSchema = z.object({
  challengeId: z.string(),
  photoBase64: z.string().min(100),   // base64 data URL
  lat: z.number().optional(),
  lng: z.number().optional(),
})

// ── Route plugin ─────────────────────────────────────────────────────────
const challengesRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify
  fastify.addHook('onRequest', fastify.authenticate)

  // Upload dir (create if needed)
  const uploadDir = join(process.cwd(), 'uploads', 'checkins')
  try { mkdirSync(uploadDir, { recursive: true }) } catch {}

  // ── GET /challenges — list my active challenges ───────────────────────
  fastify.get('/challenges', async (req) => {
    const userId = (req.user as { sub: string }).sub
    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [{ creatorId: userId }, { opponentId: userId }],
        status: { not: 'finished' },
      },
      include: {
        creator:  { select: { id: true, name: true, avatar: true } },
        opponent: { select: { id: true, name: true, avatar: true } },
        checkIns: { select: { userId: true, serverTime: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    const days = (dt: Date) => dateStr(dt)
    return challenges.map(ch => {
      const creatorDays  = new Set(ch.checkIns.filter(c => c.userId === ch.creatorId).map(c => days(c.serverTime)))
      const opponentDays = ch.opponentId
        ? new Set(ch.checkIns.filter(c => c.userId === ch.opponentId).map(c => days(c.serverTime)))
        : new Set<string>()
      return {
        ...ch,
        stats: {
          creator:  { checkInDays: creatorDays.size,  dates: [...creatorDays] },
          opponent: { checkInDays: opponentDays.size, dates: [...opponentDays] },
        },
      }
    })
  })

  // ── POST /challenges — create a new challenge ─────────────────────────
  fastify.post('/challenges', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const body = createSchema.parse(req.body)

    const code = randomCode()
    const challenge = await prisma.challenge.create({
      data: {
        code,
        creatorId: userId,
        type: body.type,
        status: 'pending',
      },
    })
    return reply.code(201).send({ challenge, code })
  })

  // ── POST /challenges/join — join by code ──────────────────────────────
  fastify.post('/challenges/join', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const { code } = joinSchema.parse(req.body)

    const challenge = await prisma.challenge.findUnique({ where: { code } })
    if (!challenge) return reply.code(404).send({ error: 'Código inválido o expirado.' })
    if (challenge.creatorId === userId) return reply.code(400).send({ error: 'No puedes unirte a tu propio reto.' })
    if (challenge.opponentId) return reply.code(409).send({ error: 'Este reto ya tiene un oponente.' })
    if (challenge.status !== 'pending') return reply.code(409).send({ error: 'Este reto ya no está disponible.' })

    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() + 30)

    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        opponentId: userId,
        status: 'active',
        startDate: now,
        endDate: end,
      },
      include: {
        creator:  { select: { id: true, name: true, avatar: true } },
        opponent: { select: { id: true, name: true, avatar: true } },
      },
    })
    return reply.code(200).send(updated)
  })

  // ── GET /challenges/:id — detail + versus stats ───────────────────────
  fastify.get<{ Params: { id: string } }>('/challenges/:id', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: {
        creator:  { select: { id: true, name: true, avatar: true } },
        opponent: { select: { id: true, name: true, avatar: true } },
        checkIns: {
          select: { id: true, userId: true, serverTime: true, photoUrl: true, hash: true },
          orderBy: { serverTime: 'desc' },
        },
      },
    })
    if (!challenge) return reply.code(404).send({ error: 'Reto no encontrado.' })
    if (challenge.creatorId !== userId && challenge.opponentId !== userId)
      return reply.code(403).send({ error: 'No tienes acceso a este reto.' })

    // Compute check-in stats per user
    const days = (dt: Date) => dateStr(dt)
    const creatorDays  = new Set(challenge.checkIns.filter(c => c.userId === challenge.creatorId).map(c => days(c.serverTime)))
    const opponentDays = challenge.opponentId
      ? new Set(challenge.checkIns.filter(c => c.userId === challenge.opponentId).map(c => days(c.serverTime)))
      : new Set<string>()

    return {
      ...challenge,
      stats: {
        creator:  { checkInDays: creatorDays.size,  dates: [...creatorDays] },
        opponent: { checkInDays: opponentDays.size, dates: [...opponentDays] },
      },
    }
  })

  // ── POST /challenges/:id/checkin — register gym visit ────────────────
  fastify.post<{ Params: { id: string } }>('/challenges/:id/checkin', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const { photoBase64, lat, lng } = checkinSchema.parse(req.body)

    const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } })
    if (!challenge) return reply.code(404).send({ error: 'Reto no encontrado.' })
    if (challenge.status !== 'active') return reply.code(400).send({ error: 'El reto no está activo.' })
    if (challenge.creatorId !== userId && challenge.opponentId !== userId)
      return reply.code(403).send({ error: 'No participas en este reto.' })

    // Save photo before the atomic check so we have the filename ready
    const b64 = photoBase64.replace(/^data:image\/\w+;base64,/, '')
    const fileName = `${userId}-${Date.now()}.jpg`
    const filePath = join(uploadDir, fileName)
    const buf = Buffer.from(b64, 'base64')
    const { writeFile, unlink } = await import('fs/promises')
    await writeFile(filePath, buf)

    const serverTime = new Date()
    const todayStr = dateStr(serverTime)
    const hashInput = `${userId}:${challenge.id}:${serverTime.toISOString()}:${process.env.JWT_SECRET ?? 'secret'}`
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 12)

    // Atomic check + create — prevents duplicate check-ins even under concurrent requests
    const checkIn = await prisma.$transaction(async (tx) => {
      const existing = await tx.checkIn.findFirst({
        where: {
          challengeId: challenge.id,
          userId,
          serverTime: {
            gte: new Date(todayStr + 'T00:00:00Z'),
            lte: new Date(todayStr + 'T23:59:59Z'),
          },
        },
      })
      if (existing) return null

      return tx.checkIn.create({
        data: {
          challengeId: challenge.id,
          userId,
          photoUrl: `/uploads/checkins/${fileName}`,
          lat: lat ?? null,
          lng: lng ?? null,
          serverTime,
          hash,
        },
      })
    })

    if (!checkIn) {
      await unlink(filePath).catch(() => {})
      return reply.code(409).send({ error: 'Ya registraste tu asistencia hoy.' })
    }

    return reply.code(201).send({ checkIn, hash })
  })

  // ── GET /challenges/:id/versus — workout comparison data ─────────────
  fastify.get<{ Params: { id: string } }>('/challenges/:id/versus', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } })
    if (!challenge) return reply.code(404).send({ error: 'Reto no encontrado.' })
    if (challenge.creatorId !== userId && challenge.opponentId !== userId)
      return reply.code(403).send({ error: 'No tienes acceso a este reto.' })

    // Fetch sessions for both users during challenge period
    const dateFilter = challenge.startDate
      ? { gte: challenge.startDate, lte: challenge.endDate ?? new Date() }
      : undefined

    const [creatorSessions, opponentSessions] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { userId: challenge.creatorId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      }),
      challenge.opponentId
        ? prisma.workoutSession.findMany({
            where: { userId: challenge.opponentId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
          })
        : Promise.resolve([]),
    ])

    // Build per-exercise best marks (max weight × reps = 1RM approx via Epley)
    type ExerciseMark = { name: string; weight: number; reps: number; oneRM: number }
    function extractBests(sessions: typeof creatorSessions): Record<string, ExerciseMark> {
      const bests: Record<string, ExerciseMark> = {}
      for (const session of sessions) {
        let exercises: Array<{ name?: string; sets?: Array<{ weight?: number; reps?: number }> }> = []
        if (typeof session.exercises === 'string') {
          try { exercises = JSON.parse(session.exercises) } catch {}
        } else if (Array.isArray(session.exercises)) {
          exercises = session.exercises as any
        }
        if (!Array.isArray(exercises)) continue
        for (const ex of exercises) {
          if (!ex?.name || !Array.isArray(ex.sets)) continue
          for (const set of ex.sets) {
            const w = set?.weight ?? 0
            const r = set?.reps ?? 0
            if (w <= 0 || r <= 0) continue
            const oneRM = Math.round(w * (1 + r / 30))
            const key = ex.name.toLowerCase()
            if (!bests[key] || oneRM > bests[key].oneRM) {
              bests[key] = { name: ex.name, weight: w, reps: r, oneRM }
            }
          }
        }
      }
      return bests
    }

    const creatorBests  = extractBests(creatorSessions)
    const opponentBests = extractBests(opponentSessions)

    // Intersect on common exercises
    const commonKeys = [...new Set([...Object.keys(creatorBests), ...Object.keys(opponentBests)])]
    const versus = commonKeys.map(key => ({
      exercise: creatorBests[key]?.name ?? opponentBests[key]?.name ?? key,
      creator:  creatorBests[key]  ?? null,
      opponent: opponentBests[key] ?? null,
    }))

    return {
      challengeId: challenge.id,
      period: { start: challenge.startDate, end: challenge.endDate },
      creatorSessions:  creatorSessions.length,
      opponentSessions: opponentSessions.length,
      versus,
    }
  })
}

export default challengesRoutes
