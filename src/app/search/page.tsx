import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductCard } from '@/components/ui/ProductCard';
import { Unavailable } from '@/components/ui/Unavailable';
import { listProducts } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search',
  // Search result pages are thin and infinitely variable; keeping them out of
  // the index avoids diluting the catalogue pages that should rank.
  robots: { index: false, follow: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = (typeof params.q === 'string' ? params.q : '').trim();

  const results = query ? await listProducts({ search: query, perPage: 36 }) : null;

  return (
    <>
      <Header />
      <CartDrawer />

      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader title="Search" crumbs={[{ href: '/', label: 'Home' }]}>
          <form method="get" role="search" className="mt-6 flex max-w-xl gap-2">
            <label htmlFor="q" className="sr-only">
              Search products
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              autoFocus
              placeholder="Try “gudda”, “1.5 tawa”, “dor” or “charkhi”"
              className="flex-1 rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-sm focus:border-royal focus:outline-none"
            />
            <button type="submit" className="btn-primary px-6">
              Search
            </button>
          </form>
        </PageHeader>

        <div className="shell py-10">
          {results &&
            (results.ok ? (
              <>
                <p className="tnum text-sm text-navy-900/60">
                  {results.data.total} {results.data.total === 1 ? 'result' : 'results'} for “{query}”
                </p>

                {results.data.items.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-navy-900/20 px-6 py-16 text-center">
                    <h2 className="font-display text-lg font-bold">No matches</h2>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-navy-900/60">
                      Try a shorter word, or browse the categories instead. Sizes are
                      listed in tawa, so “1.5” works better than “large”.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:gap-5">
                    {results.data.items.map((product) => (
                      <li key={product.id}>
                        <ProductCard product={product} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              /* “No matches” would blame the customer’s wording for our outage. */
              <Unavailable what="search results" />
            ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
