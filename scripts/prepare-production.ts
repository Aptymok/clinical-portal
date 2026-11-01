import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
let stage = 'configuration';

async function main() {
  if (process.env.VERCEL_ENV !== 'production') {
    console.log('Production initialization skipped outside Vercel production.');
    return;
  }
  if ((process.env.AUTH_SECRET || '').length < 32 || !/^[a-f0-9]{64}$/i.test(process.env.ENCRYPTION_KEY || '') || (process.env.CALENDAR_SYNC_SECRET || '').length < 32) throw new Error('INVALID_PRODUCTION_SECRETS');
  if (process.env.NEXT_PUBLIC_SITE_URL !== 'https://inmunoclinic.com' || !process.env.DATABASE_URL || !process.env.CLINIC_ADMIN_EMAIL || !process.env.CALENDAR_INTERNAL_PROVIDER_ID) throw new Error('MISSING_PRODUCTION_CONFIGURATION');
  stage = 'database-client';
  const { prisma } = await import('../src/lib/prisma');
  const { bootstrapAdministrator } = await import('../src/lib/bootstrap-admin');
  try {
    stage = 'migration-history';
    const applied = await prisma.$queryRaw<Array<{ migration_name: string; checksum: string }>>`SELECT migration_name,checksum FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    const root = resolve('prisma/migrations');
    const names = (await readdir(root)).filter(name => /^\d{14}_/.test(name)).sort();
    if (applied.length !== names.length) throw new Error('SCHEMA_MIGRATIONS_MISMATCH');
    for (const name of names) {
      const checksum = createHash('sha256').update(await readFile(resolve(root, name, 'migration.sql'))).digest('hex');
      if (!applied.some(row => row.migration_name === name && row.checksum === checksum)) throw new Error('SCHEMA_CHECKSUM_MISMATCH');
    }
    stage = 'table-privacy';
    const privacy = await prisma.$queryRaw<Array<{ unsafe: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND (NOT c.relrowsecurity OR EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') AND has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE')))) AS unsafe`;
    if (privacy[0]?.unsafe !== false) throw new Error('CLINICAL_TABLES_NOT_PRIVATE');
    stage = 'administrator';
    const administrator = await bootstrapAdministrator(prisma, { email: process.env.CLINIC_ADMIN_EMAIL, providerId: process.env.CALENDAR_INTERNAL_PROVIDER_ID, password: process.env.SEED_ADMIN_PASSWORD });
    console.log(JSON.stringify({ productionInitialization: 'PASS', schemaVerified: true, privacyVerified: true, administrator, patientsSeeded: 0 }));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => {
  const allowed = ['INVALID_PRODUCTION_SECRETS','MISSING_PRODUCTION_CONFIGURATION','SCHEMA_MIGRATIONS_MISMATCH','SCHEMA_CHECKSUM_MISMATCH','CLINICAL_TABLES_NOT_PRIVATE','ADMIN_EMAIL_REQUIRED','PROVIDER_REQUIRED','ACCOUNT_ROLE_CONFLICT','ADMIN_PASSWORD_MISSING','ADMIN_ALREADY_EXISTS','ADMIN_PASSWORD_REQUIRED','DATABASE_URL configuration is invalid'];
  console.error('Production initialization blocked:', allowed.includes(error?.message) ? error.message : 'DATABASE_CHECK_FAILED', { stage, type: error?.name, code: error?.code, databaseCode: error?.meta?.code });
  process.exitCode = 1;
});
