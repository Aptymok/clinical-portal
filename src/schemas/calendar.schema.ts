import { z } from 'zod'

export const CalendarIntakeSchema = z.object({
  sourceId: z.string().min(1),
  externalEventId: z.string().min(1),
  correlationKey: z.string().min(1).nullable().optional(),
  canonicalEcho: z.boolean().optional(),
  providerRef: z.string().min(1),
  startsAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid startsAt'),
  endsAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid endsAt'),
  timezone: z.string().min(1),
  status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED', 'UNKNOWN']),
  summary: z.string().max(500).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  sourceUpdatedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid sourceUpdatedAt').nullable().optional()
})

export const CalendarAvailabilitySchema = z.object({
  providerRef: z.string().min(1),
  startsAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid startsAt'),
  endsAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid endsAt'),
  excludeCanonicalKey: z.string().min(1).optional()
})
