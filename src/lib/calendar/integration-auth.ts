import { timingSafeEqual } from 'node:crypto'

export function hasValidCalendarSyncSecret(request: Request) {
  const expected = process.env.CALENDAR_SYNC_SECRET
  if (!expected) return false

  const authorization = request.headers.get('authorization') || ''
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

  const expectedBuffer = Buffer.from(expected)
  const suppliedBuffer = Buffer.from(supplied)
  if (expectedBuffer.length !== suppliedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, suppliedBuffer)
}
