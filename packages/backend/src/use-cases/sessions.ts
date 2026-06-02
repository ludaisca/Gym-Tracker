import type { WorkoutSession } from '@prisma/client'
import type { SessionRepository } from '../repositories/SessionRepository'
import { ucErr, UCError } from './errors'

export async function listSessions(
  sessions: SessionRepository,
  userId: string,
  week?: number
): Promise<WorkoutSession[]> {
  if (week !== undefined) {
    return sessions.findByWeek(userId, week)
  }
  return sessions.findAll(userId)
}

export async function upsertSession(
  sessions: SessionRepository,
  userId: string,
  weekNumber: number,
  dayId: string,
  data: {
    complete?: boolean
    notes?: string | null
    cardio?: object | null
    exercises?: object
    routineId?: string | null
  }
): Promise<WorkoutSession> {
  return sessions.upsert(userId, weekNumber, dayId, data)
}

export async function deleteSession(
  sessions: SessionRepository,
  userId: string,
  weekNumber: number,
  dayId: string
): Promise<void> {
  await sessions.deleteOne(userId, weekNumber, dayId)
}

export async function deleteWeekSessions(
  sessions: SessionRepository,
  userId: string,
  weekNumber: number
): Promise<void> {
  await sessions.deleteWeek(userId, weekNumber)
}

export { UCError }
