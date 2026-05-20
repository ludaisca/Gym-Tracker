import type { User, UserSettings, RefreshToken, BodyWeight } from '@prisma/client'

export type PlanInfo = Pick<User, 'plan' | 'planExpiresAt' | 'trialEndsAt'>

export interface UserWithSettings extends User {
  settings: UserSettings | null
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByIdWithSettings(id: string): Promise<UserWithSettings | null>
  findByEmail(email: string): Promise<User | null>
  findByVerificationToken(token: string): Promise<User | null>
  findByResetToken(token: string): Promise<User | null>
  findByStripeCustomerId(customerId: string): Promise<User | null>
  findPlanInfo(id: string): Promise<PlanInfo | null>

  create(data: {
    email: string
    passwordHash: string
    name: string
    avatar: string
    verificationToken: string
    verificationExpiry: Date
  }): Promise<User>

  update(id: string, data: Partial<Omit<User, 'id'>>): Promise<User>
  updateWithSettings(id: string, data: Partial<Omit<User, 'id'>>): Promise<UserWithSettings>
  delete(id: string): Promise<void>

  verifyEmail(id: string): Promise<void>
  setResetToken(id: string, token: string, expiry: Date): Promise<void>
  clearResetToken(id: string, passwordHash: string): Promise<void>
  setVerificationToken(id: string, token: string, expiry: Date): Promise<void>

  // Settings
  upsertSettings(userId: string, data: Partial<Omit<UserSettings, 'id' | 'userId'>>): Promise<UserSettings>

  // Refresh tokens
  createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken>
  findRefreshToken(token: string): Promise<(RefreshToken & { user: User }) | null>
  deleteRefreshToken(id: string): Promise<void>
  deleteRefreshTokenByToken(token: string): Promise<void>
  deleteAllRefreshTokens(userId: string): Promise<void>

  // Body weight
  findBodyWeights(userId: string): Promise<BodyWeight[]>
  upsertBodyWeight(userId: string, date: string, weight_kg: number, notes?: string): Promise<BodyWeight>
  deleteBodyWeight(userId: string, date: string): Promise<boolean>

  // Export data
  findForExport(userId: string): Promise<UserWithSettings & {
    sessions: unknown[]
    nutritionDays: unknown[]
    notes: unknown[]
    savedFoods: unknown[]
    customRoutines: unknown[]
    bodyWeights: unknown[]
  }>
}
