import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton.
 *
 * Next's dev server hot-reloads modules, which would otherwise open a new pool
 * on every edit and exhaust the connection cap that shared cPanel MySQL sets
 * aggressively low. Cache the client on `globalThis` in development only.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
