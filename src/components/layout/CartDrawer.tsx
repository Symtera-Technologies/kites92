'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { cartSubtotalRs, useCart } from '@/lib/commerce/cart';
import { formatPkr } from '@/lib/commerce/money';
import { KiteMotif } from '@/components/ui/KiteMotif';

/**
 * Slide-over cart.
 *
 * Implemented as a focus-trapping modal rather than a styled panel: it covers
 * the page and takes keyboard focus, so Escape must close it and Tab must not
 * wander into the inert page behind.
 */
export function CartDrawer() {
  const { lines, isOpen, close, setQuantity, remove } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const subtotal = cartSubtotalRs(lines);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    // Move focus into the drawer so a keyboard user is actually inside it.
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      // Wrap focus at both ends of the drawer.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default bg-navy-950/55 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-lift outline-none animate-drift-up"
      >
        <div className="flex items-center justify-between border-b border-navy-900/10 px-5 py-4">
          <h2 className="font-display text-lg font-bold">Your Basket</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="rounded-full p-2 text-navy-900/60 hover:bg-navy-900/5 hover:text-navy-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="h-28 w-28 opacity-50">
              <KiteMotif topColor="#FFC928" bottomColor="#39BDF8" />
            </div>
            <p className="font-display text-lg font-bold">Your basket is empty</p>
            <p className="text-sm text-navy-900/60">
              Pick a few guddas and some dor, and the sky is yours.
            </p>
            <Link href="/shop" onClick={close} className="btn-primary mt-2">
              Explore Kites
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-navy-900/8 overflow-y-auto px-5">
              {lines.map((line) => (
                <li key={line.variantId} className="flex gap-3 py-4">
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={close}
                    className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-cream-300 p-1.5"
                  >
                    {line.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.imageUrl} alt={line.imageAlt ?? line.name} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <KiteMotif />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/product/${line.slug}`}
                      onClick={close}
                      className="truncate text-sm font-semibold text-navy-900 hover:text-royal"
                    >
                      {line.name}
                    </Link>
                    {line.variantLabel && (
                      <p className="truncate text-xs text-navy-900/55">{line.variantLabel}</p>
                    )}
                    <p className="tnum mt-0.5 text-sm font-bold">{formatPkr(line.priceRs)}</p>

                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <div className="flex items-center rounded-full border border-navy-900/15">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                          aria-label={`Decrease quantity of ${line.name}`}
                          className="px-2.5 py-1 text-navy-900/70 hover:text-navy-900"
                        >
                          −
                        </button>
                        <span className="tnum min-w-7 text-center text-sm font-semibold">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                          disabled={line.quantity >= line.maxStock}
                          aria-label={`Increase quantity of ${line.name}`}
                          className="px-2.5 py-1 text-navy-900/70 hover:text-navy-900 disabled:opacity-35"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.variantId)}
                        className="text-xs font-semibold text-navy-900/45 underline-offset-2 hover:text-vibrant hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-navy-900/10 bg-white px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-navy-900/65">Subtotal</span>
                <span className="tnum font-display text-xl font-bold">{formatPkr(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-navy-900/50">
                Delivery is calculated at checkout, based on your city.
              </p>
              <Link href="/checkout" onClick={close} className="btn-primary mt-3 w-full">
                Checkout
              </Link>
              <Link
                href="/cart"
                onClick={close}
                className="mt-2 block text-center text-xs font-semibold text-navy-900/60 hover:text-navy-900"
              >
                View full basket
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
