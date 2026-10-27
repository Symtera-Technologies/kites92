import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { CategoryGallery } from '@/components/sections/CategoryGallery';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Unavailable } from '@/components/ui/Unavailable';
import { tryCategories } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Categories',
  description:
    'Browse Kites92 by category: traditional guddas by tawa size, designer kites, kids kites, plain cotton dor, charkhi spools, accessories and Basant bundles.',
  alternates: { canonical: '/categories' },
};

export default async function CategoriesPage() {
  const categories = await tryCategories();

  return (
    <>
      <Header />
      <CartDrawer />
      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader
          title="Categories"
          crumbs={[{ href: '/', label: 'Home' }]}
          intro="Every part of the catalogue, grouped the way it is asked for: guddas by tawa, dor by pinna, charkhi by width."
        />

        {/* `CategoryGallery` renders nothing when empty — correct on the
            homepage, wrong here, where the categories *are* the page.

            Three outcomes, not two: an unreadable catalogue is not an empty
            one, and "No categories yet" would be a false statement about the
            shop rather than a report of our own outage. */}
        {!categories.ok ? (
          <div className="shell py-16">
            <Unavailable what="the categories" />
          </div>
        ) : categories.data.length === 0 ? (
          <EmptyState
            title="No categories yet"
            body="The catalogue has not been loaded, so there is nothing to group yet. Once products are seeded, every category appears here automatically."
            action={{ href: '/shop', label: 'Go to the shop' }}
            secondary={{ href: '/contact', label: 'Contact us' }}
          />
        ) : (
          <CategoryGallery categories={categories.data} />
        )}
      </main>
      <Footer />
    </>
  );
}
