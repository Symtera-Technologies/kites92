'use client';

import { useState } from 'react';
import { useCart } from '@/lib/commerce/cart';
import { formatPkr } from '@/lib/commerce/money';
import { cn } from '@/lib/utils';
import { ProductKitePreview } from './ProductKitePreview';

export interface BuyVariant {
  id: string;
  sku: string;
  label: string;
  colorName: string | null;
  colorHex: string | null;
  sizeLabel: string | null;
  priceRs: number;
  stock: number;
}

interface ProductBuyProps {
  productId: string;
  slug: string;
  name: string;
  variants: BuyVariant[];
  images: { url: string; alt: string }[];
  isBundle: boolean;
}

/**
 * Variant selection and add-to-cart.
 *
 * Price, stock and the 3D preview all key off the selected variant, because
 * the variant is the thing actually being bought. Showing a product-level
 * price next to a variant picker is how shops end up advertising a price the
 * customer cannot get.
 */
export function ProductBuy({
  productId,
  slug,
  name,
  variants,
  images,
  isBundle,
}: ProductBuyProps) {
  const add = useCart((state) => state.add);

  // Default to the first variant that is actually purchasable.
  const [selectedId, setSelectedId] = useState(
    () => (variants.find((v) => v.stock > 0) ?? variants[0])?.id,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  if (!selected) {
    return (
      <p className="rounded-2xl border border-navy-900/15 bg-cream-300 p-5 text-sm text-navy-900/65">
        This product has no purchasable options at the moment.
      </p>
    );
  }

  const soldOut = selected.stock <= 0;
  const maxQuantity = Math.max(selected.stock, 0);

  const handleAdd = () => {
    if (soldOut) return;
    add(
      {
        variantId: selected.id,
        productId,
        slug,
        name,
        variantLabel: selected.label,
        priceRs: selected.priceRs,
        imageUrl: images[0]?.url,
        imageAlt: images[0]?.alt,
        maxStock: selected.stock,
      },
      quantity,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  const topColor = selected.colorHex ?? '#FFC928';
  const bottomColor = isBundle ? '#673AB7' : '#FF3D85';

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* ── Visual ── */}
      <div>
        <div className="aspect-square overflow-hidden rounded-3xl border border-navy-900/10 bg-gradient-to-br from-cream-300 to-cream">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0].url} alt={images[0].alt} className="h-full w-full object-cover" />
          ) : (
            <ProductKitePreview
              topColor={topColor}
              bottomColor={bottomColor}
              label={`${name} in ${selected.colorName ?? 'the selected colour'}`}
            />
          )}
        </div>

        {images.length === 0 && (
          // Said plainly. A 3D model is not a photograph and the customer
          // should not have to work that out for themselves.
          <p className="mt-2.5 text-center text-xs text-navy-900/50">
            3D illustration showing shape and colour — not a photograph of the item.
          </p>
        )}

        {images.length > 1 && (
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {images.slice(1, 5).map((image) => (
              <li key={image.url} className="overflow-hidden rounded-xl border border-navy-900/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt} className="aspect-square w-full object-cover" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Buy box ── */}
      <div>
        <div className="flex items-baseline gap-3">
          <span className="tnum font-display text-4xl font-extrabold text-navy-900">
            {formatPkr(selected.priceRs)}
          </span>
        </div>

        {variants.length > 1 && (
          <fieldset className="mt-7">
            <legend className="mb-2.5 text-xs font-bold uppercase tracking-wider text-navy-900/55">
              Choose an option
            </legend>
            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => {
                const active = variant.id === selected.id;
                const out = variant.stock <= 0;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(variant.id);
                      // A quantity valid for the old variant may exceed the new
                      // one's stock.
                      setQuantity((q) => Math.min(q, Math.max(variant.stock, 1)));
                    }}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all',
                      active
                        ? 'border-royal bg-royal/10 text-royal'
                        : 'border-navy-900/15 hover:border-navy-900/35',
                      out && 'opacity-45',
                    )}
                  >
                    {variant.colorHex && (
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 rounded-full border border-navy-900/20"
                        style={{ background: variant.colorHex }}
                      />
                    )}
                    {variant.label}
                    {out && <span className="text-xs font-normal">(sold out)</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <p className="mt-5 text-sm">
          {soldOut ? (
            <span className="font-semibold text-vibrant">Sold out</span>
          ) : selected.stock <= 5 ? (
            <span className="font-semibold text-festival-600">
              Only {selected.stock} left in stock
            </span>
          ) : (
            <span className="font-semibold text-emerald-700">In stock</span>
          )}
          <span className="ml-2 text-navy-900/40">SKU {selected.sku}</span>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-navy-900/20">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="px-4 py-3 text-lg leading-none text-navy-900/70 hover:text-navy-900 disabled:opacity-35"
            >
              −
            </button>
            <span className="tnum min-w-10 text-center font-bold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
              disabled={quantity >= maxQuantity}
              aria-label="Increase quantity"
              className="px-4 py-3 text-lg leading-none text-navy-900/70 hover:text-navy-900 disabled:opacity-35"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className="btn-primary flex-1 py-4"
          >
            {added ? 'Added to basket ✓' : soldOut ? 'Sold out' : 'Add to Basket'}
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-navy-900/55">
          Delivery charges depend on your city and are shown at checkout. Cash on
          delivery is available in supported areas.
        </p>
      </div>
    </div>
  );
}
