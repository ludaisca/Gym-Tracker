import type { PrismaClient, PushSubscription } from '@prisma/client'
import type { PushRepository } from '../PushRepository'

export class PrismaPushRepository implements PushRepository {
  constructor(private prisma: PrismaClient) {}

  findByUser(userId: string): Promise<PushSubscription[]> {
    return this.prisma.pushSubscription.findMany({ where: { userId } })
  }

  upsert(userId: string, endpoint: string, p256dh: string, auth: string): Promise<PushSubscription> {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth },
      create: { userId, endpoint, p256dh, auth },
    })
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } })
  }
}
