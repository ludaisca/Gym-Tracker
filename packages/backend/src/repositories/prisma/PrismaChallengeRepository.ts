import type { PrismaClient, Challenge, CheckIn } from '@prisma/client'
import type {
  ChallengeRepository,
  ChallengeWithRelations,
  ChallengeDetail,
} from '../ChallengeRepository'

const creatorOpponentSelect = {
  id: true as const,
  name: true as const,
  avatar: true as const,
}

export class PrismaChallengeRepository implements ChallengeRepository {
  constructor(private prisma: PrismaClient) {}

  async finishExpired(): Promise<void> {
    await this.prisma.challenge.updateMany({
      where: { status: 'active', endDate: { lt: new Date() } },
      data: { status: 'finished' },
    })
  }

  findAllForUser(userId: string): Promise<ChallengeWithRelations[]> {
    return this.prisma.challenge.findMany({
      where: { OR: [{ creatorId: userId }, { opponentId: userId }] },
      include: {
        creator:  { select: creatorOpponentSelect },
        opponent: { select: creatorOpponentSelect },
        checkIns: { select: { userId: true, serverTime: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<ChallengeWithRelations[]>
  }

  findById(id: string): Promise<ChallengeDetail | null> {
    return this.prisma.challenge.findUnique({
      where: { id },
      include: {
        creator:  { select: creatorOpponentSelect },
        opponent: { select: creatorOpponentSelect },
        checkIns: {
          select: { id: true, userId: true, serverTime: true, photoUrl: true, hash: true },
          orderBy: { serverTime: 'desc' },
        },
      },
    }) as unknown as Promise<ChallengeDetail | null>
  }

  findByIdSimple(id: string): Promise<Challenge | null> {
    return this.prisma.challenge.findUnique({ where: { id } })
  }

  findByCode(code: string): Promise<Challenge | null> {
    return this.prisma.challenge.findUnique({ where: { code } })
  }

  create(data: {
    code: string
    creatorId: string
    type: string
    durationDays: number
    status: string
  }): Promise<Challenge> {
    return this.prisma.challenge.create({ data })
  }

  join(id: string, opponentId: string, startDate: Date, endDate: Date): Promise<ChallengeWithRelations> {
    return this.prisma.challenge.update({
      where: { id },
      data: { opponentId, status: 'active', startDate, endDate },
      include: {
        creator:  { select: creatorOpponentSelect },
        opponent: { select: creatorOpponentSelect },
      },
    }) as unknown as Promise<ChallengeWithRelations>
  }

  async delete(id: string): Promise<void> {
    await this.prisma.challenge.delete({ where: { id } })
  }

  findTodayCheckIn(challengeId: string, userId: string, todayStr: string): Promise<CheckIn | null> {
    return this.prisma.checkIn.findFirst({
      where: {
        challengeId,
        userId,
        serverTime: {
          gte: new Date(todayStr + 'T00:00:00Z'),
          lte: new Date(todayStr + 'T23:59:59Z'),
        },
      },
    })
  }

  createCheckIn(data: {
    challengeId: string
    userId: string
    photoUrl: string
    lat?: number | null
    lng?: number | null
    serverTime: Date
    hash: string
  }): Promise<CheckIn> {
    return this.prisma.checkIn.create({ data })
  }
}
