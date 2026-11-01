import type { PrismaClient } from '@prisma/client';
import { hashPassword } from './auth-password';

export async function bootstrapAdministrator(db: PrismaClient, input: { email: string; providerId: string; password?: string }) {
  const email = input.email?.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) throw new Error('ADMIN_EMAIL_REQUIRED');
  return db.$transaction(async tx => {
    // Serialize first-account setup across simultaneous production builds.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(72646001)`;
    if (!input.providerId || !await tx.provider.findUnique({ where: { id: input.providerId }, select: { id: true } })) throw new Error('PROVIDER_REQUIRED');
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== 'ADMIN') throw new Error('ACCOUNT_ROLE_CONFLICT');
      if (!existing.passwordHash) throw new Error('ADMIN_PASSWORD_MISSING');
      return 'EXISTING';
    }
    if (await tx.user.count({ where: { role: 'ADMIN' } })) throw new Error('ADMIN_ALREADY_EXISTS');
    if (!input.password || input.password.length < 16) throw new Error('ADMIN_PASSWORD_REQUIRED');
    const user = await tx.user.create({ data: { email, name: 'Administración de Inmunoclinic', role: 'ADMIN', passwordHash: await hashPassword(input.password) } });
    await tx.auditLog.create({ data: { action: 'ADMIN_BOOTSTRAPPED', resource: 'User', resourceId: user.id, status: 'SUCCESS', meta: { method: 'production-initialization' } } });
    return 'CREATED';
  }, { isolationLevel: 'Serializable' });
}
