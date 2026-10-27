import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { ProductBuy } from '@/components/product/ProductBuy';
import { ProductCard } from '@/components/ui/ProductCard';
import { Unavailable } from '@/components/ui/Unavailable';
import { formatPkr } from '@/lib/commerce/money';
import { getProductBySlug, getRelatedProducts } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const found = await getProductBySlug(slug);
  // Never let a crawler cache an outage as this product's page, and never 404
  // a kite that is still for sale.
  if (!found.ok) {
    return { title: 'Temporarily unavailable', robots: { index: false, follow: false } };
  }

  const product = found.data;
  if (!product) return { title: 'Product not found' };

  return {
    title: product.metaTitle ?? product.name,
    description:
      product.metaDescription ??
      product.tagline ??
      `${product.name} — available now at Kites92, priced in PKR.`,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.tagline ?? undefined,
      type: 'website',
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const found = await getProductBySlug(slug);

  // Deliberately not degraded into the page below: a product rendered with a
  // missing price or stale stock is worse than no product page at all. So the
  // page withholds itself and says why, rather than guessing at either.
  if (!found.ok) {
    return (
      <>
        <Header />
        <main id="main" className="pt-[var(--nav-h)]">
          <div className="shell py-20">
            <Unavailable what="this product" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const product = found.data;
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.category?.slug);

  const inStock = product.variants.some((v) => v.stock > 0);
  const lowestPrice = product.variants.length
    ? Math.min(...product.variants.map((v) => v.priceRs))
    : product.basePriceRs;

  const averageRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : null;

  /**
   * Product structured data.
   *
   * Only fields we can state truthfully are emitted: `aggregateRating` is
   * omitted entirely when there are no approved reviews, rather than sent as
   * zero. Inventing review counts is both a lie and a manual action from
   * search engines.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? product.tagline ?? undefined,
    sku: product.variants[0]?.sku,
    category: product.category?.name,
    ...(product.images.length > 0 ? { image: product.images.map((i) => i.url) } : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'PKR',
      lowPrice: lowestPrice,
      highPrice: product.variants.length
        ? Math.max(...product.variants.map((v) => v.priceRs))
        : product.basePriceRs,
      offerCount: product.variants.length,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(averageRating != null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: averageRating.toFixed(1),
            reviewCount: product.reviews.length,
          },
        }
      : {}),
  };

  return (
    <>
      <Header />
      <CartDrawer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main id="main" className="pt-[var(--nav-h)]">
        <div className="shell py-8">
          <nav aria-label="Breadcrumb" className="mb-7 text-xs font-semibold uppercase tracking-wider text-navy-900/50">
            <Link href="/" className="hover:text-navy-900">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/shop" className="hover:text-navy-900">Shop</Link>
            {product.category && (
              <>
                <span className="mx-2">/</span>
                <Link href={`/shop?category=${product.category.slug}`} className="hover:text-navy-900">
                  {product.category.name}
                </Link>
              </>
            )}
          </nav>

          <div className="mb-8">
            <h1 className="text-display-sm">{product.name}</h1>
            {product.nameUrdu && (
              <p className="mt-1 font-urdu text-xl text-navy-900/60" dir="rtl" lang="ur">
                {product.nameUrdu}
              </p>
            )}
            {product.tagline && (
              <p className="mt-2 text-lg text-navy-900/65">{product.tagline}</p>
            )}
          </div>

          <ProductBuy
            productId={product.id}
            slug={product.slug}
            name={product.name}
            variants={product.variants}
            images={product.images}
            isBundle={product.isBundle}
          />

          <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_20rem]">
            <div>
              {product.description && (
                <section>
                  <h2 className="font-display text-xl font-bold">About this kite</h2>
                  <p className="mt-3 whitespace-pre-line leading-relaxed text-navy-900/75">
                    {product.description}
                  </p>
                </section>
              )}

              {product.isBundle && product.bundleItems.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display text-xl font-bold">What&rsquo;s in the bundle</h2>
                  <ul className="mt-4 divide-y divide-navy-900/10 rounded-2xl border border-navy-900/10 bg-white">
                    {product.bundleItems.map((entry) => (
                      <li key={entry.item.slug} className="flex items-center justify-between gap-4 px-4 py-3">
                        <Link href={`/product/${entry.item.slug}`} className="text-sm font-semibold hover:text-royal">
                          {entry.item.name}
                        </Link>
                        <span className="tnum shrink-0 text-sm text-navy-900/55">
                          × {entry.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-10">
                <h2 className="font-display text-xl font-bold">
                  Customer reviews
                  {product.reviews.length > 0 && (
                    <span className="tnum ml-2 text-base font-normal text-navy-900/55">
                      ({product.reviews.length})
                    </span>
                  )}
                </h2>

                {product.reviews.length === 0 ? (
                  <p className="mt-3 text-sm text-navy-900/60">
                    No reviews for this product yet. Reviews appear here once a verified
                    customer leaves one and our team has checked it.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {product.reviews.map((review) => (
                      <li key={review.id} className="rounded-2xl border border-navy-900/10 bg-white p-4">
                        <div className="flex items-center gap-2">
                          <span aria-label={`${review.rating} out of 5 stars`} className="text-basant-500">
                            {'★'.repeat(review.rating)}
                            <span className="text-navy-900/20">{'★'.repeat(5 - review.rating)}</span>
                          </span>
                          <span className="text-sm font-semibold">{review.authorName}</span>
                        </div>
                        {review.title && <p className="mt-2 font-semibold">{review.title}</p>}
                        <p className="mt-1 text-sm leading-relaxed text-navy-900/75">{review.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <dl className="rounded-2xl border border-navy-900/10 bg-white p-5 text-sm">
                <h2 className="mb-3 font-display text-base font-bold">Details</h2>
                {product.tawaSize != null && (
                  <div className="flex justify-between gap-4 border-b border-navy-900/8 py-2">
                    <dt className="text-navy-900/55">Size</dt>
                    <dd className="font-semibold">{product.tawaSize} Tawa</dd>
                  </div>
                )}
                {product.material && (
                  <div className="flex justify-between gap-4 border-b border-navy-900/8 py-2">
                    <dt className="text-navy-900/55">Material</dt>
                    <dd className="text-right font-semibold">{product.material}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-navy-900/55">Price from</dt>
                  <dd className="tnum font-semibold">{formatPkr(lowestPrice)}</dd>
                </div>
              </dl>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-20">
              <h2 className="font-display text-2xl font-bold">You might also like</h2>
              <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {related.map((item) => (
                  <li key={item.id}>
                    <ProductCard product={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
