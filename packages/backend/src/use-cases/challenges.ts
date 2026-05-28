import crypto from 'crypto'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import type { Challenge, CheckIn } from '@prisma/client'
import type { ChallengeRepository, ChallengeWithRelations, ChallengeDetail } from '../repositories/ChallengeRepository'
import type { SessionRepository } from '../repositories/SessionRepository'
import { extractBestOneRMs } from '../types/domain'
import { ucErr, UCError } from './errors'

function randomCode(len = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.randomBytes(len)).map(b => chars[b % chars.length]).join('')
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getUploadDir(): string {
  const dir = join(process.cwd(), 'uploads', 'checkins')
  try { mkdirSync(dir, { recursive: true }) } catch {}
  return dir
}

type ChallengeWithStats = ChallengeWithRelations & {
  stats: {
    creator: { checkInDays: number; dates: string[] }
    opponent: { checkInDays: number; dates: string[] }
  }
}

function addStats(ch: ChallengeWithRelations): ChallengeWithStats {
  const days = (dt: Date) => dateStr(dt)
  const creatorDays = new Set(
    ch.checkIns.filter(c => c.userId === ch.creatorId).map(c => days(c.serverTime))
  )
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
}

export async function listChallenges(
  challenges: ChallengeRepository,
  userId: string
): Promise<ChallengeWithStats[]> {
  await challenges.finishExpired()
  const list = await challenges.findAllForUser(userId)
  return list.map(addStats)
}

export async function createChallenge(
  challenges: ChallengeRepository,
  userId: string,
  data: { type: string; durationDays: number }
): Promise<{ challenge: Challenge; code: string }> {
  const code = randomCode()
  const challenge = await challenges.create({
    code,
    creatorId: userId,
    type: data.type,
    durationDays: data.durationDays,
    status: 'pending',
  })
  return { challenge, code }
}

export async function joinChallenge(
  challenges: ChallengeRepository,
  userId: string,
  code: string
): Promise<ChallengeWithRelations | UCError> {
  const challenge = await challenges.findByCode(code)
  if (!challenge) return ucErr('Código inválido o expirado.', 404)
  if (challenge.creatorId === userId) return ucErr('No puedes unirte a tu propio reto.', 400)
  if (challenge.opponentId) return ucErr('Este reto ya tiene un oponente.', 409)
  if (challenge.status !== 'pending') return ucErr('Este reto ya no está disponible.', 409)

  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + (challenge.durationDays ?? 30))

  return challenges.join(challenge.id, userId, now, end)
}

export async function getChallengeDetail(
  challenges: ChallengeRepository,
  userId: string,
  id: string
): Promise<(ChallengeDetail & { stats: { creator: { checkInDays: number; dates: string[] }; opponent: { checkInDays: number; dates: string[] } } }) | UCError> {
  const challenge = await challenges.findById(id)
  if (!challenge) return ucErr('Reto no encontrado.', 404)
  if (challenge.creatorId !== userId && challenge.opponentId !== userId) {
    return ucErr('No tienes acceso a este reto.', 403)
  }

  const days = (dt: Date) => dateStr(dt)
  const creatorDays = new Set(
    challenge.checkIns.filter(c => c.userId === challenge.creatorId).map(c => days(c.serverTime))
  )
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
}

export async function deleteChallenge(
  challenges: ChallengeRepository,
  userId: string,
  id: string
): Promise<void | UCError> {
  const challenge = await challenges.findByIdSimple(id)
  if (!challenge) return ucErr('Reto no encontrado o ya finalizado.', 404)
  if (
    challenge.creatorId !== userId ||
    !['pending', 'active'].includes(challenge.status)
  ) {
    return ucErr('Reto no encontrado o ya finalizado.', 404)
  }
  await challenges.delete(id)
}

export async function registerCheckIn(
  challenges: ChallengeRepository,
  userId: string,
  challengeId: string,
  data: { photoBase64: string; lat?: number; lng?: number }
): Promise<{ checkIn: CheckIn; hash: string } | UCError> {
  const challenge = await challenges.findByIdSimple(challengeId)
  if (!challenge) return ucErr('Reto no encontrado.', 404)
  if (challenge.status !== 'active') return ucErr('El reto no está activo.', 400)
  if (challenge.creatorId !== userId && challenge.opponentId !== userId) {
    return ucErr('No participas en este reto.', 403)
  }

  // Validate image
  const b64 = data.photoBase64.replace(/^data:image\/\w+;base64,/, '')
  const buf = Buffer.from(b64, 'base64')
  if (buf.length > 2 * 1024 * 1024) return ucErr('La imagen no puede superar 2 MB.', 400)
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
  const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E
  if (!isJpeg && !isPng) return ucErr('Solo se aceptan imágenes JPEG o PNG.', 400)

  // One check-in per day
  const todayStr = dateStr(new Date())
  const existing = await challenges.findTodayCheckIn(challengeId, userId, todayStr)
  if (existing) return ucErr('Ya registraste tu asistencia hoy.', 409)

  const uploadDir = getUploadDir()
  const fileName = `${userId}-${Date.now()}.jpg`
  await writeFile(join(uploadDir, fileName), buf)

  const serverTime = new Date()
  const hashInput = `${userId}:${challengeId}:${serverTime.toISOString()}:${process.env.JWT_SECRET!}`
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 12)

  const checkIn = await challenges.createCheckIn({
    challengeId,
    userId,
    photoUrl: `/uploads/checkins/${fileName}`,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    serverTime,
    hash,
  })

  return { checkIn, hash }
}

export async function getVersusData(
  repos: { challenges: ChallengeRepository; sessions: SessionRepository },
  userId: string,
  challengeId: string
): Promise<{
  challengeId: string
  period: { start: Date | null; end: Date | null }
  creatorSessions: number
  opponentSessions: number
  versus: Array<{
    exercise: string
    creator: ReturnType<typeof extractBestOneRMs>[string] | null
    opponent: ReturnType<typeof extractBestOneRMs>[string] | null
  }>
} | UCError> {
  const challenge = await repos.challenges.findByIdSimple(challengeId)
  if (!challenge) return ucErr('Reto no encontrado.', 404)
  if (challenge.creatorId !== userId && challenge.opponentId !== userId) {
    return ucErr('No tienes acceso a este reto.', 403)
  }

  const from = challenge.startDate ?? undefined
  const to   = challenge.endDate   ?? undefined

  const userIds = [challenge.creatorId, ...(challenge.opponentId ? [challenge.opponentId] : [])]
  const allSessions = await (from && to
    ? repos.sessions.findByUserIds(userIds, from, to)
    : repos.sessions.findByUserIds(userIds))

  const creatorSessions  = allSessions.filter(s => s.userId === challenge.creatorId)
  const opponentSessions = challenge.opponentId
    ? allSessions.filter(s => s.userId === challenge.opponentId)
    : []

  const creatorBests  = extractBestOneRMs(creatorSessions)
  const opponentBests = extractBestOneRMs(opponentSessions)

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
}
