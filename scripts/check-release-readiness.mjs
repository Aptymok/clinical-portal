import {createRequire} from 'node:module';
const errors=[];
const secret=process.env.AUTH_SECRET||process.env.NEXTAUTH_SECRET||'';
if(secret.length<32)errors.push('Configurar un secreto de autenticación de al menos 32 caracteres.');
if(!/^[a-f0-9]{64}$/i.test(process.env.ENCRYPTION_KEY||''))errors.push('Configurar una clave de cifrado válida.');
if((process.env.CALENDAR_SYNC_SECRET||'').length<32)errors.push('Configurar el secreto del mantenimiento de calendarios.');
if(process.env.NEXT_PUBLIC_SITE_URL!=='https://inmunoclinic.com')errors.push('Verificar la URL pública canónica.');
if(!process.env.DATABASE_URL)errors.push('Vincular la base de datos destinada a la clínica.');
if(!errors.length){
 const require=createRequire(import.meta.url);const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
 try{
  await db.calendarSource.count();await db.calendarPropagationJob.count();await db.reminder.count();
  const staff=await db.user.count({where:{role:{in:['ADMIN','DOCTOR']},passwordHash:{not:null}}});
  if(!staff)errors.push('Dar de alta o verificar la cuenta autorizada del doctor/administrador.');
  const provider=process.env.CALENDAR_INTERNAL_PROVIDER_ID;
  if(!provider||!await db.provider.findUnique({where:{id:provider},select:{id:true}}))errors.push('Vincular el profesional interno con la referencia de sus calendarios.');
 }catch{errors.push('No se pudo verificar el esquema en la base de datos configurada.');}finally{await db.$disconnect();}
}
console.log(JSON.stringify({ready:errors.length===0,productionWrites:false,pending:errors},null,2));
if(errors.length)process.exitCode=1;
