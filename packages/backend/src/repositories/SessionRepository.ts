import type { WorkoutSession } from '@prisma/client'

export interface SessionRepository {
  findAll(userId: string): Promise<WorkoutSession[]>
  findByWeek(userId: string, week: number): Promise<WorkoutSession[]>
  findByDateRange(userId: string, from: Date, to: Date): Promise<WorkoutSession[]>
  findByUserIds(userIds: string[], from?: Date, to?: Date): Promise<WorkoutSession[]>

  upsert(
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
  ): Promise<WorkoutSession>

  deleteOne(userId: string, weekNumber: number, dayId: string): Promise<void>
  deleteWeek(userId: string, weekNumber: number): Promise<void>
}
