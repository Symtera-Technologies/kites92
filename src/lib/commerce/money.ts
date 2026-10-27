/**
 * Money handling for Kites92.
 *
 * Every amount in this codebase is an integer number of whole Pakistani Rupees.
 * This module is the ONLY place permitted to turn a fraction into a rupee
 * figure, so rounding policy lives in exactly one spot.
 */

/** Round half-up to a whole rupee. Negative inputs round away from zero. */
export function roundRs(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return amount < 0 ? -Math.round(-amount) : Math.round(amount);
}

/**
 * Group digits in threes without `Intl`.
 *
 * Deliberately manual: `toLocaleString` resolves against the host's ICU data,
 * which differs between the Node server and the browser. That mismatch
 * produces React hydration errors on price text, so formatting must be
 * byte-identical on both sides.
 */
function groupDigits(whole: number): string {
  const s = Math.abs(whole).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return out;
}

/** Format whole rupees for display, e.g. 38999 -> "Rs. 38,999". */
export function formatPkr(rs: number): string {
  const n = roundRs(rs);
  return `${n < 0 ? '-' : ''}Rs. ${groupDigits(n)}`;
}

/** Compact form for dense 3D labels, e.g. 38999 -> "Rs. 39k". */
export function formatPkrCompact(rs: number): string {
  const n = roundRs(rs);
  const abs = Math.abs(n);
  if (abs < 10_000) return formatPkr(n);
  return `${n < 0 ? '-' : ''}Rs. ${Math.round(abs / 1000)}k`;
}

export type DiscountType = 'PERCENT' | 'FIXED';

export interface CouponRule {
  code: string;
  type: DiscountType;
  /** Percent (1-100) when type is PERCENT, otherwise whole rupees off. */
  value: number;
  minSubtotalRs?: number | null;
  maxRedemptions?: number | null;
  timesRedeemed?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive?: boolean;
}

export type CouponRejection =
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'exhausted'
  | 'below_minimum';

export interface CouponCheck {
  ok: boolean;
  discountRs: number;
  reason?: CouponRejection;
}

/**
 * Validate a coupon against a subtotal and return the rupee discount.
 *
 * The discount can never exceed the subtotal — a fixed-value coupon larger
 * than the cart must not produce a negative total or a refund.
 */
export function evaluateCoupon(
  coupon: CouponRule,
  subtotalRs: number,
  now: Date = new Date(),
): CouponCheck {
  if (coupon.isActive === false) return { ok: false, discountRs: 0, reason: 'inactive' };
  if (coupon.startsAt && now < coupon.startsAt)
    return { ok: false, discountRs: 0, reason: 'not_started' };
  if (coupon.endsAt && now > coupon.endsAt)
    return { ok: false, discountRs: 0, reason: 'expired' };
  if (
    coupon.maxRedemptions != null &&
    (coupon.timesRedeemed ?? 0) >= coupon.maxRedemptions
  )
    return { ok: false, discountRs: 0, reason: 'exhausted' };
  if (coupon.minSubtotalRs != null && subtotalRs < coupon.minSubtotalRs)
    return { ok: false, discountRs: 0, reason: 'below_minimum' };

  const raw =
    coupon.type === 'PERCENT'
      ? (subtotalRs * Math.min(Math.max(coupon.value, 0), 100)) / 100
      : coupon.value;

  return { ok: true, discountRs: Math.min(roundRs(raw), subtotalRs) };
}

export interface ShippingRule {
  feeRs: number;
  /** Subtotal at or above which delivery is free. Null disables the waiver. */
  freeOverRs?: number | null;
}

/** Delivery fee after any free-over-threshold waiver. */
export function shippingFor(rule: ShippingRule, subtotalRs: number): number {
  if (rule.freeOverRs != null && subtotalRs >= rule.freeOverRs) return 0;
  return roundRs(rule.feeRs);
}

export interface CartLine {
  unitPriceRs: number;
  quantity: number;
}

export interface OrderTotals {
  subtotalRs: number;
  discountRs: number;
  shippingRs: number;
  totalRs: number;
  /** The 50% advance many Pakistani kite sellers take to confirm an order. */
  advanceDueRs: number;
}

/**
 * Compute order totals.
 *
 * Shipping is charged on the post-discount subtotal, and the free-delivery
 * threshold is tested against that same figure, so a coupon cannot
 * accidentally unlock free delivery the cart no longer qualifies for.
 */
export function computeTotals(
  lines: CartLine[],
  options: { discountRs?: number; shipping?: ShippingRule; advancePercent?: number } = {},
): OrderTotals {
  const subtotalRs = roundRs(
    lines.reduce((sum, l) => sum + l.unitPriceRs * Math.max(0, Math.trunc(l.quantity)), 0),
  );

  const discountRs = Math.min(roundRs(options.discountRs ?? 0), subtotalRs);
  const discounted = subtotalRs - discountRs;
  const shippingRs = options.shipping ? shippingFor(options.shipping, discounted) : 0;
  const totalRs = discounted + shippingRs;
  const pct = options.advancePercent ?? 50;

  return {
    subtotalRs,
    discountRs,
    shippingRs,
    totalRs,
    advanceDueRs: roundRs((totalRs * Math.min(Math.max(pct, 0), 100)) / 100),
  };
}
