import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import type { UserRepository } from '../repositories/UserRepository'
import { ucErr, UCError } from './errors'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email'

export async function registerUser(
  users: UserRepository,
  data: { email: string; password: string; name: string; avatar?: string },
  log?: { error: (obj: object, msg: string) => void }
): Promise<{ message: string } | UCError> {
  const existing = await users.findByEmail(data.email)
  if (existing) return ucErr('Email ya registrado', 409)

  const passwordHash = await bcrypt.hash(data.password, 12)
  const verificationToken = randomBytes(32).toString('hex')
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const avatar = data.avatar ?? '💪'

  const user = await users.create({
    email: data.email,
    passwordHash,
    name: data.name,
    avatar,
    verificationToken,
    verificationExpiry,
  })
  await users.upsertSettings(user.id, {})

  try {
    await sendVerificationEmail(user.email, user.name, verificationToken)
  } catch (err) {
    log?.error({ err }, 'Error al enviar correo de verificación')
  }

  return { message: 'Cuenta creada. Revisa tu correo para verificar tu cuenta.' }
}

export async function verifyEmail(
  users: UserRepository,
  token: string
): Promise<{ message: string } | UCError> {
  const user = await users.findByVerificationToken(token)
  if (!user || !user.verificationExpiry || user.verificationExpiry < new Date()) {
    return ucErr('El enlace es inválido o ha expirado', 400)
  }
  await users.verifyEmail(user.id)
  return { message: 'Cuenta verificada correctamente' }
}

export async function resendVerification(
  users: UserRepository,
  email: string,
  log?: { error: (obj: object, msg: string) => void }
): Promise<{ message: string }> {
  const GENERIC_MSG = 'Si el correo existe y no está verificado, recibirás un nuevo enlace.'
  const user = await users.findByEmail(email)
  if (!user || user.emailVerified) return { message: GENERIC_MSG }

  const verificationToken = randomBytes(32).toString('hex')
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await users.setVerificationToken(user.id, verificationToken, verificationExpiry)

  try {
    await sendVerificationEmail(user.email, user.name, verificationToken)
  } catch (err) {
    log?.error({ err }, 'Error al reenviar correo de verificación')
  }
  return { message: GENERIC_MSG }
}

export async function loginUser(
  users: UserRepository,
  email: string,
  password: string
): Promise<
  | { user: object; userId: string; userEmail: string }
  | UCError
> {
  const user = await users.findByIdWithSettings(
    (await users.findByEmail(email))?.id ?? ''
  )
  if (!user) return ucErr('Credenciales incorrectas', 401)

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return ucErr('Credenciales incorrectas', 401)

  if (!user.emailVerified) {
    return ucErr('Debes verificar tu correo antes de iniciar sesión', 403, 'EMAIL_NOT_VERIFIED')
  }

  return {
    userId: user.id,
    userEmail: user.email,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      theme: user.theme,
      accentTheme: user.accentTheme,
      currentWeek: user.currentWeek,
      activeRoutineId: user.activeRoutineId,
      settings: user.settings,
    },
  }
}

export async function forgotPassword(
  users: UserRepository,
  email: string,
  log?: { error: (obj: object, msg: string) => void }
): Promise<{ message: string }> {
  const GENERIC_MSG = 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.'
  const user = await users.findByEmail(email)
  if (!user) return { message: GENERIC_MSG }

  const resetToken = randomBytes(32).toString('hex')
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000)
  await users.setResetToken(user.id, resetToken, resetExpiry)

  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken)
  } catch (err) {
    log?.error({ err }, 'Error al enviar correo de reset')
  }
  return { message: GENERIC_MSG }
}

export async function resetPassword(
  users: UserRepository,
  token: string,
  password: string
): Promise<{ message: string } | UCError> {
  const user = await users.findByResetToken(token)
  if (!user || !user.resetExpiry || user.resetExpiry < new Date()) {
    return ucErr('El enlace es inválido o ha expirado', 400)
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await users.clearResetToken(user.id, passwordHash)
  await users.deleteAllRefreshTokens(user.id)
  return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' }
}
