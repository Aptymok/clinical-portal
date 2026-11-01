import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { bootstrapAdministrator } from '../src/lib/bootstrap-admin';
import { verifyPassword } from '../src/lib/auth-password';
import { spawn } from 'node:child_process';

async function main() {
  if (new URL(process.env.DATABASE_URL || '').pathname !== '/clinic_qa') throw new Error('Disposable QA database only');
  const provider = await prisma.provider.create({ data: { person: { create: { firstName: 'QA', lastName: 'BOOTSTRAP' } } } });
  const input = { email: 'bootstrap@example.test', providerId: provider.id, password: 'qa-initial-password-ONLY' };
  await assert.rejects(() => bootstrapAdministrator(prisma, { ...input, password: 'short' }), /PASSWORD_REQUIRED/);
  assert.equal(await prisma.user.count({ where: { email: input.email } }), 0);
  await assert.rejects(() => bootstrapAdministrator(prisma, { ...input, providerId: 'not-a-provider' }), /PROVIDER_REQUIRED/);
  assert.equal(await bootstrapAdministrator(prisma, input), 'CREATED');
  const first = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
  assert.equal(first.role, 'ADMIN');
  assert.equal(await verifyPassword(input.password, first.passwordHash), true);
  assert.equal(await bootstrapAdministrator(prisma, { ...input, password: 'another-qa-password-ONLY' }), 'EXISTING');
  assert.equal(await bootstrapAdministrator(prisma, { ...input, password: undefined }), 'EXISTING');
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: first.id } })).passwordHash, first.passwordHash, 'A deploy must never rotate an existing login');
  await assert.rejects(() => bootstrapAdministrator(prisma, { ...input, email: 'another@example.test' }), /ADMIN_ALREADY_EXISTS/);
  const patientAccount = await prisma.user.create({ data: { email: 'bootstrap-patient@example.test', role: 'PATIENT' } });
  await assert.rejects(() => bootstrapAdministrator(prisma, { ...input, email: patientAccount.email }), /ACCOUNT_ROLE_CONFLICT/);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: patientAccount.id } })).role, 'PATIENT');
  assert.equal(await prisma.auditLog.count({ where: { action: 'ADMIN_BOOTSTRAPPED', resourceId: first.id } }), 1);
  assert.equal(await prisma.patient.count(), 0, 'Bootstrap must not seed patients');
  const prepare = async () => {
    // PGlite serves one connection at a time; release the fixture connection.
    await prisma.$disconnect();
    return new Promise<{ code: number; output: string }>(resolve => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/prepare-production.ts'], { env: { ...process.env, VERCEL_ENV: 'production', AUTH_SECRET: 'qa-auth-secret-with-at-least-32-characters', ENCRYPTION_KEY: 'a'.repeat(64), CALENDAR_SYNC_SECRET: 'qa-calendar-secret-with-at-least-32-characters', NEXT_PUBLIC_SITE_URL: 'https://inmunoclinic.com', CLINIC_ADMIN_EMAIL: input.email, CALENDAR_INTERNAL_PROVIDER_ID: provider.id } });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('exit', code => resolve({ code: code ?? 1, output }));
    });
  };
  const good = await prepare();
  assert.equal(good.code, 0, good.output);
  assert.match(good.output, /"privacyVerified":true/);
  assert.match(good.output, /"administrator":"EXISTING"/);
  await prisma.$executeRaw`ALTER TABLE public."User" DISABLE ROW LEVEL SECURITY`;
  const exposed = await prepare();
  assert.equal(exposed.code, 1);
  assert.match(exposed.output, /CLINICAL_TABLES_NOT_PRIVATE/);
  await prisma.$executeRaw`ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY`;
  console.log(JSON.stringify({ bootstrap: 'PASS', buildPreflight: 'PASS', privacyFailureBlocksBuild: true, passwordPreserved: true, roleEscalationRefused: true, patientSeeds: 0, productionWrites: false }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
