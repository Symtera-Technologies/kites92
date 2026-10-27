import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * Look up an order for the "track your order" form.
 *
 * Requires BOTH the order number and the phone number it was placed with.
 * Order numbers are short and printed on the customer's receipt, so they are
 * guessable on their own; pairing them with the phone number stops someone
 * enumerating references to read other people's names and addresses.
 *
 * On success this returns only the tracking token, and the client redirects to
 * the existing order page — no customer data is returned from this endpoint.
 */

const TrackSchema = z.object({
  orderNumber: z.string().trim().min(4).max(32),
  phone: z.string().trim().min(7).max(24),
});

/** Compare only the significant digits, so formatting differences still match. */
function normalisePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  // 03001234567, 923001234567 and 00923001234567 are the same number.
  return digits.slice(-10);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const parsed = TrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Enter both your order number and the mobile number you ordered with.' },
      { status: 400 },
    );
  }

  const order = await db.order.findUnique({
    where: { orderNumber: parsed.data.orderNumber.toUpperCase() },
    select: { customerPhone: true, trackingToken: true },
  });

  const notFound = {
    error:
      'We could not find that order. Check the order number and the mobile number, or message us on WhatsApp.',
  };

  if (!order) return NextResponse.json(notFound, { status: 404 });

  if (normalisePhone(order.customerPhone) !== normalisePhone(parsed.data.phone)) {
    // Same response as "no such order": telling the difference would confirm
    // which order numbers exist.
    return NextResponse.json(notFound, { status: 404 });
  }

  return NextResponse.json({ ok: true, trackingToken: order.trackingToken });
}
