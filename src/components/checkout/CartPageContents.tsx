'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cartSubtotalRs, useCart } from '@/lib/commerce/cart';
import { formatPkr } from '@/lib/commerce/money';
import { KiteMotif } from '@/components/ui/KiteMotif';

/**
 * Full-page basket.
 *
 * The cart lives in localStorage, so nothing can be rendered until the client
 * has mounted — rendering it during SSR would produce markup that disagrees
 * with the browser's stored cart and trip a hydration error.
 */
export function CartPageContents() {
  const { lines, setQuantity, remove, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-80 animate-pulse rounded-3xl bg-navy-900/5" aria-hidden />;
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-navy-900/20 px-6 py-24 text-center">
        <div className="mx-auto h-32 w-32 opacity-45">
          <KiteMotif topColor="#FFC928" bottomColor="#39BDF8" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold">Your basket is empty</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-navy-900/60">
          Pick a few guddas, some dor and a charkhi, and the sky is yours.
        </p>
        <Link href="/shop" className="btn-primary mt-6">Explore Kites</Link>
      </div>
    );
  }

  const subtotal = cartSubtotalRs(lines);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        <ul className="divide-y divide-navy-900/10 rounded-3xl border border-navy-900/10 bg-white">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 p-4">
              <Link
                href={`/product/${line.slug}`}
                className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-cream-300 p-2"
              >
                {line.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.imageUrl} alt={line.imageAlt ?? line.name} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <KiteMotif />
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/product/${line.slug}`} className="font-display font-bold hover:text-royal">
                  {line.name}
                </Link>
                {line.variantLabel && (
                  <p className="text-sm text-navy-900/55">{line.variantLabel}</p>
                )}
                <p className="tnum mt-1 text-sm font-semibold">{formatPkr(line.priceRs)} each</p>

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
                  <div className="flex items-center rounded-full border border-navy-900/20">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                      aria-label={`Decrease quantity of ${line.name}`}
                      className="px-3.5 py-2 text-navy-900/70 hover:text-navy-900"
                    >
                      −
                    </button>
                    <span className="tnum min-w-8 text-center text-sm font-bold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                      disabled={line.quantity >= line.maxStock}
                      aria-label={`Increase quantity of ${line.name}`}
                      className="px-3.5 py-2 text-navy-900/70 hover:text-navy-900 disabled:opacity-35"
                    >
                      +
                    </button>
                  </div>

                  {line.quantity >= line.maxStock && (
                    <span className="text-xs font-semibold text-festival-600">
                      Max stock reached
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => remove(line.variantId)}
                    className="text-xs font-semibold text-navy-900/45 underline-offset-2 hover:text-vibrant hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <p className="tnum shrink-0 font-display text-lg font-bold">
                {formatPkr(line.priceRs * line.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between">
          <Link href="/shop" className="text-sm font-semibold text-navy-900/65 hover:text-navy-900">
            ← Continue shopping
          </Link>
          <button
            type="button"
            onClick={clear}
            className="text-sm font-semibold text-navy-900/45 hover:text-vibrant"
          >
            Clear basket
          </button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:self-start">
        <div className="rounded-3xl border border-navy-900/10 bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Summary</h2>
          <div className="mt-4 flex justify-between border-t border-navy-900/10 pt-4">
            <span className="text-navy-900/60">Subtotal</span>
            <span className="tnum font-display text-xl font-bold">{formatPkr(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-navy-900/50">
            Delivery and any discount are calculated at checkout, once you choose your city.
          </p>
          <Link href="/checkout" className="btn-primary mt-4 w-full">
            Proceed to Checkout
          </Link>
        </div>
      </aside>
    </div>
  );
}
