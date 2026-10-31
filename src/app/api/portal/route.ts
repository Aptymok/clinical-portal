import { auth } from '@/auth'
import { patientTimeline } from '@/lib/patient-portal'
import { NextResponse } from 'next/server'
export const dynamic='force-dynamic'
export async function GET(){
 const session=await auth()
 if(!session?.user?.email)return NextResponse.json({error:'UNAUTHORIZED'},{status:401})
 const timeline=await patientTimeline(session.user.email)
 return NextResponse.json({data:timeline},{headers:{'Cache-Control':'private, no-store'}})
}
