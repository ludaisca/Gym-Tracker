import type { Routine } from '@prisma/client'

export interface RoutineRepository {
  findAll(userId: string): Promise<Routine[]>
  findById(id: string): Promise<Routine | null>
  findByShareCode(code: string): Promise<Routine | null>
  findFirst(where: { id: string; userId: string }): Promise<Routine | null>
  findPublic(search?: string, take?: number, skip?: number): Promise<Array<Routine & { user: { name: string } }>>
  countByUser(userId: string): Promise<number>

  create(data: {
    userId: string
    name: string
    description?: string | null
    days: object
  }): Promise<Routine>

  update(id: string, data: Partial<Omit<Routine, 'id' | 'userId'>>): Promise<Routine>
  delete(id: string): Promise<void>

  setShareCode(id: string, shareCode: string | null): Promise<Routine>
  setPublic(id: string, isPublic: boolean): Promise<Routine>
  incrementDownloadCount(id: string): Promise<Routine>

  /** Clonar rutina pública: crea clon e incrementa downloadCount en una transacción */
  clonePublic(originalId: string, userId: string): Promise<Routine>
}
