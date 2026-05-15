import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { mkdirSync } from 'fs'
import { join } from 'path'

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
  photoBase64: z.string().min(100),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

// ── Route plugin ─────────────────────────────────────────────────────────
const challengesRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify
  fastify.addHook('onRequest', fastify.authenticate)

  const uploadDir = join(process.cwd(), 'uploads', 'checkins')
  try { mkdirSync(uploadDir, { recursive: true }) } catch {}

  // ── GET /challenges — list my challenges (active + pending + finished) ─
  fastify.get('/challenges', async (req) => {
    const userId = (req.user as { sub: string }).sub

    // Auto-finish expired active challenges
    await prisma.challenge.updateMany({
      where: { status: 'active', endDate: { lt: new Date() } },
      data: { status: 'finished' },
    })

    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [{ creatorId: userId }, { opponentId: userId }],
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
        durationDays: body.durationDays,
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
    end.setDate(end.getDate() + (challenge.durationDays ?? 30))

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

  // ── GET /challenges/:id — detail + check-in stats ────────────────────
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

  // ── DELETE /challenges/:id — cancel/abandon a challenge ──────────────
  fastify.delete<{ Params: { id: string } }>('/challenges/:id', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: req.params.id,
        creatorId: userId,
        status: { in: ['pending', 'active'] },
      },
    })
    if (!challenge) return reply.code(404).send({ error: 'Reto no encontrado o ya finalizado.' })
    await prisma.challenge.delete({ where: { id: req.params.id } })
    return reply.code(204).send()
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

    // Validate magic bytes (JPEG or PNG only)
    const b64 = photoBase64.replace(/^data:image\/\w+;base64,/, '')
    const buf = Buffer.from(b64, 'base64')
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
    const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E
    if (!isJpeg && !isPng) return reply.code(400).send({ error: 'Solo se aceptan imágenes JPEG o PNG.' })

    // One check-in per calendar day per challenge
    const todayStr = dateStr(new Date())
    const existing = await prisma.checkIn.findFirst({
      where: {
        challengeId: challenge.id,
        userId,
        serverTime: {
          gte: new Date(todayStr + 'T00:00:00Z'),
          lte: new Date(todayStr + 'T23:59:59Z'),
        },
      },
    })
    if (existing) return reply.code(409).send({ error: 'Ya registraste tu asistencia hoy.' })

    const fileName = `${userId}-${Date.now()}.jpg`
    const filePath = join(uploadDir, fileName)
    const { writeFile } = await import('fs/promises')
    await writeFile(filePath, buf)

    const serverTime = new Date()
    const hashInput = `${userId}:${challenge.id}:${serverTime.toISOString()}:${process.env.JWT_SECRET ?? 'secret'}`
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 12)

    const checkIn = await prisma.checkIn.create({
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

    return reply.code(201).send({ checkIn, hash })
  })

  // ── GET /challenges/:id/versus — workout comparison data ─────────────
  fastify.get<{ Params: { id: string } }>('/challenges/:id/versus', async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } })
    if (!challenge) return reply.code(404).send({ error: 'Reto no encontrado.' })
    if (challenge.creatorId !== userId && challenge.opponentId !== userId)
      return reply.code(403).send({ error: 'No tienes acceso a este reto.' })

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

    type ExerciseMark = { name: string; weight: number; reps: number; oneRM: number }
    function extractBests(sessions: typeof creatorSessions): Record<string, ExerciseMark> {
      const bests: Record<string, ExerciseMark> = {}
      for (const session of sessions) {
        let exercises: Array<{ name?: string; done?: boolean; sets?: Array<{ kg?: string; weight?: number; reps?: string | number }> }> = []
        if (typeof session.exercises === 'string') {
          try { exercises = JSON.parse(session.exercises) } catch {}
        } else if (Array.isArray(session.exercises)) {
          exercises = session.exercises as any
        }
        if (!Array.isArray(exercises)) continue
        for (const ex of exercises) {
          if (!ex?.name || !Array.isArray(ex.sets)) continue
          for (const set of ex.sets) {
            // Frontend stores { kg: string, reps: string }; support legacy { weight: number, reps: number }
            const w = parseFloat((set.kg as string | undefined) ?? String(set.weight ?? 0))
            const r = parseFloat(String(set.reps ?? 0))
            if (!(w > 0) || !(r > 0)) continue
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
