import { z } from 'zod'

const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'])

export const PersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: GenderEnum.optional(),
  birthDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)).nullable()
})

export const PatientCreateSchema = z.object({
  mrn: z.string().optional(),
  person: PersonSchema
})

export const PatientPatchSchema = z.object({
  mrn: z.string().optional(),
  person: PersonSchema.partial().optional()
})

export type PatientCreate = z.infer<typeof PatientCreateSchema>
export type PatientPatch = z.infer<typeof PatientPatchSchema>
