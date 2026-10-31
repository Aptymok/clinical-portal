import { prisma } from '@/lib/prisma'
// Resolve ownership from the authenticated identity, never a submitted patient ID.
export async function patientTimeline(email:string) {
 const user=await prisma.user.findUnique({where:{email},select:{role:true,personId:true}})
 if(user?.role!=='PATIENT'||!user.personId)return null
 return prisma.patient.findUnique({where:{personId:user.personId},select:{
   id:true,person:{select:{firstName:true}},
   appointments:{where:{scheduledFor:{gte:new Date(Date.now()-30*86400000)}},orderBy:{scheduledFor:'asc'},take:40,select:{id:true,scheduledFor:true,status:true}},
   reminders:{where:{at:{gte:new Date(Date.now()-30*86400000)}},orderBy:{at:'asc'},take:40,select:{id:true,message:true,at:true,sent:true}}
 }})
}
