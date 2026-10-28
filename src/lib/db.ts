import { PrismaClient } from '@prisma/client';
import { buildDatabaseUrl } from './db-url.mjs';

/**
 * Prisma singleton.
 *
 * Next's dev server hot-reloads modules, which would otherwise open a new pool
 * on every edit and exhaust the connection cap that shared cPanel MySQL sets
 * aggressively low. Cache the client on `globalThis` in development only.
 *
 * The connection string is composed from DB_HOST/DB_PORT/DB_NAME/DB_USER/
 * DB_PASSWORD by `db-url.mjs`, which percent-encodes the password so that URI
 * punctuation in it cannot corrupt the URL. An explicit DATABASE_URL still
 * takes precedence. It is passed to the client directly rather than left to
 * Prisma's own env lookup, so the composed value is the one actually used.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: buildDatabaseUrl(),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
