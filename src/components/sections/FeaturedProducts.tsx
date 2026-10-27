import Link from 'next/link';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { Reveal } from '@/components/ui/Reveal';

/** Section D — featured products, straight from the database. */
export function FeaturedProducts({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;

  return (
    <section className="bg-white py-20 sm:py-28" aria-labelledby="featured-heading">
      <div className="shell">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-vibrant">
              Picked for Basant
            </p>
            <h2 id="featured-heading" className="mt-3 text-display-sm">
              Featured Kites
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-navy-900/65">
              The sizes and bundles people come back for, with live stock and prices
              in rupees.
            </p>
          </div>
          <Link href="/shop" className="btn-ghost">
            View all products
          </Link>
        </Reveal>

        <ul className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:gap-5">
          {products.map((product, index) => (
            <Reveal as="li" key={product.id} delay={index * 70}>
              <ProductCard product={product} className="h-full" />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
