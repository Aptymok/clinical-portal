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
