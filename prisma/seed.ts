import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      person: { create: { firstName: 'Admin', lastName: 'User' } }
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr@example.com' },
    update: {},
    create: {
      email: 'dr@example.com',
      name: 'Dr. Example',
      role: 'DOCTOR',
      person: { create: { firstName: 'Doc', lastName: 'Example' } }
    },
  });

  await prisma.medicationCatalog.upsert({
    where: { code: 'PARA500' },
    update: {},
    create: { code: 'PARA500', name: 'Paracetamol 500mg', form: 'tablet' }
  });

  console.log('Seed complete', { adminUser: adminUser.email, doctorUser: doctorUser.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
console.log("seed")