import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductCard } from '@/components/ui/ProductCard';
import { ShopFilters } from '@/components/shop/ShopFilters';
import { Unavailable } from '@/components/ui/Unavailable';
import { getCategories, listProducts, type ProductFilters } from '@/lib/commerce/queries';

/**
 * Inventory and prices change, and stock must never be served stale from a
 * build-time snapshot. Rendering per request also keeps `next build` from
 * needing a database connection, which matters when deploying to cPanel where
 * the build may run somewhere the database is not reachable.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop Kites, Dor & Charkhi',
  description:
    'Browse traditional guddas by tawa size, designer kites, plain cotton dor, charkhi spools and Basant bundles. Prices in PKR with delivery across supported areas.',
  alternates: { canonical: '/shop' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Read one query-string value, ignoring repeats. */
function one(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const sortParam = one(params, 'sort');
  const filters: ProductFilters = {
    categorySlug: one(params, 'category'),
    search: one(params, 'q'),
    minPriceRs: Number(one(params, 'min')) || undefined,
    maxPriceRs: Number(one(params, 'max')) || undefined,
    inStockOnly: one(params, 'stock') === '1',
    sort:
      sortParam === 'price-asc' || sortParam === 'price-desc' || sortParam === 'name'
        ? sortParam
        : 'newest',
    page: Math.max(Number(one(params, 'page')) || 1, 1),
    perPage: 12,
  };

  const [listing, categories] = await Promise.all([listProducts(filters), getCategories()]);

  // Preserve the active filters when building pagination links.
  const linkFor = (nextPage: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (single && key !== 'page') query.set(key, single);
    }
    if (nextPage > 1) query.set('page', String(nextPage));
    const qs = query.toString();
    return qs ? `/shop?${qs}` : '/shop';
  };

  return (
    <>
      <Header />
      <CartDrawer />

      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader
          title="Shop Kites"
          crumbs={[{ href: '/', label: 'Home' }]}
          intro="Traditional guddas measured in tawa, designer sails, plain cotton dor, charkhi and ready-made Basant bundles."
        />
        {listing.ok ? (
          <div className="shell grid gap-8 py-10 lg:grid-cols-[16rem_1fr]">
            <Suspense fallback={<div className="h-64" aria-hidden />}>
              <ShopFilters categories={categories} />
            </Suspense>

            <div>
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <p className="tnum text-sm text-navy-900/60">
                  {listing.data.total} {listing.data.total === 1 ? 'product' : 'products'}
                </p>
              </div>

              {listing.data.items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-navy-900/20 px-6 py-20 text-center">
                  <h2 className="font-display text-xl font-bold">Nothing matches those filters</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-navy-900/60">
                    Try widening the price range or clearing the category.
                  </p>
                  <Link href="/shop" className="btn-ghost mt-5">
                    Clear all filters
                  </Link>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:gap-5">
                  {listing.data.items.map((product) => (
                    <li key={product.id}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              )}

              {listing.data.pageCount > 1 && (
                <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
                  {listing.data.page > 1 && (
                    <Link
                      href={linkFor(listing.data.page - 1)}
                      className="btn-ghost px-5 py-2.5 text-xs"
                      rel="prev"
                    >
                      Previous
                    </Link>
                  )}
                  <span className="tnum px-3 text-sm text-navy-900/60">
                    Page {listing.data.page} of {listing.data.pageCount}
                  </span>
                  {listing.data.page < listing.data.pageCount && (
                    <Link
                      href={linkFor(listing.data.page + 1)}
                      className="btn-ghost px-5 py-2.5 text-xs"
                      rel="next"
                    >
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </div>
          </div>
        ) : (
          /* Not "0 products", and no filter rail either: every control in it
             would just reload this same message. */
          <div className="shell py-16">
            <Unavailable what="the catalogue" />
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
