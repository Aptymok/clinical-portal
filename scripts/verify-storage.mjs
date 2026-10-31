import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { scryptSync, randomBytes } from 'node:crypto';
const root=process.cwd();
const require=createRequire(root+'/package.json');
const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();
// Disposable synthetic database only. This script is never run against production.
assert.equal(new URL(process.env.DATABASE_URL).pathname,'/clinic_qa');
const salt=randomBytes(16).toString('hex');
const hash=scryptSync('qa-staff-password',salt,64).toString('hex');
// Read repository password format rather than assuming it.
await prisma.user.create({data:{email:'qa-staff@example.test',role:'DOCTOR',name:'QA synthetic',passwordHash:['scrypt-v1',salt,hash].join('$')}});
const patient=await prisma.patient.create({data:{person:{create:{firstName:'Paciente',lastName:'Sintético QA'}}}});
const provider=await prisma.provider.create({data:{person:{create:{firstName:'Profesional',lastName:'Sintético QA'}}}});
const appointment=await prisma.appointment.create({data:{patientId:patient.id,providerId:provider.id,scheduledFor:new Date(),status:'SCHEDULED'}});
await prisma.user.create({data:{email:'qa-patient@example.test',role:'PATIENT',passwordHash:['scrypt-v1',salt,hash].join('$')}});
await prisma.$disconnect();
let jar='';
const base='http://localhost:3000';
async function request(path,options={}) {
 const r=await fetch(base+path,{...options,redirect:'manual',headers:{...options.headers,...(jar?{Cookie:jar}:{})}});
 const cookies=r.headers.getSetCookie();
 if(cookies.length){const pairs=new Map(jar.split('; ').filter(Boolean).map(c=>[c.split('=')[0],c]));for(const c of cookies){const pair=c.split(';')[0];pairs.set(pair.split('=')[0],pair)}jar=[...pairs.values()].join('; ')}
 return r;
}
const csrf=await(await request('/api/auth/csrf')).json();
const login=await request('/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Origin':base,'X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken:csrf.csrfToken,email:'qa-staff@example.test',password:'qa-staff-password',callbackUrl:base+'/dashboard'})});
assert.ok([200,302,303].includes(login.status),'login status '+login.status);
const session=await(await request('/api/auth/session')).json();
assert.equal(session?.user?.role,'DOCTOR','credentials login must establish staff session');
for(const path of ['/dashboard','/dashboard/discovery','/dashboard/calendar','/patients','/appointments','/documents']){const r=await request(path);assert.equal(r.status,200,path);const text=await r.text();assert.ok(!text.includes('No pudimos cargar esta información.'),path+' server error');console.log('STAFF_PAGE_OK',path)}
const saved=await request('/api/discovery',{method:'POST',headers:{'Content-Type':'application/json','Origin':base},body:JSON.stringify({sourceUrl:'https://example.test/qa-physician',field:'telephone',observedValue:'449 996 6500'})});
assert.equal(saved.status,201,await saved.text());
const reviewed=await request('/dashboard/discovery');
assert.ok((await reviewed.text()).includes('example.test'));
console.log('DISCOVERY_PERSISTED_AND_READ_BACK');
const bad=await request('/api/discovery',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://other.test'},body:'{}'});assert.equal(bad.status,403);console.log('CROSS_ORIGIN_WRITE_DENIED');
const outcome=await request('/api/appointments/'+appointment.id,{method:'PATCH',headers:{'Content-Type':'application/json','Origin':base},body:JSON.stringify({status:'COMPLETED'})});
assert.equal(outcome.status,200);assert.equal((await outcome.json()).data.status,'COMPLETED');
const reread=await request('/api/appointments/'+appointment.id);assert.equal((await reread.json()).data.status,'COMPLETED');
console.log('APPOINTMENT_OUTCOME_PERSISTED_AND_READ_BACK');
const maintenance=await request('/api/calendar/maintenance',{method:'POST',headers:{Authorization:'Bearer ci-calendar-secret'}});
assert.equal(maintenance.status,200);assert.equal((await maintenance.json()).status,'NOT_OBSERVED');
const receiptPage=await request('/dashboard');assert.ok((await receiptPage.text()).includes('Sin operación de fuentes comprobada'));
console.log('MAINTENANCE_RECEIPT_PERSISTED_WITHOUT_FALSE_SUCCESS');
jar='';
const patientCsrf=await(await request('/api/auth/csrf')).json();
await request('/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Origin':base,'X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken:patientCsrf.csrfToken,email:'qa-patient@example.test',password:'qa-staff-password',callbackUrl:base+'/dashboard'})});
const denied=await request('/api/patients');assert.equal(denied.status,403);
console.log('PATIENT_ROLE_DENIED_STAFF_DATA');
await prisma.$disconnect();
// Patient portal reads are bound to the authenticated account's Person.
const verifyDb=new PrismaClient();
await verifyDb.user.update({where:{email:'qa-patient@example.test'},data:{personId:patient.personId}});
await verifyDb.reminder.create({data:{patientId:patient.id,message:'Recordatorio QA visible sólo al paciente vinculado',at:new Date()}});
const otherPatient=await verifyDb.patient.create({data:{person:{create:{firstName:'OTRO',lastName:'NO DEBE APARECER'}}}});
await verifyDb.reminder.create({data:{patientId:otherPatient.id,message:'SECRETO-OTRO-PACIENTE-QA',at:new Date()}});
const own=await request('/api/portal?patientId='+otherPatient.id);assert.equal(own.status,200);
const ownBody=await own.text();assert.ok(ownBody.includes('Recordatorio QA'));assert.ok(!ownBody.includes('SECRETO-OTRO'));
const portalPage=await request('/portal');assert.equal(portalPage.status,200);assert.ok(!(await portalPage.text()).includes('SECRETO-OTRO'));
console.log('PATIENT_PORTAL_SCOPED_TO_AUTHENTICATED_ACCOUNT');
const deniedReminder=await request('/api/reminders',{method:'POST',headers:{'Content-Type':'application/json','Origin':base},body:JSON.stringify({patientId:otherPatient.id,message:'unauthorized',at:new Date().toISOString()})});assert.equal(deniedReminder.status,403);
console.log('PATIENT_CANNOT_CREATE_STAFF_REMINDERS');
jar='';
const staffCsrf=await(await request('/api/auth/csrf')).json();
await request('/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Origin':base,'X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken:staffCsrf.csrfToken,email:'qa-staff@example.test',password:'qa-staff-password',callbackUrl:base+'/dashboard'})});
const reminderResponse=await request('/api/reminders',{method:'POST',headers:{'Content-Type':'application/json','Origin':base},body:JSON.stringify({patientId:patient.id,message:'Seguimiento QA registrado',at:new Date().toISOString()})});assert.equal(reminderResponse.status,201);
const reminderSaved=await reminderResponse.json();assert.equal(reminderSaved.delivery,'PORTAL_ONLY');assert.equal(reminderSaved.data.sent,false);
const reminderRead=await verifyDb.reminder.findUnique({where:{id:reminderSaved.data.id}});assert.equal(reminderRead.message,'Seguimiento QA registrado');assert.equal(reminderRead.sent,false);
const followup=await request('/dashboard/follow-up');assert.equal(followup.status,200);assert.ok((await followup.text()).includes('Seguimiento QA registrado'));
console.log('REMINDER_PERSISTED_WITHOUT_FALSE_EXTERNAL_DELIVERY');
await verifyDb.$disconnect();
const registeredPatient=await request('/api/patients',{method:'POST',headers:{'Content-Type':'application/json','Origin':base},body:JSON.stringify({person:{firstName:'Registro',lastName:'QA por formulario'}})});assert.equal(registeredPatient.status,201);
const registered=await registeredPatient.json();assert.ok(registered.data.id);
const registeredPage=await request('/patients/'+registered.data.id);assert.equal(registeredPage.status,200);assert.ok((await registeredPage.text()).includes('QA por formulario'));
const rejectedPatient=await request('/api/patients',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://other.test'},body:JSON.stringify({person:{firstName:'Cross',lastName:'Origin'}})});assert.equal(rejectedPatient.status,403);
console.log('PATIENT_REGISTRATION_PERSISTED_AND_CROSS_ORIGIN_DENIED');
