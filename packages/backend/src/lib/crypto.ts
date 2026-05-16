import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const PREFIX = '$enc$v1:'

export function encryptValue(plaintext: string): string {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) return plaintext
  const key = Buffer.from(keyHex, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptValue(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith(PREFIX)) return value  // Texto plano legado
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) return value
  try {
    const [ivHex, tagHex, encHex] = value.slice(PREFIX.length).split(':')
    const key = Buffer.from(keyHex, 'hex')
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8')
  } catch {
    return null
  }
}
