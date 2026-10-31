import assert from 'node:assert/strict'
const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000'
for (const path of ['/', '/login', '/servicios-y-vacunas','/ubicacion-y-contacto','/dr-jesus-guillermo-espinoza-contreras','/aviso-de-privacidad','/derechos-del-paciente','/terminos-de-uso','/sitemap.xml','/robots.txt','/llms.txt','/.well-known/inmunoclinic.json']) {
  const response = await fetch(base+path)
  assert.equal(response.status,200,path)
  const body = await response.text()
  assert.ok(body.length>50,path+' empty')
  if(path==='/') assert.ok(body.includes('Dr. Jesús Guillermo'))
  if(path==='/login') assert.ok(body.includes('clinic-password'))
  if(path==='/sitemap.xml') assert.ok(!body.includes('localhost'))
  console.log('PUBLIC_OK',path)
}
for (const path of ['/dashboard','/dashboard/discovery','/dashboard/calendar','/patients','/documents','/appointments','/encounters']) {
  const response = await fetch(base+path,{redirect:'manual'})
  assert.equal(response.status,307,path)
  assert.ok(response.headers.get('location')?.includes('/login'),path)
  console.log('PRIVATE_REDIRECT_OK',path)
}
for(const [path,method] of [['/api/patients','GET'],['/api/dashboard','GET'],['/api/appointments','GET'],['/api/documents','GET'],['/api/discovery','POST'],['/api/calendar/status','GET']]) {
  const response=await fetch(base+path,{method})
  assert.equal(response.status,401,path)
  console.log('PRIVATE_API_DENIED',path)
}
const session=await fetch(base+'/api/auth/session')
assert.equal(session.status,200)
assert.equal(await session.json(),null)
const csrf=await fetch(base+'/api/auth/csrf')
assert.equal(csrf.status,200)
assert.ok((await csrf.json()).csrfToken)
console.log('AUTH_HANDLERS_OK')
