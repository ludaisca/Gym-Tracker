import crypto from 'crypto'
import type { Routine } from '@prisma/client'
import type { RoutineRepository } from '../repositories/RoutineRepository'
import { ucErr, UCError } from './errors'

function randomShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.randomBytes(8)).map(b => chars[b % chars.length]).join('')
}

export async function listRoutines(
  routines: RoutineRepository,
  userId: string
): Promise<Routine[]> {
  return routines.findAll(userId)
}

export async function createRoutine(
  repos: { routines: RoutineRepository },
  userId: string,
  data: { name: string; description?: string | null; days: Record<string, unknown> }
): Promise<Routine | UCError> {
  return repos.routines.create({ userId, ...data, days: data.days as object })
}

export async function updateRoutine(
  routines: RoutineRepository,
  userId: string,
  id: string,
  data: Partial<{ name: string; description?: string | null; days: Record<string, unknown> }>
): Promise<Routine | UCError> {
  const routine = await routines.findFirst({ id, userId })
  if (!routine) return ucErr('No encontrado', 404)
  return routines.update(id, data as object)
}

export async function deleteRoutine(
  routines: RoutineRepository,
  userId: string,
  id: string
): Promise<void | UCError> {
  const routine = await routines.findFirst({ id, userId })
  if (!routine) return ucErr('No encontrado', 404)
  await routines.delete(id)
}

export async function getPublicRoutine(
  routines: RoutineRepository,
  code: string
): Promise<Routine | UCError> {
  const routine = await routines.findByShareCode(code)
  if (!routine) return ucErr('Rutina compartida no encontrada.', 404)
  return routine
}

export async function generateShareCode(
  routines: RoutineRepository,
  userId: string,
  id: string
): Promise<{ shareCode: string | null } | UCError> {
  const routine = await routines.findFirst({ id, userId })
  if (!routine) return ucErr('Rutina no encontrada.', 404)
  const shareCode = routine.shareCode ?? randomShareCode()
  const updated = await routines.setShareCode(id, shareCode)
  return { shareCode: updated.shareCode }
}

export async function revokeShareCode(
  routines: RoutineRepository,
  userId: string,
  id: string
): Promise<void | UCError> {
  const routine = await routines.findFirst({ id, userId })
  if (!routine) return ucErr('Rutina no encontrada.', 404)
  await routines.setShareCode(id, null)
}

export async function importRoutine(
  routines: RoutineRepository,
  userId: string,
  code: string
): Promise<Routine | UCError> {
  const original = await routines.findByShareCode(code)
  if (!original) return ucErr('Código inválido o rutina no encontrada.', 404)
  return routines.create({
    userId,
    name: original.name,
    description: original.description,
    days: original.days as object,
  })
}

export async function publishRoutine(
  repos: { routines: RoutineRepository },
  userId: string,
  id: string
): Promise<{ isPublic: boolean } | UCError> {
  const routine = await repos.routines.findFirst({ id, userId })
  if (!routine) return ucErr('Rutina no encontrada.', 404)
  const updated = await repos.routines.setPublic(id, true)
  return { isPublic: updated.isPublic }
}

export async function unpublishRoutine(
  routines: RoutineRepository,
  userId: string,
  id: string
): Promise<void | UCError> {
  const routine = await routines.findFirst({ id, userId })
  if (!routine) return ucErr('Rutina no encontrada.', 404)
  await routines.setPublic(id, false)
}
