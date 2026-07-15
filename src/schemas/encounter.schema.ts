import { z } from 'zod'

export const ObservationSchema = z.object({
  type: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  recordedAt: z.string().optional()
})

export const DiagnosisSchema = z.object({
  code: z.string().min(1),
  display: z.string().optional(),
  primary: z.boolean().optional()
})

export const EncounterCreateSchema = z.object({
  patientId: z.string().min(1),
  providerId: z.string().min(1),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  observations: z.array(ObservationSchema).optional(),
  diagnoses: z.array(DiagnosisSchema).optional()
})

export const EncounterPatchSchema = z.object({
  endedAt: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional()
})

export type EncounterCreate = z.infer<typeof EncounterCreateSchema>
