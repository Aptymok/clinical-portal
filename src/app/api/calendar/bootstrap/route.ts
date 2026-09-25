import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const doctorId = process.env.DOCTORPLANNER_DOCTOR_ID || ''
  const facilityId = process.env.DOCTORPLANNER_FACILITY_ID || ''
  const addressId = process.env.DOCTORPLANNER_ADDRESS_ID || ''
  const domain = process.env.DOCTORPLANNER_DOMAIN || 'doctoralia.mx'
  const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

  const sources = await Promise.all([
    prisma.calendarSource.upsert({
      where: { id: 'doctoralia' },
      create: {
        id: 'doctoralia',
        name: 'Doctoralia / Docplanner',
        providerType: 'DOCPLANNER',
        enabled: true,
        readAuthority: Boolean(doctorId && facilityId && addressId),
        writeAuthority: Boolean(doctorId && facilityId && addressId),
        realtimeBookingCheck: true,
        webhookEnabled: true,
        externalRef: doctorId || null,
        config: { domain, doctorId, facilityId, addressId }
      },
      update: {
        name: 'Doctoralia / Docplanner',
        providerType: 'DOCPLANNER',
        externalRef: doctorId || undefined,
        config: { domain, doctorId, facilityId, addressId }
      }
    }),
    prisma.calendarSource.upsert({
      where: { id: 'google-primary' },
      create: {
        id: 'google-primary',
        name: 'Google Calendar',
        providerType: 'GOOGLE_CALENDAR',
        enabled: true,
        readAuthority: false,
        writeAuthority: false,
        realtimeBookingCheck: false,
        webhookEnabled: true,
        externalRef: googleCalendarId,
        config: { calendarId: googleCalendarId }
      },
      update: {
        name: 'Google Calendar',
        providerType: 'GOOGLE_CALENDAR',
        externalRef: googleCalendarId
      }
    }),
    prisma.calendarSource.upsert({
      where: { id: 'calendar-third' },
      create: {
        id: 'calendar-third',
        name: 'Third Calendar',
        providerType: 'GENERIC_WEBHOOK',
        enabled: true,
        readAuthority: Boolean(process.env.THIRD_CALENDAR_WRITE_URL),
        writeAuthority: Boolean(process.env.THIRD_CALENDAR_WRITE_URL),
        realtimeBookingCheck: true,
        webhookEnabled: true,
        config: { writeUrl: process.env.THIRD_CALENDAR_WRITE_URL || null }
      },
      update: {
        config: { writeUrl: process.env.THIRD_CALENDAR_WRITE_URL || null }
      }
    })
  ])

  return NextResponse.json({
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      providerType: source.providerType,
      readAuthority: source.readAuthority,
      writeAuthority: source.writeAuthority,
      externalRef: source.externalRef
    }))
  })
}
