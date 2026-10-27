import Link from 'next/link';
import { db } from '@/lib/db';
import { formatPkr } from '@/lib/commerce/money';
import { Notice } from '@/components/admin/Notice';
import { toggleProductStatus, updateVariant } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Products' };

/**
 * The season view of the catalogue.
 *
 * Price and stock are the two fields that change constantly during a season,
 * so they are editable inline, one form per variant — this screen exists to
 * be worked down in one sitting. Everything else about a product lives in the
 * editor at `/admin/products/[id]`.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;

  const products = await db.product.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      isBundle: true,
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true, alt: true } },
      variants: {
        orderBy: { priceRs: 'asc' },
        select: { id: true, sku: true, label: true, priceRs: true, stock: true, isActive: true },
      },
    },
  });

  const withoutPhotos = products.filter((product) => product.images.length === 0).length;

  const field =
    'tnum w-24 rounded-lg border border-navy-900/15 bg-white px-2.5 py-1.5 text-sm focus:border-royal focus:outline-none';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold">Products</h1>
        <div className="flex items-center gap-4">
          <p className="tnum text-sm text-navy-900/55">{products.length} products</p>
          <Link
            href="/admin/products/new"
            className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream hover:bg-navy-800"
          >
            New product
          </Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-navy-900/60">
        Edit price and stock inline. Changes take effect on the storefront immediately. Open a
        product to change its name, photographs, variants or description.
      </p>

      {withoutPhotos > 0 && (
        <p className="mt-2 text-sm font-semibold text-festival-600">
          {withoutPhotos} of {products.length} have no photograph, so their pages are showing the
          3D illustration instead.
        </p>
      )}

      <Notice code={notice} dismissTo="/admin/products" />

      <ul className="mt-6 space-y-4">
        {products.map((product) => (
          <li key={product.id} className="rounded-2xl border border-navy-900/10 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-navy-900/10 px-5 py-3.5">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-navy-900/5">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded media, served unoptimised from /api/media
                  <img
                    src={product.images[0].url}
                    alt={product.images[0].alt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-full w-full items-center justify-center text-[0.6rem] font-bold uppercase tracking-wider text-navy-900/30"
                  >
                    3D
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h2 className="font-display text-base font-bold">
                  <Link href={`/admin/products/${product.id}`} className="hover:text-royal">
                    {product.name}
                  </Link>
                </h2>
                <p className="text-xs text-navy-900/50">
                  {product.category?.name ?? 'Uncategorised'}
                  {product.isBundle && ' · Bundle'}
                  {' · '}
                  <Link
                    href={`/product/${product.slug}`}
                    target="_blank"
                    className="hover:text-royal hover:underline"
                  >
                    view ↗
                  </Link>
                </p>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="rounded-full border border-navy-900/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-navy-900/70 hover:border-navy-900/35 hover:text-navy-900"
                >
                  Edit
                </Link>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${
                    product.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-navy-900/10 text-navy-900/60'
                  }`}
                >
                  {product.status.toLowerCase()}
                </span>
                <form action={toggleProductStatus}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-navy-900/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-navy-900/70 hover:border-navy-900/35 hover:text-navy-900"
                  >
                    {product.status === 'ACTIVE' ? 'Unpublish' : 'Publish'}
                  </button>
                </form>
              </div>
            </div>

            {product.variants.length === 0 ? (
              <p className="px-5 py-4 text-sm text-navy-900/55">
                No variants — this product cannot be bought until one is added.
              </p>
            ) : (
              <ul className="divide-y divide-navy-900/8">
                {product.variants.map((variant) => (
                  <li key={variant.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-44 flex-1">
                      <span className="block text-sm font-medium">{variant.label}</span>
                      <span className="block font-mono text-xs text-navy-900/45">
                        {variant.sku}
                      </span>
                    </div>

                    <form action={updateVariant} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="variantId" value={variant.id} />

                      <div>
                        <label
                          htmlFor={`price-${variant.id}`}
                          className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wider text-navy-900/50"
                        >
                          Price (Rs)
                        </label>
                        <input
                          id={`price-${variant.id}`}
                          name="priceRs"
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={variant.priceRs}
                          className={field}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`stock-${variant.id}`}
                          className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wider text-navy-900/50"
                        >
                          Stock
                        </label>
                        <input
                          id={`stock-${variant.id}`}
                          name="stock"
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={variant.stock}
                          className={field}
                        />
                      </div>

                      <button
                        type="submit"
                        className="rounded-lg bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-cream hover:bg-navy-800"
                      >
                        Save
                      </button>
                    </form>

                    <span
                      className={`tnum shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        variant.stock === 0
                          ? 'bg-vibrant/15 text-vibrant-600'
                          : variant.stock <= 5
                            ? 'bg-festival/15 text-festival-600'
                            : 'bg-navy-900/5 text-navy-900/55'
                      }`}
                    >
                      {variant.stock === 0 ? 'Sold out' : `${variant.stock} in stock`}
                    </span>

                    <span className="tnum shrink-0 text-sm font-bold">
                      {formatPkr(variant.priceRs)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
