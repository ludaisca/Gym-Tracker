import type { PrismaClient, GlobalNote } from '@prisma/client'
import type { NoteRepository } from '../NoteRepository'

export class PrismaNoteRepository implements NoteRepository {
  constructor(private prisma: PrismaClient) {}

  findAll(userId: string): Promise<GlobalNote[]> {
    return this.prisma.globalNote.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      take: 500,
    })
  }

  findById(userId: string, id: string): Promise<GlobalNote | null> {
    return this.prisma.globalNote.findFirst({ where: { id, userId } })
  }

  count(userId: string): Promise<number> {
    return this.prisma.globalNote.count({ where: { userId } })
  }

  create(userId: string, text: string, position: number): Promise<GlobalNote> {
    return this.prisma.globalNote.create({ data: { userId, text, position } })
  }

  update(id: string, data: { text?: string; done?: boolean; position?: number }): Promise<GlobalNote> {
    return this.prisma.globalNote.update({ where: { id }, data })
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.prisma.globalNote.deleteMany({ where: { id, userId } })
  }

  async reorder(userId: string, ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, position) =>
        this.prisma.globalNote.updateMany({ where: { id, userId }, data: { position } })
      )
    )
  }
}
