import type { Challenge, CheckIn } from '@prisma/client'

export type ChallengeWithRelations = Challenge & {
  creator: { id: string; name: string; avatar: string }
  opponent: { id: string; name: string; avatar: string } | null
  checkIns: Array<{ userId: string; serverTime: Date; photoUrl: string }>
}

export type ChallengeDetail = Challenge & {
  creator: { id: string; name: string; avatar: string }
  opponent: { id: string; name: string; avatar: string } | null
  checkIns: Array<{ id: string; userId: string; serverTime: Date; photoUrl: string; hash: string }>
}

export interface ChallengeRepository {
  findAllForUser(userId: string): Promise<ChallengeWithRelations[]>
  findById(id: string): Promise<ChallengeDetail | null>
  findByIdSimple(id: string): Promise<Challenge | null>
  findByCode(code: string): Promise<Challenge | null>

  /** Mark expired active challenges as finished */
  finishExpired(): Promise<void>

  create(data: {
    code: string
    creatorId: string
    type: string
    durationDays: number
    status: string
  }): Promise<Challenge>

  join(id: string, opponentId: string, startDate: Date, endDate: Date): Promise<ChallengeWithRelations>
  delete(id: string): Promise<void>

  // Check-ins
  findTodayCheckIn(challengeId: string, userId: string, todayStr: string): Promise<CheckIn | null>
  createCheckIn(data: {
    challengeId: string
    userId: string
    photoUrl: string
    lat?: number | null
    lng?: number | null
    serverTime: Date
    hash: string
  }): Promise<CheckIn>
}
