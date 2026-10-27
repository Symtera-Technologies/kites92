import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { computeTotals, evaluateCoupon, roundRs } from '@/lib/commerce/money';

/**
 * Place an order.
 *
 * SECURITY MODEL: the client sends only variant IDs, quantities, a coupon code
 * and delivery details. Every monetary figure is recomputed here from the
 * database. Nothing about price, stock or shipping that arrives in the request
 * body is trusted or even read — a browser can send whatever it likes, so the
 * only safe prices are the ones the server looks up itself.
 */

const CheckoutSchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'Your basket is empty.')
    .max(50),
  customer: z.object({
    name: z.string().trim().min(2, 'Please enter your full name.').max(120),
    // Pakistani mobile numbers, written the several ways people actually type
    // them: 03001234567, +923001234567, 0092300..., with spaces or dashes.
    phone: z
      .string()
      .trim()
      .regex(
        /^(\+?92|0)?3\d{2}[\s-]?\d{7}$/,
        'Enter a valid Pakistani mobile number, for example 0300 1234567.',
      ),
    email: z.string().trim().email('Enter a valid email address.').optional().or(z.literal('')),
  }),
  address: z.object({
    province: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    area: z.string().trim().max(120).optional().or(z.literal('')),
    line1: z.string().trim().min(5, 'Please enter your street address.').max(200),
    line2: z.string().trim().max(200).optional().or(z.literal('')),
    postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  }),
  paymentMethod: z.enum(['COD', 'BANK_TRANSFER']),
  couponCode: z.string().trim().max(40).optional().or(z.literal('')),
  customerNote: z.string().trim().max(1000).optional().or(z.literal('')),
});

