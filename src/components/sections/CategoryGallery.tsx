import Link from 'next/link';
import { KiteMotif } from '@/components/ui/KiteMotif';
import { Reveal } from '@/components/ui/Reveal';
import { kiteFabric } from '@/lib/design/tokens';

interface Category {
  id: string;
  slug: string;
  name: string;
  nameUrdu: string | null;
  description: string | null;
  imageUrl: string | null;
  _count: { products: number };
}

/**
 * Section B — the kite collection.
 *
 * Each category is a kite hanging in a tinted sky panel, which continues the
 * hero's world without a second WebGL context: the homepage already runs one
 * canvas, and a grid of live 3D kites would multiply draw calls for no
 * readable gain at card size. The motif is SVG and costs nothing.
 */
export function CategoryGallery({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-cream py-20 sm:py-28" aria-labelledby="collection-heading">
      {/* Soft sky wash behind the grid, tying the section to the hero above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-sky/20 to-transparent"
      />

      <div className="shell relative">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-festival">
            The Collection
          </p>
          <h2 id="collection-heading" className="mt-3 text-display-sm">
            Explore Our Kite Collection
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-900/65">
            Guddas sized the traditional way in tawa, plain cotton dor, hand-turned
            charkhi, and bundles that put the whole roof in one box.
          </p>
        </Reveal>

        <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category, index) => (
            <Reveal as="li" key={category.id} delay={index * 60}>
              <Link
                href={`/shop?category=${category.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-navy-900/10 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
              >
                <div className="mx-auto h-28 w-24 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                  {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.imageUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <KiteMotif
                      topColor={kiteFabric[index % kiteFabric.length]}
                      bottomColor={kiteFabric[(index + 3) % kiteFabric.length]}
                    />
                  )}
                </div>

                <h3 className="mt-4 font-display text-base font-bold leading-snug text-navy-900">
                  {category.name}
                </h3>
                {category.nameUrdu && (
                  <p className="mt-0.5 font-urdu text-sm text-navy-900/50" dir="rtl" lang="ur">
                    {category.nameUrdu}
                  </p>
                )}
                {category.description && (
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-navy-900/55">
                    {category.description}
                  </p>
                )}

                <span className="tnum mt-auto pt-3 text-xs font-bold uppercase tracking-wider text-royal">
                  {category._count.products}{' '}
                  {category._count.products === 1 ? 'product' : 'products'} →
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
