import type { GlobalNote } from '@prisma/client'

export interface NoteRepository {
  findAll(userId: string): Promise<GlobalNote[]>
  findById(userId: string, id: string): Promise<GlobalNote | null>
  count(userId: string): Promise<number>

  create(userId: string, text: string, position: number): Promise<GlobalNote>
  update(id: string, data: { text?: string; done?: boolean; position?: number }): Promise<GlobalNote>
  delete(userId: string, id: string): Promise<void>
  reorder(userId: string, ids: string[]): Promise<void>
}