/** Short, unambiguous order reference. Excludes I/O/0/1 to avoid misreading. */
function makeOrderNumber() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(6);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `K92-${out}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Please check the highlighted fields.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const { lines, customer, address, paymentMethod, couponCode, customerNote } = parsed.data;

  // Collapse duplicate variant IDs, so the same SKU sent twice cannot bypass
  // the per-line stock check.
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + line.quantity);
  }

  // ── Authoritative prices and stock ──────────────────────────────────────
  const variants = await db.productVariant.findMany({
    where: { id: { in: [...quantities.keys()], }, isActive: true },
    select: {
      id: true,
      sku: true,
      label: true,
      priceRs: true,
      stock: true,
      product: { select: { id: true, name: true, status: true } },
    },
  });

  const missing = [...quantities.keys()].filter(
    (id) => !variants.some((v) => v.id === id) ,
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Some items are no longer available. Please refresh your basket.', missing },
      { status: 409 },
    );
  }

  const unavailable = variants.filter((v) => v.product.status !== 'ACTIVE');
  if (unavailable.length > 0) {
    return NextResponse.json(
      {
        error: 'Some items are no longer on sale.',
        items: unavailable.map((v) => v.product.name),
      },
      { status: 409 },
    );
  }

  const outOfStock = variants.filter((v) => v.stock < (quantities.get(v.id) ?? 0));
  if (outOfStock.length > 0) {
    return NextResponse.json(
      {
        error: 'Not enough stock for some items.',
        items: outOfStock.map((v) => ({
          name: v.product.name,
          variant: v.label,
          available: v.stock,
        })),
      },
      { status: 409 },
    );
  }

  const orderLines = variants.map((variant) => {
    const quantity = quantities.get(variant.id)!;
    return {
      variant,
      quantity,
      unitPriceRs: variant.priceRs,
      lineTotalRs: variant.priceRs * quantity,
    };
  });

  const subtotalRs = orderLines.reduce((sum, line) => sum + line.lineTotalRs, 0);

  // ── Coupon, validated server-side ───────────────────────────────────────
  let discountRs = 0;
  let couponId: string | null = null;
  let appliedCode: string | null = null;

  if (couponCode) {
    const coupon = await db.coupon.findUnique({
      where: { code: couponCode.toUpperCase() },
    });
    if (!coupon) {
      return NextResponse.json({ error: 'That discount code was not recognised.' }, { status: 400 });
    }
    const check = evaluateCoupon(
      {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minSubtotalRs: coupon.minSubtotalRs,
        maxRedemptions: coupon.maxRedemptions,
        timesRedeemed: coupon.timesRedeemed,
        startsAt: coupon.startsAt,
        endsAt: coupon.endsAt,
        isActive: coupon.isActive,
      },
      subtotalRs,
    );
    if (!check.ok) {
      const reasons: Record<string, string> = {
        inactive: 'That discount code is no longer active.',
        not_started: 'That discount code is not valid yet.',
        expired: 'That discount code has expired.',
        exhausted: 'That discount code has been fully redeemed.',
        below_minimum: `That code needs a minimum basket of Rs. ${coupon.minSubtotalRs}.`,
      };
      return NextResponse.json(
        { error: reasons[check.reason ?? 'inactive'] ?? 'That code cannot be used.' },
        { status: 400 },
      );
    }
    discountRs = check.discountRs;
    couponId = coupon.id;
    appliedCode = coupon.code;
  }

  // ── Delivery, resolved from the zone table ──────────────────────────────
  const zone = await db.deliveryZone.findFirst({
    where: { city: address.city, province: address.province, isActive: true },
  });

  if (!zone) {
    return NextResponse.json(
      {
        error:
          'We do not currently deliver to that city. Please contact us on WhatsApp to check availability.',
      },
      { status: 400 },
    );
  }

  if (paymentMethod === 'COD' && !zone.codAvailable) {
    return NextResponse.json(
      {
        error: `Cash on delivery is not available for ${zone.city}. Please choose bank transfer.`,
      },
      { status: 400 },
    );
  }

  const totals = computeTotals(
    orderLines.map((line) => ({ unitPriceRs: line.unitPriceRs, quantity: line.quantity })),
    {
      discountRs,
      shipping: { feeRs: zone.feeRs, freeOverRs: zone.freeOverRs },
      advancePercent: Number(
        (await db.setting.findUnique({ where: { key: 'payment.advancePercent' } }))?.value ?? 50,
      ),
    },
  );

  // ── Persist ─────────────────────────────────────────────────────────────
  try {
    const order = await db.$transaction(async (tx) => {
      // Decrement stock with the quantity guard in the WHERE clause, so two
      // simultaneous checkouts cannot both claim the last item. If the guard
      // fails the update matches zero rows and we abort the whole transaction.
      for (const line of orderLines) {
        const result = await tx.productVariant.updateMany({
          where: { id: line.variant.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (result.count === 0) {
          throw new Error(`OUT_OF_STOCK:${line.variant.product.name}`);
        }
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { timesRedeemed: { increment: 1 } },
        });
      }

      return tx.order.create({
        data: {
          orderNumber: makeOrderNumber(),
          trackingToken: randomBytes(16).toString('hex'),

          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email || null,

          province: address.province,
          city: address.city,
          area: address.area || null,
          line1: address.line1,
          line2: address.line2 || null,
          postalCode: address.postalCode || null,

          subtotalRs: totals.subtotalRs,
          discountRs: totals.discountRs,
          shippingRs: totals.shippingRs,
          totalRs: totals.totalRs,
          amountPaidRs: 0,

          couponCode: appliedCode,
          couponId,

          paymentMethod,
          paymentStatus: 'UNPAID',
          status: 'PENDING_PAYMENT',
          customerNote: customerNote || null,

          items: {
            create: orderLines.map((line) => ({
              productId: line.variant.product.id,
              variantId: line.variant.id,
              // Copied, not referenced: the order must stay truthful even if
              // the product is later renamed, repriced or deleted.
              productName: line.variant.product.name,
              variantLabel: line.variant.label,
              unitPriceRs: line.unitPriceRs,
              quantity: line.quantity,
              lineTotalRs: line.lineTotalRs,
            })),
          },
        },
        select: { orderNumber: true, trackingToken: true, totalRs: true },
      });
    });

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      totalRs: order.totalRs,
      advanceDueRs: totals.advanceDueRs,
      shippingRs: totals.shippingRs,
      discountRs: totals.discountRs,
      estimateDays: zone.estimateDays,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('OUT_OF_STOCK:')) {
      return NextResponse.json(
        {
          error: `"${message.slice('OUT_OF_STOCK:'.length)}" sold out while you were checking out. Please adjust your basket.`,
        },
        { status: 409 },
      );
    }

    console.error('[checkout] order creation failed', error);
    return NextResponse.json(
      { error: 'We could not place your order. Please try again or contact us on WhatsApp.' },
      { status: 500 },
    );
  }
}

/** Totals preview: same server-side maths, without creating an order. */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const QuoteSchema = z.object({
    lines: z
      .array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(99) }))
      .max(50),
    province: z.string().optional(),
    city: z.string().optional(),
    couponCode: z.string().max(40).optional(),
  });

  const parsed = QuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { lines, province, city, couponCode } = parsed.data;
  if (lines.length === 0) {
    return NextResponse.json({ subtotalRs: 0, discountRs: 0, shippingRs: 0, totalRs: 0, advanceDueRs: 0 });
  }

  const variants = await db.productVariant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) }, isActive: true },
    select: { id: true, priceRs: true },
  });

  const priced = lines
    .map((line) => {
      const variant = variants.find((v) => v.id === line.variantId);
      return variant ? { unitPriceRs: variant.priceRs, quantity: line.quantity } : null;
    })
    .filter((line): line is { unitPriceRs: number; quantity: number } => line !== null);

  const subtotalRs = priced.reduce((sum, l) => sum + l.unitPriceRs * l.quantity, 0);

  let discountRs = 0;
  let couponError: string | null = null;
  if (couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon) {
      couponError = 'Code not recognised.';
    } else {
      const check = evaluateCoupon(
        {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minSubtotalRs: coupon.minSubtotalRs,
          maxRedemptions: coupon.maxRedemptions,
          timesRedeemed: coupon.timesRedeemed,
          startsAt: coupon.startsAt,
          endsAt: coupon.endsAt,
          isActive: coupon.isActive,
        },
        subtotalRs,
      );
      if (check.ok) discountRs = check.discountRs;
      else couponError = 'That code cannot be applied to this basket.';
    }
  }

  const zone =
    province && city
      ? await db.deliveryZone.findFirst({ where: { province, city, isActive: true } })
      : null;

  const totals = computeTotals(priced, {
    discountRs,
    shipping: zone ? { feeRs: zone.feeRs, freeOverRs: zone.freeOverRs } : undefined,
  });

  return NextResponse.json({
    ...totals,
    shippingKnown: Boolean(zone),
    codAvailable: zone?.codAvailable ?? null,
    estimateDays: zone?.estimateDays ?? null,
    couponError,
    freeDeliveryOverRs: zone?.freeOverRs ?? null,
    amountToFreeDeliveryRs:
      zone?.freeOverRs != null
        ? Math.max(roundRs(zone.freeOverRs - (totals.subtotalRs - totals.discountRs)), 0)
        : null,
  });
}
