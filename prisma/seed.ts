import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-password';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const doctorPassword = process.env.SEED_DOCTOR_PASSWORD;

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: adminPassword ? { passwordHash: await hashPassword(adminPassword) } : {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: adminPassword ? await hashPassword(adminPassword) : null,
      person: { create: { firstName: 'Admin', lastName: 'User' } }
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr@example.com' },
    update: doctorPassword ? { passwordHash: await hashPassword(doctorPassword) } : {},
    create: {
      email: 'dr@example.com',
      name: 'Dr. Example',
      role: 'DOCTOR',
      passwordHash: doctorPassword ? await hashPassword(doctorPassword) : null,
      person: { create: { firstName: 'Doc', lastName: 'Example' } }
    },
  });

  await prisma.medicationCatalog.upsert({
    where: { code: 'PARA500' },
    update: {},
    create: { code: 'PARA500', name: 'Paracetamol 500mg', form: 'tablet' }
  });

  console.log('Seed complete', {
    adminUser: adminUser.email,
    doctorUser: doctorUser.email,
    adminPasswordConfigured: Boolean(adminPassword),
    doctorPasswordConfigured: Boolean(doctorPassword)
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
