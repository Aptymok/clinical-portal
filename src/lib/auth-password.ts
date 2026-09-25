import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64
const FORMAT = 'scrypt-v1'

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error('Password must be at least 12 characters')
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return [FORMAT, salt, derived.toString('hex')].join('$')
}

export async function verifyPassword(password: string, storedHash?: string | null): Promise<boolean> {
  if (!storedHash || !password) return false

  const [format, salt, expectedHex] = storedHash.split('$')
  if (format !== FORMAT || !salt || !expectedHex) return false

  const expected = Buffer.from(expectedHex, 'hex')
  if (expected.length !== KEY_LENGTH) return false

  const actual = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return timingSafeEqual(expected, actual)
}
