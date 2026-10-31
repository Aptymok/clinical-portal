import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireStaffApi } from '@/lib/staff-access'
import { prisma } from '@/lib/prisma'
import { HttpError, jsonErrorResponse } from '@/lib/errors'
const Input=z.object({patientId:z.string().min(1),message:z.string().trim().min(1).max(500),at:z.string().datetime({offset:true})})
export async function POST(request:Request){
 try{
  await requireStaffApi()
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new HttpError('Origen no permitido.',403,'FORBIDDEN')
  const input=Input.parse(await request.json())
  const record=await prisma.$transaction(async tx=>{
   const reminder=await tx.reminder.create({data:{...input,at:new Date(input.at)}})
   await tx.domainEvent.create({data:{type:'REMINDER_REGISTERED_V1',payload:{reminderId:reminder.id,delivery:'PORTAL_ONLY',externalDelivery:'NOT_CONFIGURED'}}})
   return reminder
  })
  return NextResponse.json({data:record,delivery:'PORTAL_ONLY'},{status:201})
 }catch(error){return jsonErrorResponse(error)}
}
