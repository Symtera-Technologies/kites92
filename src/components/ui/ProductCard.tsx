'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatPkr } from '@/lib/commerce/money';
import { useCart } from '@/lib/commerce/cart';
import { cn } from '@/lib/utils';
import { KiteMotif } from './KiteMotif';

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  nameUrdu?: string | null;
  tagline?: string | null;
  basePriceRs: number;
  comparePriceRs?: number | null;
  isBundle?: boolean;
  tawaSize?: number | null;
  images: { url: string; alt: string }[];
  variants: { id: string; priceRs: number; stock: number; colorHex?: string | null }[];
  category?: { slug: string; name: string } | null;
}

/**
 * Storefront product card.
 *
 * Stock is derived from the variants rather than stored on the product, so the
 * badge always matches what can actually be bought. "Add to cart" is only
 * offered when exactly one variant exists — with several, the choice belongs
 * on the product page rather than being guessed here.
 */
export function ProductCard({
  product,
  className,
}: {
  product: ProductCardData;
  className?: string;
}) {
  const add = useCart((state) => state.add);
  const [justAdded, setJustAdded] = useState(false);

  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const soldOut = totalStock <= 0;
  const lowStock = !soldOut && totalStock <= 5;

  // Lowest active variant price, which is what "from" should mean.
  const fromPrice = product.variants.length
    ? Math.min(...product.variants.map((v) => v.priceRs))
    : product.basePriceRs;
  const hasRange = product.variants.length > 1;

  const onSale =
    product.comparePriceRs != null && product.comparePriceRs > fromPrice;
  const discountPercent = onSale
    ? Math.round(((product.comparePriceRs! - fromPrice) / product.comparePriceRs!) * 100)
    : 0;

  const image = product.images[0];
  const swatch = product.variants.find((v) => v.colorHex)?.colorHex ?? undefined;
  const singleVariant = product.variants.length === 1 ? product.variants[0] : null;

  const handleAdd = () => {
    if (!singleVariant || singleVariant.stock <= 0) return;
    add({
      variantId: singleVariant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel: '',
      priceRs: singleVariant.priceRs,
      imageUrl: image?.url,
      imageAlt: image?.alt,
      maxStock: singleVariant.stock,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-navy-900/10 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift',
        className,
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-cream-300"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- product images
          // are uploaded through the admin at arbitrary sizes and served from
          // /api/media; next/image adds no value here and needs sharp, which
          // shared cPanel often lacks.
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-7 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
            <KiteMotif
              topColor={swatch ?? '#FFC928'}
              bottomColor={product.isBundle ? '#673AB7' : '#FF3D85'}
              label={`${product.name} — illustration`}
            />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.isBundle && (
            <span className="rounded-full bg-royal px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-cream">
              Bundle
            </span>
          )}
          {onSale && (
            <span className="rounded-full bg-vibrant px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-cream">
              {discountPercent}% off
            </span>
          )}
          {product.tawaSize != null && (
            <span className="rounded-full bg-navy-900/80 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-cream">
              {product.tawaSize} Tawa
            </span>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-900/55">
            <span className="rounded-full bg-cream px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy-900">
              Sold out
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-navy-900/45">
            {product.category.name}
          </p>
        )}

        <h3 className="mt-1 font-display text-base font-bold leading-snug text-navy-900">
          <Link href={`/product/${product.slug}`} className="hover:text-royal">
            {product.name}
          </Link>
        </h3>

        {product.nameUrdu && (
          <p className="mt-0.5 font-urdu text-sm text-navy-900/55" dir="rtl" lang="ur">
            {product.nameUrdu}
          </p>
        )}

        {product.tagline && (
          <p className="mt-1 line-clamp-2 text-sm text-navy-900/60">{product.tagline}</p>
        )}

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="tnum font-display text-lg font-bold text-navy-900">
              {hasRange && 'From '}
              {formatPkr(fromPrice)}
            </span>
            {onSale && (
              <span className="tnum text-sm text-navy-900/40 line-through">
                {formatPkr(product.comparePriceRs!)}
              </span>
            )}
          </div>

          {lowStock && (
            <p className="mt-1 text-xs font-semibold text-festival-600">
              Only {totalStock} left
            </p>
          )}

          <div className="mt-3">
            {singleVariant ? (
              <button
                type="button"
                onClick={handleAdd}
                disabled={soldOut}
                className="btn-primary w-full py-2.5 text-xs"
              >
                {justAdded ? 'Added to cart' : soldOut ? 'Sold out' : 'Add to cart'}
              </button>
            ) : (
              <Link
                href={`/product/${product.slug}`}
                className="btn-ghost w-full py-2.5 text-xs"
              >
                {soldOut ? 'View options' : 'Choose options'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
