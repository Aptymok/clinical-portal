import { createHmac, timingSafeEqual } from 'node:crypto'

type OAuthState = {
  sourceId: string
  issuedAt: number
}

function secret() {
  const value = process.env.NEXTAUTH_SECRET
  if (!value) throw new Error('NEXTAUTH_SECRET is required')
  return value
}

export function signCalendarOAuthState(state: OAuthState) {
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url')
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyCalendarOAuthState(value: string): OAuthState {
  const [payload, supplied] = value.split('.')
  if (!payload || !supplied) throw new Error('Invalid OAuth state')

  const expected = createHmac('sha256', secret()).update(payload).digest('base64url')
  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid OAuth state signature')

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState
  if (!parsed.sourceId || Date.now() - parsed.issuedAt > 15 * 60 * 1000) {
    throw new Error('Expired OAuth state')
  }
  return parsed
}
