import { afterEach, describe, expect, it } from 'vitest'
import { decrypt, encrypt } from './encryption'

const originalKey = process.env.ENCRYPTION_KEY

afterEach(() => {
  process.env.ENCRYPTION_KEY = originalKey
})

describe('calendar secret encryption', () => {
  it('round-trips with AES-256-GCM and does not store plaintext', () => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const plaintext = 'refresh-token-sensitive-value'
    const encrypted = encrypt(plaintext)

    expect(encrypted).not.toContain(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })
})
