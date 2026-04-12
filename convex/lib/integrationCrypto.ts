import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function readCipherKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY is not configured')
  }

  try {
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === 32) {
      return decoded
    }
  } catch {
    // Fallback to utf8 handling below.
  }

  const utf8 = Buffer.from(raw, 'utf8')
  if (utf8.length !== 32) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY must be 32 bytes (base64 or utf8)',
    )
  }
  return utf8
}

export function encryptSecret(plainText: string) {
  const key = readCipherKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`
}

export function decryptSecret(cipherText: string) {
  const [ivEncoded, dataEncoded, tagEncoded] = cipherText.split('.')
  if (!ivEncoded || !dataEncoded || !tagEncoded) {
    throw new Error('Invalid encrypted secret format')
  }

  const key = readCipherKey()
  const iv = Buffer.from(ivEncoded, 'base64url')
  const data = Buffer.from(dataEncoded, 'base64url')
  const tag = Buffer.from(tagEncoded, 'base64url')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}
