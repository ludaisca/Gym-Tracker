import bcrypt from 'bcryptjs'
import type { UserSettings } from '@prisma/client'
import type { UserRepository, UserWithSettings } from '../repositories/UserRepository'
import { encryptValue } from '../lib/crypto'
import { ucErr, UCError } from './errors'

export function sanitizeUser(user: UserWithSettings | (UserWithSettings & Record<string, unknown>)) {
  const { passwordHash, verificationToken, verificationExpiry, resetToken, resetExpiry, ...safe } =
    user as UserWithSettings & {
      passwordHash: string
      verificationToken: unknown
      verificationExpiry: unknown
      resetToken: unknown
      resetExpiry: unknown
    }
  void passwordHash; void verificationToken; void verificationExpiry; void resetToken; void resetExpiry

  if (safe.settings) {
    const { aiKey, ...safeSettings } = safe.settings as { aiKey?: string | null; [k: string]: unknown }
    safe.settings = { ...safeSettings, aiKeySet: !!aiKey } as unknown as UserSettings
  }
  return safe
}

export async function getMe(
  users: UserRepository,
  userId: string
): Promise<ReturnType<typeof sanitizeUser> | UCError> {
  const user = await users.findByIdWithSettings(userId)
  if (!user) return ucErr('Usuario no encontrado.', 404)
  return sanitizeUser(user)
}

export async function activateTrial(
  users: UserRepository,
  userId: string
): Promise<ReturnType<typeof sanitizeUser> | UCError> {
  const user = await users.findPlanInfo(userId)
  if (!user) return ucErr('Usuario no encontrado.', 404)
  if (user.plan === 'pro') return ucErr('Ya tienes plan Pro activo.', 409)
  if (user.trialEndsAt) return ucErr('Ya utilizaste tu período de prueba.', 409)

  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const updated = await users.updateWithSettings(userId, { trialEndsAt })
  return sanitizeUser(updated)
}

export async function grantPro(
  users: UserRepository,
  userId: string,
  months: number
): Promise<{ ok: boolean; user: ReturnType<typeof sanitizeUser> } | UCError> {
  const planExpiresAt = months === 0 ? null : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
  const updated = await users.updateWithSettings(userId, { plan: 'pro', planExpiresAt })
  return { ok: true, user: sanitizeUser(updated) }
}

export async function updateMe(
  users: UserRepository,
  userId: string,
  data: {
    name?: string
    email?: string
    password?: string
    currentPassword?: string
    avatar?: string
    theme?: 'light' | 'dark'
    accentTheme?: 'teal' | 'forest' | 'ocean' | 'ember' | 'violet'
    currentWeek?: number
    activeRoutineId?: string | null
    routineStartDate?: string | null
  }
): Promise<ReturnType<typeof sanitizeUser> | UCError> {
  const { email, password, currentPassword, activeRoutineId, routineStartDate, ...rest } = data
  const updateData: Record<string, unknown> = { ...rest }

  if (email || password) {
    if (!currentPassword) {
      return ucErr('Se requiere la contraseña actual para cambiar email o contraseña.', 400)
    }
    const user = await users.findById(userId)
    if (!user) return ucErr('Usuario no encontrado.', 404)
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return ucErr('La contraseña actual es incorrecta.', 401)
  }

  if (email) {
    const existing = await users.findByEmail(email)
    if (existing && existing.id !== userId) {
      return ucErr('El email ya está en uso por otro usuario.', 409)
    }
    updateData.email = email
  }

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 12)
  }

  if (activeRoutineId !== undefined) {
    updateData.activeRoutineId = activeRoutineId
    if (activeRoutineId !== null) {
      updateData.routineStartDate = new Date()
      updateData.currentWeek = 1
    } else {
      updateData.routineStartDate = null
    }
  }

  if (routineStartDate !== undefined && activeRoutineId === undefined) {
    updateData.routineStartDate = routineStartDate ? new Date(routineStartDate) : null
  }

  const updated = await users.updateWithSettings(userId, updateData as Parameters<typeof users.update>[1])
  return sanitizeUser(updated)
}

export async function updateSettings(
  users: UserRepository,
  userId: string,
  data: Partial<Omit<UserSettings, 'id' | 'userId'>>
): Promise<(Omit<UserSettings, 'aiKey'> & { aiKeySet: boolean }) | UCError> {
  const payload = { ...data }
  if (payload.aiKey) payload.aiKey = encryptValue(payload.aiKey)

  const updated = await users.upsertSettings(userId, payload)
  const { aiKey, ...safeSettings } = updated
  return { ...safeSettings, aiKeySet: !!aiKey }
}

export async function exportUserData(
  users: UserRepository,
  userId: string
): Promise<{ version: number; exportedAt: string; data: object } | UCError> {
  const user = await users.findForExport(userId)
  const { passwordHash, verificationToken, verificationExpiry, resetToken, resetExpiry, ...exportData } =
    user as typeof user & {
      passwordHash: string
      verificationToken: unknown
      verificationExpiry: unknown
      resetToken: unknown
      resetExpiry: unknown
    }
  void passwordHash; void verificationToken; void verificationExpiry; void resetToken; void resetExpiry

  if (exportData.settings) {
    const { aiKey, ...safeSettings } = exportData.settings as Record<string, unknown>
    void aiKey
    exportData.settings = safeSettings as typeof exportData.settings
  }
  return { version: 4, exportedAt: new Date().toISOString(), data: exportData }
}

export async function deleteAccount(
  users: UserRepository,
  userId: string
): Promise<{ deleted: boolean }> {
  await users.delete(userId)
  return { deleted: true }
}
