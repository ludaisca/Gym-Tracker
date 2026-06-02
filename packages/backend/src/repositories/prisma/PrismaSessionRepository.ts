import type { PrismaClient, WorkoutSession } from '@prisma/client'
import type { Redis } from 'ioredis'
import type { SessionRepository } from '../SessionRepository'

export class PrismaSessionRepository implements SessionRepository {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis | null
  ) {}

  private cacheKey(userId: string) {
    return `sessions:all:${userId}`
  }

  private async invalidateCache(userId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(this.cacheKey(userId))
    }
  }

  async findAll(userId: string): Promise<WorkoutSession[]> {
    const key = this.cacheKey(userId)
    if (this.redis) {
      const cached = await this.redis.get(key)
      if (cached) return JSON.parse(cached) as WorkoutSession[]
    }

    const sessions = await this.prisma.workoutSession.findMany({
      where: { userId },
      orderBy: [{ weekNumber: 'asc' }, { dayId: 'asc' }],
      take: 2000,
    })

    if (this.redis) {
      await this.redis.set(key, JSON.stringify(sessions), 'EX', 60 * 60 * 24)
    }
    return sessions
  }

  findByWeek(userId: string, week: number): Promise<WorkoutSession[]> {
    return this.prisma.workoutSession.findMany({
      where: { userId, weekNumber: week },
      orderBy: [{ weekNumber: 'asc' }, { dayId: 'asc' }],
    })
  }

  findByDateRange(userId: string, from: Date, to: Date): Promise<WorkoutSession[]> {
    return this.prisma.workoutSession.findMany({
      where: { userId, createdAt: { gte: from, lte: to } },
    })
  }

  findByUserIds(userIds: string[], from?: Date, to?: Date): Promise<WorkoutSession[]> {
    const dateFilter = from && to ? { createdAt: { gte: from, lte: to } } : {}
    return this.prisma.workoutSession.findMany({
      where: { userId: { in: userIds }, ...dateFilter },
    })
  }

  async upsert(
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
    const result = await this.prisma.workoutSession.upsert({
      where: { userId_weekNumber_dayId: { userId, weekNumber, dayId } },
      update: data as object,
      create: { userId, weekNumber, dayId, ...(data as object) },
    })
    await this.invalidateCache(userId)
    return result
  }

  async deleteOne(userId: string, weekNumber: number, dayId: string): Promise<void> {
    await this.prisma.workoutSession.deleteMany({ where: { userId, weekNumber, dayId } })
    await this.invalidateCache(userId)
  }

  async deleteWeek(userId: string, weekNumber: number): Promise<void> {
    await this.prisma.workoutSession.deleteMany({ where: { userId, weekNumber } })
    await this.invalidateCache(userId)
  }
}
