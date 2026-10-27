'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/lib/commerce/cart';
import { formatPkr } from '@/lib/commerce/money';
import { cn, whatsappLink } from '@/lib/utils';

export interface Zone {
  id: string;
  province: string;
  city: string;
  feeRs: number;
  freeOverRs: number | null;
  codAvailable: boolean;
  estimateDays: string | null;
}

interface Quote {
  subtotalRs: number;
  discountRs: number;
  shippingRs: number;
  totalRs: number;
  advanceDueRs: number;
  shippingKnown: boolean;
  codAvailable: boolean | null;
  estimateDays: string | null;
  couponError: string | null;
  amountToFreeDeliveryRs: number | null;
}

interface CheckoutFormProps {
  zones: Zone[];
  bankDetails: { bankName: string; accountTitle: string; accountNumber: string; instructions: string };
  whatsappNumber: string;
  advancePercent: number;
}

/**
 * Checkout.
 *
 * Totals are never computed in the browser. Every change to the basket, city
 * or coupon re-quotes against the server, which is the same code path that
 * prices the real order — so the figure shown here cannot drift from the
 * figure charged.
 */
export function CheckoutForm({
  zones,
  bankDetails,
  whatsappNumber,
  advancePercent,
}: CheckoutFormProps) {
  const router = useRouter();
  const lines = useCart((state) => state.lines);
  const clear = useCart((state) => state.clear);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const provinces = useMemo(
    () => [...new Set(zones.map((zone) => zone.province))].sort(),
    [zones],
  );

  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    area: '',
    line1: '',
    line2: '',
    postalCode: '',
    customerNote: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const [quote, setQuote] = useState<Quote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);

  const cities = useMemo(
    () => zones.filter((zone) => zone.province === province).map((zone) => zone.city).sort(),
    [zones, province],
  );

  // Re-quote whenever anything that affects the price changes.
  useEffect(() => {
    if (!mounted || lines.length === 0) return;

    const controller = new AbortController();
    const payload = {
      lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      province: province || undefined,
      city: city || undefined,
      couponCode: appliedCoupon || undefined,
    };

    fetch('/api/checkout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setQuote(data))
      .catch((caught) => {
        // An aborted request is the expected outcome of a fast edit, not a bug.
        if ((caught as Error).name !== 'AbortError') {
          console.error('[checkout] quote failed', caught);
        }
      });

    return () => controller.abort();
  }, [mounted, lines, province, city, appliedCoupon]);

  const selectedZone = zones.find((zone) => zone.province === province && zone.city === city);
  const codBlocked = selectedZone ? !selectedZone.codAvailable : false;

  // Fall back off COD automatically where the zone does not support it.
  useEffect(() => {
    if (codBlocked && paymentMethod === 'COD') setPaymentMethod('BANK_TRANSFER');
  }, [codBlocked, paymentMethod]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
          customer: { name: form.name, phone: form.phone, email: form.email },
          address: {
            province,
            city,
            area: form.area,
            line1: form.line1,
            line2: form.line2,
            postalCode: form.postalCode,
          },
          paymentMethod,
          couponCode: appliedCoupon,
          customerNote: form.customerNote,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        if (Array.isArray(data.issues)) {
          setFieldErrors(
            Object.fromEntries(
              data.issues.map((issue: { path: string; message: string }) => [
                issue.path.split('.').pop(),
                issue.message,
              ]),
            ),
          );
        }
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // The order exists on the server now; the local basket has done its job.
      clear();
      router.push(`/order/${data.trackingToken}`);
    } catch {
      setError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return <div className="h-96 animate-pulse rounded-3xl bg-navy-900/5" aria-hidden />;
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-navy-900/20 px-6 py-20 text-center">
        <h2 className="font-display text-xl font-bold">Your basket is empty</h2>
        <p className="mt-2 text-sm text-navy-900/60">Add some kites before checking out.</p>
        <Link href="/shop" className="btn-primary mt-5">Explore Kites</Link>
      </div>
    );
  }

  const field =
    'w-full rounded-xl border border-navy-900/15 bg-white px-3.5 py-3 text-sm focus:border-royal focus:outline-none';
  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy-900/55';

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_22rem]" noValidate>
      <div className="space-y-8">
        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="rounded-2xl border border-vibrant/40 bg-vibrant/10 p-4 text-sm font-medium text-vibrant-600"
          >
            {error}
          </div>
        )}

        {/* ── Contact ── */}
        <fieldset className="rounded-3xl border border-navy-900/10 bg-white p-5">
          <legend className="px-2 font-display text-lg font-bold">Your details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className={labelClass}>Full name</label>
              <input
                id="name" required autoComplete="name" className={field}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-vibrant-600">{fieldErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Mobile number</label>
              <input
                id="phone" required inputMode="tel" autoComplete="tel" placeholder="0300 1234567"
                className={field}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone ? (
                <p className="mt-1 text-xs text-vibrant-600">{fieldErrors.phone}</p>
              ) : (
                <p className="mt-1 text-xs text-navy-900/45">We confirm every order on WhatsApp.</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email (optional)</label>
              <input
                id="email" type="email" autoComplete="email" className={field}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
        </fieldset>

        {/* ── Delivery ── */}
        <fieldset className="rounded-3xl border border-navy-900/10 bg-white p-5">
          <legend className="px-2 font-display text-lg font-bold">Delivery address</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="province" className={labelClass}>Province</label>
              <select
                id="province" required className={field} value={province}
                onChange={(e) => { setProvince(e.target.value); setCity(''); }}
              >
                <option value="">Select province</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>City</label>
              <select
                id="city" required className={field} value={city} disabled={!province}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">{province ? 'Select city' : 'Select province first'}</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="mt-1 text-xs text-navy-900/45">
                Only cities we deliver to are listed.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="line1" className={labelClass}>Street address</label>
              <input
                id="line1" required autoComplete="address-line1" className={field}
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                aria-invalid={Boolean(fieldErrors.line1)}
              />
              {fieldErrors.line1 && <p className="mt-1 text-xs text-vibrant-600">{fieldErrors.line1}</p>}
            </div>
            <div>
              <label htmlFor="area" className={labelClass}>Area / sector (optional)</label>
              <input
                id="area" className={field} placeholder="e.g. Johar Town, Block H"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="postalCode" className={labelClass}>Postal code (optional)</label>
              <input
                id="postalCode" autoComplete="postal-code" className={field}
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="customerNote" className={labelClass}>Delivery note (optional)</label>
              <textarea
                id="customerNote" rows={2} className={field}
                placeholder="Landmark, preferred delivery time, anything else"
                value={form.customerNote}
                onChange={(e) => setForm({ ...form, customerNote: e.target.value })}
              />
            </div>
          </div>
        </fieldset>

        {/* ── Payment ── */}
        <fieldset className="rounded-3xl border border-navy-900/10 bg-white p-5">
          <legend className="px-2 font-display text-lg font-bold">Payment</legend>
          <div className="space-y-3">
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                paymentMethod === 'COD' ? 'border-royal bg-royal/5' : 'border-navy-900/15',
                codBlocked && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio" name="payment" value="COD" className="mt-1"
                checked={paymentMethod === 'COD'} disabled={codBlocked}
                onChange={() => setPaymentMethod('COD')}
              />
              <span>
                <span className="block text-sm font-bold">Cash on Delivery</span>
                <span className="mt-0.5 block text-xs text-navy-900/60">
                  {codBlocked
                    ? `Not available for ${city}. Please use bank transfer.`
                    : 'Pay the courier when your order arrives.'}
                </span>
              </span>
            </label>

            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                paymentMethod === 'BANK_TRANSFER' ? 'border-royal bg-royal/5' : 'border-navy-900/15',
              )}
            >
              <input
                type="radio" name="payment" value="BANK_TRANSFER" className="mt-1"
                checked={paymentMethod === 'BANK_TRANSFER'}
                onChange={() => setPaymentMethod('BANK_TRANSFER')}
              />
              <span>
                <span className="block text-sm font-bold">Bank Transfer</span>
                <span className="mt-0.5 block text-xs text-navy-900/60">
                  Send {advancePercent}% in advance and share the receipt on WhatsApp to
                  confirm your order.
                </span>
              </span>
            </label>
          </div>

          {paymentMethod === 'BANK_TRANSFER' && (
            <div className="mt-4 rounded-2xl bg-cream-300 p-4 text-sm">
              <p className="font-bold">Bank details</p>
              <dl className="mt-2 space-y-1 text-navy-900/75">
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-navy-900/50">Bank</dt><dd>{bankDetails.bankName}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-navy-900/50">Title</dt><dd>{bankDetails.accountTitle}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-navy-900/50">Account</dt><dd className="tnum">{bankDetails.accountNumber}</dd></div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-navy-900/65">{bankDetails.instructions}</p>
            </div>
          )}
        </fieldset>
      </div>

      {/* ── Summary ── */}
      <aside className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:self-start">
        <div className="rounded-3xl border border-navy-900/10 bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Order summary</h2>

          <ul className="mt-4 space-y-3 border-b border-navy-900/10 pb-4">
            {lines.map((line) => (
              <li key={line.variantId} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{line.name}</span>
                  {line.variantLabel && (
                    <span className="block truncate text-xs text-navy-900/50">{line.variantLabel}</span>
                  )}
                  <span className="tnum text-xs text-navy-900/50">Qty {line.quantity}</span>
                </span>
                <span className="tnum shrink-0 font-semibold">
                  {formatPkr(line.priceRs * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <label htmlFor="coupon" className={labelClass}>Discount code</label>
            <div className="flex gap-2">
              <input
                id="coupon" className={field} value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="BASANT10"
              />
              <button
                type="button"
                onClick={() => setAppliedCoupon(couponCode.trim())}
                className="btn-ghost shrink-0 px-4 py-2 text-xs"
              >
                Apply
              </button>
            </div>
            {quote?.couponError && (
              <p className="mt-1 text-xs text-vibrant-600">{quote.couponError}</p>
            )}
          </div>

          <dl className="mt-5 space-y-2 border-t border-navy-900/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy-900/60">Subtotal</dt>
              <dd className="tnum font-semibold">{formatPkr(quote?.subtotalRs ?? 0)}</dd>
            </div>
            {(quote?.discountRs ?? 0) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Discount</dt>
                <dd className="tnum font-semibold">−{formatPkr(quote!.discountRs)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-navy-900/60">Delivery</dt>
              <dd className="tnum font-semibold">
                {!quote?.shippingKnown
                  ? <span className="text-xs font-normal text-navy-900/50">Select your city</span>
                  : quote.shippingRs === 0
                    ? <span className="text-emerald-700">Free</span>
                    : formatPkr(quote.shippingRs)}
              </dd>
            </div>
            {quote?.amountToFreeDeliveryRs != null && quote.amountToFreeDeliveryRs > 0 && (
              <p className="rounded-lg bg-basant/15 px-2.5 py-2 text-xs text-navy-900/75">
                Add {formatPkr(quote.amountToFreeDeliveryRs)} more for free delivery.
              </p>
            )}
            <div className="flex justify-between border-t border-navy-900/10 pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="tnum font-display text-xl font-extrabold">
                {formatPkr(quote?.totalRs ?? 0)}
              </dd>
            </div>
            {paymentMethod === 'BANK_TRANSFER' && quote && (
              <div className="flex justify-between text-sm text-royal">
                <dt className="font-semibold">Advance due now ({advancePercent}%)</dt>
                <dd className="tnum font-bold">{formatPkr(quote.advanceDueRs)}</dd>
              </div>
            )}
          </dl>

          {quote?.estimateDays && (
            <p className="mt-3 text-xs text-navy-900/55">
              Estimated delivery: {quote.estimateDays}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !city || lines.length === 0}
            className="btn-primary mt-5 w-full py-4"
          >
            {submitting ? 'Placing your order…' : 'Place Order'}
          </button>

          <p className="mt-3 text-center text-xs text-navy-900/50">
            Questions?{' '}
            <a
              href={whatsappLink(whatsappNumber, 'I need help with my Kites92 order.')}
              target="_blank" rel="noopener noreferrer"
              className="font-semibold text-royal hover:underline"
            >
              Message us on WhatsApp
            </a>
          </p>
        </div>
      </aside>
    </form>
  );
}
