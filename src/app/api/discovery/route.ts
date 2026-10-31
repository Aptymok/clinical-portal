import { NextResponse } from 'next/server'
import { requireStaffApi } from '@/lib/staff-access'
import { prisma } from '@/lib/prisma'
import { ObservationSchema, compareIdentity } from '@/lib/discovery/review'
import { jsonErrorResponse, HttpError } from '@/lib/errors'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    await requireStaffApi()
    // Browser submissions must originate in this application. No external fetch is performed.
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) throw new HttpError('Origen no permitido.',403,'FORBIDDEN')
    const input = ObservationSchema.parse(await request.json())
    const comparison = compareIdentity(input.field, input.observedValue)
    const event = await prisma.domainEvent.create({ data: {
      type: 'DISCOVERY_OBSERVATION_V1',
      payload: { ...input, expectedAtObservation: comparison.expected, statusAtObservation: comparison.status, method: 'STAFF_RECORDED', externalAction: 'NONE', observedAt: new Date().toISOString() }
    } })
    return NextResponse.json({ id: event.id, status: comparison.status }, { status: 201, headers: {'Cache-Control':'no-store'} })
  } catch (error) { return jsonErrorResponse(error) }
}
