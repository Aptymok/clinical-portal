import { PrismaClient } from '@prisma/client';
import { databaseUrl } from './database-url.mjs';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const datasourceUrl = databaseUrl(process.env.DATABASE_URL);
export const prisma = global.prisma ?? new PrismaClient({ datasourceUrl });
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
