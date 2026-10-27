// Acceptance checks for order maths (npm run test:commerce).
//
// These cover the functions that decide what a customer is charged. They are
// pure and need no database, which is exactly why they are worth pinning: a
// rounding or clamping mistake here is a real financial bug that no type
// checker and no amount of UI testing would catch.
import {
  roundRs,
  formatPkr,
  formatPkrCompact,
  evaluateCoupon,
  shippingFor,
  computeTotals,
} from '../src/lib/commerce/money.ts';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
};
const eq = (name, actual, expected) =>
  check(name, Object.is(actual, expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

// ── Rounding ──────────────────────────────────────────────────────────────
eq('roundRs: half rounds up', roundRs(0.5), 1);
eq('roundRs: 2.5 rounds up (not banker-rounded)', roundRs(2.5), 3);
eq('roundRs: negative rounds away from zero', roundRs(-2.5), -3);
eq('roundRs: NaN is 0, never NaN', roundRs(NaN), 0);
eq('roundRs: Infinity is 0', roundRs(Infinity), 0);

// ── Formatting must be deterministic (no Intl / locale) ───────────────────
eq('formatPkr: groups in threes', formatPkr(38999), 'Rs. 38,999');
eq('formatPkr: small values ungrouped', formatPkr(450), 'Rs. 450');
eq('formatPkr: zero', formatPkr(0), 'Rs. 0');
eq('formatPkr: millions', formatPkr(1234567), 'Rs. 1,234,567');
eq('formatPkr: negative', formatPkr(-500), '-Rs. 500');
eq('formatPkrCompact: below 10k is full', formatPkrCompact(9999), 'Rs. 9,999');
eq('formatPkrCompact: above 10k abbreviates', formatPkrCompact(38999), 'Rs. 39k');

// ── Coupons ───────────────────────────────────────────────────────────────
const pct10 = { code: 'BASANT10', type: 'PERCENT', value: 10, isActive: true };

eq('coupon: 10% of 5000', evaluateCoupon(pct10, 5000).discountRs, 500);
check('coupon: percent is applied', evaluateCoupon(pct10, 5000).ok === true);

// A fixed coupon larger than the basket must never exceed it — otherwise the
// total goes negative and we owe the customer money.
const big = { code: 'BIG', type: 'FIXED', value: 99999, isActive: true };
eq('coupon: fixed discount capped at subtotal', evaluateCoupon(big, 1200).discountRs, 1200);

// Nor may a >100% percentage.
const insane = { code: 'OOPS', type: 'PERCENT', value: 500, isActive: true };
eq('coupon: percent clamped to 100', evaluateCoupon(insane, 2000).discountRs, 2000);

const negative = { code: 'NEG', type: 'PERCENT', value: -50, isActive: true };
eq('coupon: negative percent cannot add money', evaluateCoupon(negative, 2000).discountRs, 0);

eq(
  'coupon: inactive rejected',
  evaluateCoupon({ ...pct10, isActive: false }, 5000).reason,
  'inactive',
);
eq(
  'coupon: below minimum rejected',
  evaluateCoupon({ ...pct10, minSubtotalRs: 6000 }, 5000).reason,
  'below_minimum',
);
eq(
  'coupon: exhausted rejected',
  evaluateCoupon({ ...pct10, maxRedemptions: 5, timesRedeemed: 5 }, 5000).reason,
  'exhausted',
);
eq(
  'coupon: expired rejected',
  evaluateCoupon({ ...pct10, endsAt: new Date('2020-01-01') }, 5000, new Date('2026-01-01')).reason,
  'expired',
);
eq(
  'coupon: not yet started rejected',
  evaluateCoupon({ ...pct10, startsAt: new Date('2030-01-01') }, 5000, new Date('2026-01-01')).reason,
  'not_started',
);
check(
  'coupon: unlimited redemptions allowed when max is null',
  evaluateCoupon({ ...pct10, maxRedemptions: null, timesRedeemed: 999 }, 5000).ok === true,
);

// ── Shipping ──────────────────────────────────────────────────────────────
eq('shipping: flat fee', shippingFor({ feeRs: 200, freeOverRs: 5000 }, 1000), 200);
eq('shipping: free at the threshold exactly', shippingFor({ feeRs: 200, freeOverRs: 5000 }, 5000), 0);
eq('shipping: free above threshold', shippingFor({ feeRs: 200, freeOverRs: 5000 }, 5001), 0);
eq('shipping: null threshold never waives', shippingFor({ feeRs: 200, freeOverRs: null }, 999999), 200);

// ── Totals ────────────────────────────────────────────────────────────────
const lines = [
  { unitPriceRs: 350, quantity: 3 }, // 1050
  { unitPriceRs: 1450, quantity: 1 }, // 1450
];

const plain = computeTotals(lines);
eq('totals: subtotal', plain.subtotalRs, 2500);
eq('totals: no shipping rule means no charge', plain.shippingRs, 0);
eq('totals: total', plain.totalRs, 2500);
eq('totals: default advance is 50%', plain.advanceDueRs, 1250);

const shipped = computeTotals(lines, { shipping: { feeRs: 200, freeOverRs: 5000 } });
eq('totals: shipping added below threshold', shipped.shippingRs, 200);
eq('totals: total includes shipping', shipped.totalRs, 2700);

// The free-delivery threshold is tested against the POST-discount subtotal,
// so a coupon cannot unlock free delivery the basket no longer qualifies for.
const nearThreshold = computeTotals([{ unitPriceRs: 5200, quantity: 1 }], {
  discountRs: 400,
  shipping: { feeRs: 200, freeOverRs: 5000 },
});
eq('totals: discount drops basket below free-delivery threshold', nearThreshold.shippingRs, 200);
eq('totals: discounted total', nearThreshold.totalRs, 5000);

const stillFree = computeTotals([{ unitPriceRs: 6000, quantity: 1 }], {
  discountRs: 400,
  shipping: { feeRs: 200, freeOverRs: 5000 },
});
eq('totals: still free when discounted subtotal clears threshold', stillFree.shippingRs, 0);

// Defensive inputs.
const weird = computeTotals([
  { unitPriceRs: 100, quantity: -5 },
  { unitPriceRs: 100, quantity: 2.7 },
]);
eq('totals: negative quantity contributes nothing', weird.subtotalRs, 200);

const overDiscount = computeTotals(lines, { discountRs: 999999 });
eq('totals: discount capped at subtotal', overDiscount.discountRs, 2500);
eq('totals: total never goes negative', overDiscount.totalRs, 0);

eq('totals: empty basket', computeTotals([]).totalRs, 0);

const advance30 = computeTotals(lines, { advancePercent: 30 });
eq('totals: custom advance percent', advance30.advanceDueRs, 750);

// An odd total must not produce a fractional advance.
const odd = computeTotals([{ unitPriceRs: 999, quantity: 1 }], { advancePercent: 50 });
eq('totals: advance rounds to whole rupees', odd.advanceDueRs, 500);
check('totals: advance is an integer', Number.isInteger(odd.advanceDueRs));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
