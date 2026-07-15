import { z } from 'zod'

export const AppointmentCreateSchema = z.object({
  patientId: z.string().min(1),
  providerId: z.string().min(1),
  scheduledFor: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' }),
  reason: z.string().optional(),
  notes: z.string().optional()
})

export const AppointmentPatchSchema = z.object({
  scheduledFor: z.string().optional().refine((s) => !s || !Number.isNaN(Date.parse(s)), { message: 'Invalid date' }),
  status: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional()
})

export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>
