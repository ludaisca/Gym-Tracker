import type { Routine } from '@prisma/client'
import type { RoutineRepository } from '../repositories/RoutineRepository'
import { ucErr, UCError } from './errors'

export async function listMarketplace(
  routines: RoutineRepository,
  search?: string,
  limit = 20,
  offset = 0
): Promise<Array<Routine & { user: { name: string } }>> {
  const take = Math.min(limit, 50)
  return routines.findPublic(search, take, offset)
}

export async function cloneRoutine(
  routines: RoutineRepository,
  userId: string,
  id: string
): Promise<Routine | UCError> {
  try {
    return await routines.clonePublic(id, userId)
  } catch {
    return ucErr('Rutina no encontrada o no pública.', 404)
  }
}

export { UCError }
