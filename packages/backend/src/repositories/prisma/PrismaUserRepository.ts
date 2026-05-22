import type { PrismaClient, User, UserSettings, RefreshToken, BodyWeight } from '@prisma/client'
import type { UserRepository, UserWithSettings } from '../UserRepository'

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  findByIdWithSettings(id: string): Promise<UserWithSettings | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { settings: true },
    })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  findByVerificationToken(token: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { verificationToken: token } })
  }

  findByResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { resetToken: token } })
  }

  create(data: {
    email: string
    passwordHash: string
    name: string
    avatar: string
    verificationToken: string
    verificationExpiry: Date
  }): Promise<User> {
    return this.prisma.user.create({ data })
  }

  update(id: string, data: Partial<Omit<User, 'id'>>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data })
  }

  updateWithSettings(id: string, data: Partial<Omit<User, 'id'>>): Promise<UserWithSettings> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { settings: true },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }

  async verifyEmail(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true, verificationToken: null, verificationExpiry: null },
    })
  }

  async setResetToken(id: string, token: string, expiry: Date): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { resetToken: token, resetExpiry: expiry } })
  }

  async clearResetToken(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, resetToken: null, resetExpiry: null },
    })
  }

  async setVerificationToken(id: string, token: string, expiry: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { verificationToken: token, verificationExpiry: expiry },
    })
  }

  upsertSettings(
    userId: string,
    data: Partial<Omit<UserSettings, 'id' | 'userId'>>
  ): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
  }

  createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data: { userId, token, expiresAt } })
  }

  findRefreshToken(token: string): Promise<(RefreshToken & { user: User }) | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    })
  }

  async deleteRefreshToken(id: string): Promise<void> {
    await this.prisma.refreshToken.delete({ where: { id } })
  }

  async deleteRefreshTokenByToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { token } })
  }

  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } })
  }

  findBodyWeights(userId: string): Promise<BodyWeight[]> {
    return this.prisma.bodyWeight.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      take: 365,
    })
  }

  upsertBodyWeight(userId: string, date: string, weight_kg: number, notes?: string): Promise<BodyWeight> {
    return this.prisma.bodyWeight.upsert({
      where: { userId_date: { userId, date } },
      update: { weight_kg, notes: notes ?? null },
      create: { userId, date, weight_kg, notes: notes ?? null },
    })
  }

  async deleteBodyWeight(userId: string, date: string): Promise<boolean> {
    const entry = await this.prisma.bodyWeight.findUnique({ where: { userId_date: { userId, date } } })
    if (!entry) return false
    await this.prisma.bodyWeight.delete({ where: { userId_date: { userId, date } } })
    return true
  }

  findForExport(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        settings: true,
        sessions: true,
        nutritionDays: true,
        notes: true,
        savedFoods: true,
        customRoutines: true,
        bodyWeights: { orderBy: { date: 'asc' } },
      },
    })
  }
}
