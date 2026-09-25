import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { docplannerAccessToken } from '@/lib/calendar/docplanner'

export async function POST() {
  const source = await prisma.calendarSource.findUnique({ where: { id: 'doctoralia' } })
  if (!source) return NextResponse.json({ error: 'RUN_BOOTSTRAP_FIRST' }, { status: 409 })

  try {
    await docplannerAccessToken(source)
    const updated = await prisma.calendarSource.update({
      where: { id: source.id },
      data: { readAuthority: true, writeAuthority: true, enabled: true, webhookEnabled: true }
    })
    return NextResponse.json({
      connected: true,
      sourceId: updated.id,
      domain: (updated.config as any)?.domain || process.env.DOCPLANNER_DOMAIN || 'doctoralia.mx'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Docplanner connection failed'
    return NextResponse.json({ connected: false, error: message }, { status: 409 })
  }
}
