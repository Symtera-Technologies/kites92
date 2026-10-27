'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';

export interface AuthState {
  error?: string;
}

const EMAIL = z.string().trim().toLowerCase().email('Enter a valid email address.');

const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: EMAIL,
  phone: z
    .string()
    .trim()
    .regex(/^(\+?92|0)?3\d{2}[\s-]?\d{7}$/, 'Enter a valid Pakistani mobile number.')
    .optional()
    .or(z.literal('')),
  // 10 is a meaningful floor; shorter passwords are the single biggest cause
  // of account takeover and the cost of requiring more is one extra word.
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
});

export async function registerCustomer(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your details.' };
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (existing?.passwordHash) {
    return { error: 'An account with that email already exists. Try signing in.' };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // An order placed as a guest may already have created a user row with no
  // password. Registering with the same email claims that record rather than
  // orphaning the order history behind it.
  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: { name, phone: phone || null, passwordHash },
        select: { id: true, role: true },
      })
    : await db.user.create({
        data: { name, email, phone: phone || null, passwordHash },
        select: { id: true, role: true },
      });

  await createSession({ userId: user.id, role: user.role });
  redirect('/account');
}

const LoginSchema = z.object({
  email: EMAIL,
  password: z.string().min(1, 'Enter your password.'),
});

export async function loginCustomer(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your details.' };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true, passwordHash: true },
  });

  const invalid = { error: 'Incorrect email or password.' };

  if (!user?.passwordHash) {
    // Spend the same time hashing as a real comparison would, so a missing
    // account is not detectable by how fast this responds.
    await bcrypt.compare(parsed.data.password, '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltuu');
    return invalid;
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return invalid;

  await createSession({ userId: user.id, role: user.role });
  redirect('/account');
}

export async function logoutCustomer() {
  await destroySession();
  redirect('/');
}
