import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 'aes-256-gcm-v1'

function keyFromEnv() {
  const raw = process.env.ENCRYPTION_KEY || ''
  const key = Buffer.from(raw, 'hex')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte key encoded as 64 hex characters')
  }
  return key
}

export function encrypt(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFromEnv(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('hex'), tag.toString('hex'), ciphertext.toString('hex')].join('$')
}

export function decrypt(payload: string) {
  const [version, ivHex, tagHex, ciphertextHex] = payload.split('$')
  if (version !== VERSION || !ivHex || !tagHex || !ciphertextHex) {
    throw new Error('Unsupported encrypted payload format')
  }

  const decipher = createDecipheriv('aes-256-gcm', keyFromEnv(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final()
  ])
  return plaintext.toString('utf8')
}
