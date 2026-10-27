'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, destroySession, requireAdmin } from '@/lib/auth';

/**
 * Admin server actions.
 *
 * Every action that writes calls `requireAdmin()` first. Server actions are
 * reachable as POST endpoints by anyone who can guess their id — being
 * rendered only inside an admin page is not access control.
 */

export interface ActionState {
  error?: string;
  success?: string;
}

const LoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export async function adminLogin(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check your details.' };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true, role: true, passwordHash: true },
  });

  // One message for "no such account", "wrong password" and "not an admin".
  // Distinguishing them tells an attacker which admin emails exist.
  const invalid = { error: 'Incorrect email or password.' };

  if (!user?.passwordHash) {
    // Hash anyway, so a missing account does not return measurably faster
    // than a wrong password.
    await bcrypt.compare(parsed.data.password, '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltuu');
    return invalid;
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok || user.role !== 'ADMIN') return invalid;

  await createSession({ userId: user.id, role: 'ADMIN' });
  redirect('/admin');
}

export async function adminLogout() {
  await destroySession();
  redirect('/admin/login');
}

const OrderStatuses = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('orderId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !OrderStatuses.includes(status as (typeof OrderStatuses)[number])) return;

  await db.order.update({
    where: { id },
    data: { status: status as (typeof OrderStatuses)[number] },
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
}

export async function recordPayment(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('orderId') ?? '');
  const amountRs = Math.max(0, Math.round(Number(formData.get('amountRs')) || 0));
  if (!id) return;

  const order = await db.order.findUnique({
    where: { id },
    select: { totalRs: true },
  });
  if (!order) return;

  // Paid in full, part-paid, or nothing yet — derived from the amount rather
  // than asked for separately, so the two can never disagree.
  const paymentStatus =
    amountRs >= order.totalRs ? 'PAID' : amountRs > 0 ? 'ADVANCE_PAID' : 'UNPAID';

  await db.order.update({
    where: { id },
    data: {
      amountPaidRs: amountRs,
      paymentStatus,
      paymentConfirmedAt: amountRs > 0 ? new Date() : null,
      // Recording a payment on a brand-new order is the act of confirming it.
      ...(amountRs > 0 ? { status: 'CONFIRMED' as const } : {}),
    },
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
}

export async function updateVariant(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('variantId') ?? '');
  if (!id) return;

  const priceRs = Math.max(0, Math.round(Number(formData.get('priceRs')) || 0));
  const stock = Math.max(0, Math.round(Number(formData.get('stock')) || 0));

  await db.productVariant.update({ where: { id }, data: { priceRs, stock } });
  revalidatePath('/admin/products');
}

export async function toggleProductStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('productId') ?? '');
  if (!id) return;

  const product = await db.product.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!product) return;

  await db.product.update({
    where: { id },
    data: { status: product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE' },
  });
  revalidatePath('/admin/products');
}

export async function setReviewApproval(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('reviewId') ?? '');
  const approve = formData.get('approve') === '1';
  if (!id) return;

  await db.review.update({ where: { id }, data: { isApproved: approve } });
  revalidatePath('/admin/reviews');
}

export async function deleteReview(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('reviewId') ?? '');
  if (!id) return;

  await db.review.delete({ where: { id } });
  revalidatePath('/admin/reviews');
}

export async function updateSettings(formData: FormData): Promise<void> {
  await requireAdmin();

  // Only keys present in the submitted form are touched, so one tab of the
  // settings screen cannot blank the fields belonging to another.
  const entries = [...formData.entries()].filter(
    ([key]) => key.startsWith('setting:') && key.length > 'setting:'.length,
  );

  for (const [key, value] of entries) {
    const settingKey = key.slice('setting:'.length);
    const settingValue = typeof value === 'string' ? value : '';
    await db.setting.upsert({
      where: { key: settingKey },
      update: { value: settingValue },
      create: { key: settingKey, value: settingValue },
    });
  }

  revalidatePath('/admin/settings');
  // Settings appear in the footer and on the homepage of the live store.
  revalidatePath('/', 'layout');
}

export async function clearSampleDataFlag(): Promise<void> {
  await requireAdmin();
  await db.setting.deleteMany({ where: { key: 'catalogue.sampleData' } });
  revalidatePath('/admin', 'layout');
}
