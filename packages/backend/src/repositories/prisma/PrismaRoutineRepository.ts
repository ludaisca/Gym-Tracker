import type { PrismaClient, Routine } from '@prisma/client'
import type { RoutineRepository } from '../RoutineRepository'

export class PrismaRoutineRepository implements RoutineRepository {
  constructor(private prisma: PrismaClient) {}

  findAll(userId: string): Promise<Routine[]> {
    return this.prisma.routine.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      take: 50,
    })
  }

  findById(id: string): Promise<Routine | null> {
    return this.prisma.routine.findUnique({ where: { id } })
  }

  findByShareCode(code: string): Promise<Routine | null> {
    return this.prisma.routine.findUnique({ where: { shareCode: code } })
  }

  findFirst(where: { id: string; userId: string }): Promise<Routine | null> {
    return this.prisma.routine.findFirst({ where })
  }

  findPublic(
    search?: string,
    take = 20,
    skip = 0
  ): Promise<Array<Routine & { user: { name: string } }>> {
    return this.prisma.routine.findMany({
      where: {
        isPublic: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        days: true,
        shareCode: true,
        isPublic: true,
        downloadCount: true,
        user: { select: { name: true } },
      },
      orderBy: { downloadCount: 'desc' },
      take,
      skip,
    }) as unknown as Promise<Array<Routine & { user: { name: string } }>>
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.routine.count({ where: { userId } })
  }

  create(data: {
    userId: string
    name: string
    description?: string | null
    days: object
  }): Promise<Routine> {
    return this.prisma.routine.create({ data })
  }

  update(id: string, data: Partial<Omit<Routine, 'id' | 'userId'>>): Promise<Routine> {
    return this.prisma.routine.update({ where: { id }, data: data as object })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.routine.delete({ where: { id } })
  }

  setShareCode(id: string, shareCode: string | null): Promise<Routine> {
    return this.prisma.routine.update({ where: { id }, data: { shareCode } })
  }

  setPublic(id: string, isPublic: boolean): Promise<Routine> {
    return this.prisma.routine.update({ where: { id }, data: { isPublic } })
  }

  incrementDownloadCount(id: string): Promise<Routine> {
    return this.prisma.routine.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    })
  }

  async clonePublic(originalId: string, userId: string): Promise<Routine> {
    const original = await this.prisma.routine.findFirst({
      where: { id: originalId, isPublic: true },
    })
    if (!original) throw new Error('Routine not found or not public')

    const [cloned] = await this.prisma.$transaction([
      this.prisma.routine.create({
        data: {
          userId,
          name: original.name,
          description: original.description,
          days: original.days as object,
        },
      }),
      this.prisma.routine.update({
        where: { id: original.id },
        data: { downloadCount: { increment: 1 } },
      }),
    ])
    return cloned
  }
}
