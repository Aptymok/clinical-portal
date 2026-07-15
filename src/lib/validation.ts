import { ZodSchema, ZodError } from 'zod'
import { ValidationError } from './errors'

export async function parseJsonBody<T>(req: Request){
  const text = await req.text()
  try{
    return text ? JSON.parse(text) as T : undefined
  }catch(e){
    throw new ValidationError('Invalid JSON body', [{ message: 'Invalid JSON' }])
  }
}

export function validateSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  try{
    return schema.parse(data)
  }catch(e){
    if (e instanceof ZodError){
      throw new ValidationError('Validation failed', e.issues)
    }
    throw e
  }
}
