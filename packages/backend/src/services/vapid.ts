import webpush from 'web-push'
import type { PrismaClient } from '@prisma/client'

export interface VapidKeys {
  publicKey: string
  privateKey: string
  email: string
}

let cached: VapidKeys | null = null

/**
 * Carga las claves VAPID desde variables de entorno o desde la BD.
 * Si no existen en ninguno de los dos sitios, las genera automáticamente
 * y las persiste en SystemConfig para que sobrevivan reinicios.
 */
export async function getVapidKeys(prisma: PrismaClient): Promise<VapidKeys | null> {
  if (cached) return cached

  const email = process.env.VAPID_EMAIL ?? 'admin@gymtracker.local'

  // 1. Preferir variables de entorno explícitas
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cached = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY, email }
    webpush.setVapidDetails(`mailto:${email}`, cached.publicKey, cached.privateKey)
    return cached
  }

  // 2. Intentar cargar desde la BD
  const [pubRow, privRow] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'vapid_public_key' } }),
    prisma.systemConfig.findUnique({ where: { key: 'vapid_private_key' } }),
  ])

  if (pubRow && privRow) {
    cached = { publicKey: pubRow.value, privateKey: privRow.value, email }
    webpush.setVapidDetails(`mailto:${email}`, cached.publicKey, cached.privateKey)
    console.log('🔔 VAPID keys cargadas desde la BD')
    return cached
  }

  // 3. Generar claves nuevas y guardarlas en la BD
  console.log('🔔 Generando nuevas claves VAPID y guardando en la BD…')
  const { publicKey, privateKey } = webpush.generateVAPIDKeys()

  await prisma.$transaction([
    prisma.systemConfig.upsert({ where: { key: 'vapid_public_key' }, update: { value: publicKey }, create: { key: 'vapid_public_key', value: publicKey } }),
    prisma.systemConfig.upsert({ where: { key: 'vapid_private_key' }, update: { value: privateKey }, create: { key: 'vapid_private_key', value: privateKey } }),
  ])

  console.log('✅ Claves VAPID generadas. Copia estas líneas a tus variables de entorno de Coolify si quieres fijarlas:')
  console.log(`   VAPID_PUBLIC_KEY=${publicKey}`)
  console.log(`   VAPID_PRIVATE_KEY=${privateKey}`)

  cached = { publicKey, privateKey, email }
  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey)
  return cached
}
