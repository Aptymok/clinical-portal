import { ZodError } from 'zod'
import { NextResponse } from 'next/server'

export class ApiError extends Error {
  status: number
  code: string
  meta?: any
  constructor(message: string, status = 500, code = 'API_ERROR', meta?: any){
    super(message)
    this.status = status
    this.code = code
    this.meta = meta
  }
}

export class ValidationError extends ApiError {
  issues: any
  constructor(message: string, issues: any){
    super(message, 400, 'VALIDATION_ERROR')
    this.issues = issues
  }
}

export class HttpError extends ApiError {}

export function jsonErrorResponse(err: unknown){
  if (err instanceof ValidationError){
    return NextResponse.json({ success: false, error: { code: err.code, message: err.message, issues: err.issues } }, { status: err.status })
  }
  if (err instanceof ApiError){
    return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status })
  }
  if (err instanceof ZodError){
    return NextResponse.json(
        {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                issues: err.issues,
            },
        },
        { status: 400 }
    );
  }
  const message = err instanceof Error ? err.message : 'Unknown error'
  return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message } }, { status: 500 })
}

export function jsonSuccess(data: any, status = 200){
  return NextResponse.json({ success: true, data }, { status })
}
