import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductCard } from '@/components/ui/ProductCard';
import { Unavailable } from '@/components/ui/Unavailable';
import { getCollection, listProducts } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

/**
 * Collection landing page.
 *
 * A collection is a category with its own page and copy, rather than a second
 * grouping concept. One taxonomy is easier to keep straight than two, and
 * `/collections/basant-bundles` reads better in marketing than a filtered
 * shop URL while resolving to the same products.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const found = await getCollection(slug);
  // An outage must not be cached as this collection's description, nor indexed
  // as though the page were thin.
  if (!found.ok) return { title: 'Collection', robots: { index: false, follow: true } };
  if (!found.data) return { title: 'Collection not found' };

  const category = found.data;
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name} at Kites92.`,
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;

  const found = await getCollection(slug);

  // Checked before the 404, because a 404 is the one answer we cannot take
  // back: it tells crawlers to drop a page that is perfectly fine, and tells
  // the customer this collection is gone when MySQL merely blinked.
  if (!found.ok) {
    return (
      <>
        <Header />
        <main id="main" className="pt-[var(--nav-h)]">
          <PageHeader
            title="Collection"
            crumbs={[
              { href: '/', label: 'Home' },
              { href: '/categories', label: 'Categories' },
            ]}
          />
          <div className="shell py-16">
            <Unavailable what="this collection" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const category = found.data;
  if (!category) notFound();

  const listing = await listProducts({ categorySlug: slug, perPage: 48 });

  return (
    <>
      <Header />
      <CartDrawer />

      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader
          title={category.name}
          titleUrdu={category.nameUrdu}
          intro={category.description}
          crumbs={[
            { href: '/', label: 'Home' },
            { href: '/categories', label: 'Categories' },
          ]}
        />

        <div className="shell py-10">
          {listing.ok ? (
            <>
              <p className="tnum mb-5 text-sm text-navy-900/60">
                {listing.data.total} {listing.data.total === 1 ? 'product' : 'products'}
              </p>

              {listing.data.items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-navy-900/20 px-6 py-20 text-center">
                  <h2 className="font-display text-xl font-bold">Nothing here yet</h2>
                  <p className="mt-2 text-sm text-navy-900/60">
                    This collection has no products in stock right now.
                  </p>
                  <Link href="/shop" className="btn-ghost mt-5">Browse all products</Link>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:gap-5">
                  {listing.data.items.map((product) => (
                    <li key={product.id}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <Unavailable what="this collection’s products" />
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
