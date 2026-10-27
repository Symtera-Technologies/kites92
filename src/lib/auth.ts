import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';

/**
 * Sessions.
 *
 * A signed JWT in an httpOnly cookie, rather than a session table. The payload
 * carries only an id and a role, both of which are re-checked against the
 * database on every admin request — so a revoked or demoted account cannot
 * keep using a token that was valid when it was issued.
 *
 * `jose` is used rather than `jsonwebtoken` because it runs on the Edge
 * runtime as well as Node, which keeps the door open to checking sessions in
 * middleware later.
 */

const COOKIE = 'k92_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export interface SessionPayload {
  userId: string;
  role: 'CUSTOMER' | 'ADMIN';
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Failing loudly is the only safe option: a missing secret would otherwise
    // mean tokens signed with a predictable key, which is worse than an outage.
    throw new Error(
      'AUTH_SECRET is missing or too short. Generate one with:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Secure in production only, so local http development still works.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Decode the session cookie. Returns null when absent, expired or forged. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = typeof payload.userId === 'string' ? payload.userId : null;
    const role = payload.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
    return userId ? { userId, role } : null;
  } catch {
    // Expired or tampered-with. Indistinguishable from signed out, by design.
    return null;
  }
}

/** The signed-in user, re-read from the database. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    // Never select passwordHash.
    select: { id: true, email: true, name: true, phone: true, role: true },
  });
}

/**
 * Guard an admin route.
 *
 * The role is read from the database, not from the token. A token issued while
 * someone was an admin must stop working the moment the account is demoted.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (user.role !== 'ADMIN') redirect('/');
  return user;
}

/** Guard a customer account route. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/account/login');
  return user;
}
