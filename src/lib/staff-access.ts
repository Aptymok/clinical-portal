import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { HttpError } from '@/lib/errors'

const staffRoles = new Set(['ADMIN','DOCTOR','NURSE','STAFF'])
export async function requireStaffApi() {
  const session = await auth()
  if (!session?.user) throw new HttpError('Inicia sesión para continuar.', 401, 'UNAUTHORIZED')
  if (!staffRoles.has(String((session.user as {role?:string}).role))) throw new HttpError('Acceso reservado al equipo del consultorio.',403,'FORBIDDEN')
  return session
}
export async function requireStaffPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!staffRoles.has(String((session.user as {role?:string}).role))) redirect('/')
  return session
}
