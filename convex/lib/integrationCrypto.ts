const ENCODER = new TextEncoder()
const DECODER = new TextDecoder()

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '==='.slice((normalized.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function readCipherKeyBytes() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY is not configured')
  }

  const parsed = (() => {
    try {
      return base64UrlToBytes(raw)
    } catch {
      return ENCODER.encode(raw)
    }
  })()

  if (parsed.length !== 32) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY must decode to exactly 32 bytes')
  }
  return parsed
}

async function importKey() {
  return await crypto.subtle.importKey('raw', readCipherKeyBytes(), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptSecret(plainText: string) {
  const key = await importKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    ENCODER.encode(plainText),
  )
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`
}

export async function decryptSecret(cipherText: string) {
  const [ivEncoded, dataEncoded] = cipherText.split('.')
  if (!ivEncoded || !dataEncoded) {
    throw new Error('Invalid encrypted secret payload')
  }

  const key = await importKey()
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(ivEncoded),
    },
    key,
    base64UrlToBytes(dataEncoded),
  )
  return DECODER.decode(decrypted)
}
