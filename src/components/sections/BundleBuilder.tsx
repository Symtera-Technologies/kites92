'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/lib/commerce/cart';
import { formatPkr } from '@/lib/commerce/money';
import { KiteMotif } from '@/components/ui/KiteMotif';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';
import type { ProductCardData } from '@/components/ui/ProductCard';

/**
 * Section E — build your own Basant bundle.
 *
 * This is a real cart operation, not a configurator that produces a quote. The
 * chosen items go into the same basket as any other purchase, at the same
 * per-variant prices, and are re-priced by the server at checkout like
 * everything else. There is no separate "bundle price" that could disagree
 * with what the items actually cost.
 */
export function BundleBuilder({ products }: { products: ProductCardData[] }) {
  const add = useCart((state) => state.add);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  // Only products with a purchasable variant can be offered.
  const selectable = useMemo(
    () =>
      products
        .map((product) => {
          const variant =
            product.variants.find((v) => v.stock > 0) ?? product.variants[0];
          return variant ? { product, variant } : null;
        })
        .filter((entry): entry is { product: ProductCardData; variant: ProductCardData['variants'][number] } => entry !== null),
    [products],
  );

  const chosen = selectable.filter((entry) => (quantities[entry.variant.id] ?? 0) > 0);

  const totalRs = chosen.reduce(
    (sum, entry) => sum + entry.variant.priceRs * (quantities[entry.variant.id] ?? 0),
    0,
  );
  const itemCount = chosen.reduce((sum, entry) => sum + (quantities[entry.variant.id] ?? 0), 0);

  const setQuantity = (variantId: string, next: number, maxStock: number) => {
    setQuantities((current) => ({
      ...current,
      [variantId]: Math.min(Math.max(next, 0), Math.max(maxStock, 0)),
    }));
    setAdded(false);
  };

  const addBundleToCart = () => {
    for (const entry of chosen) {
      add(
        {
          variantId: entry.variant.id,
          productId: entry.product.id,
          slug: entry.product.slug,
          name: entry.product.name,
          variantLabel: '',
          priceRs: entry.variant.priceRs,
          imageUrl: entry.product.images[0]?.url,
          imageAlt: entry.product.images[0]?.alt,
          maxStock: entry.variant.stock,
        },
        quantities[entry.variant.id] ?? 0,
      );
    }
    setQuantities({});
    setAdded(true);
  };

  if (selectable.length === 0) return null;

  return (
    <section className="bg-white py-20 sm:py-28" aria-labelledby="bundle-heading">
      <div className="shell">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-royal">
            Make it yours
          </p>
          <h2 id="bundle-heading" className="mt-3 text-display-sm">
            Build Your Basant Bundle
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-900/65">
            Pick your sizes, your dor and your charkhi. Everything goes into one
            basket at its normal price — no bundle markup.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {selectable.map(({ product, variant }) => {
              const quantity = quantities[variant.id] ?? 0;
              const soldOut = variant.stock <= 0;

              return (
                <li key={variant.id}>
                  <div
                    className={cn(
                      'flex h-full flex-col rounded-2xl border p-3 transition-all',
                      quantity > 0
                        ? 'border-royal bg-royal/5 shadow-card'
                        : 'border-navy-900/10 bg-white',
                      soldOut && 'opacity-45',
                    )}
                  >
                    <div
                      className={cn(
                        'mx-auto h-20 w-16 transition-transform duration-500',
                        quantity > 0 && 'rotate-[-8deg] scale-110',
                      )}
                    >
                      <KiteMotif
                        topColor={variant.colorHex ?? '#FFC928'}
                        bottomColor={product.isBundle ? '#673AB7' : '#FF3D85'}
                      />
                    </div>

                    <p className="mt-2 line-clamp-2 text-center text-xs font-bold leading-snug">
                      {product.name}
                    </p>
                    <p className="tnum mt-0.5 text-center text-xs text-navy-900/55">
                      {formatPkr(variant.priceRs)}
                    </p>

                    <div className="mt-2.5 flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={quantity <= 0}
                        onClick={() => setQuantity(variant.id, quantity - 1, variant.stock)}
                        aria-label={`Remove one ${product.name}`}
                        className="h-7 w-7 rounded-full border border-navy-900/15 text-sm leading-none text-navy-900/70 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="tnum w-6 text-center text-sm font-bold">{quantity}</span>
                      <button
                        type="button"
                        disabled={soldOut || quantity >= variant.stock}
                        onClick={() => setQuantity(variant.id, quantity + 1, variant.stock)}
                        aria-label={`Add one ${product.name}`}
                        className="h-7 w-7 rounded-full border border-navy-900/15 text-sm leading-none text-navy-900/70 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:self-start">
            <div className="rounded-3xl border border-navy-900/10 bg-cream p-5 shadow-card">
              <h3 className="font-display text-lg font-bold">Your bundle</h3>

              {chosen.length === 0 ? (
                <p className="mt-3 text-sm text-navy-900/55">
                  Nothing picked yet. Add a few kites, some dor and a charkhi.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 border-b border-navy-900/10 pb-3">
                  {chosen.map(({ product, variant }) => (
                    <li key={variant.id} className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {product.name}
                        <span className="tnum text-navy-900/45"> × {quantities[variant.id]}</span>
                      </span>
                      <span className="tnum shrink-0 font-semibold">
                        {formatPkr(variant.priceRs * (quantities[variant.id] ?? 0))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex items-baseline justify-between">
                <span className="tnum text-sm text-navy-900/60">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
                <span className="tnum font-display text-2xl font-extrabold">
                  {formatPkr(totalRs)}
                </span>
              </div>

              <button
                type="button"
                disabled={chosen.length === 0}
                onClick={addBundleToCart}
                className="btn-primary mt-4 w-full"
              >
                {added ? 'Added to basket ✓' : 'Add bundle to basket'}
              </button>

              <p className="mt-2.5 text-xs text-navy-900/50">
                Delivery is calculated at checkout once you pick your city.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
