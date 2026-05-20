import type { PushSubscription } from '@prisma/client'

export interface PushRepository {
  findByUser(userId: string): Promise<PushSubscription[]>
  upsert(userId: string, endpoint: string, p256dh: string, auth: string): Promise<PushSubscription>
  deleteByEndpoint(endpoint: string): Promise<void>
}
