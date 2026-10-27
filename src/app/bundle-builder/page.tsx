import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { BundleBuilder } from '@/components/sections/BundleBuilder';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Unavailable } from '@/components/ui/Unavailable';
import { tryBundleEligibleProducts } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Build Your Basant Bundle',
  description:
    'Assemble your own Basant bundle — pick kites by tawa size, plain cotton dor and a charkhi, all at normal prices with no bundle markup.',
  alternates: { canonical: '/bundle-builder' },
};

export default async function BundleBuilderPage() {
  const products = await tryBundleEligibleProducts();

  return (
    <>
      <Header />
      <CartDrawer />
      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader
          title="Build Your Basant Bundle"
          crumbs={[{ href: '/', label: 'Home' }]}
          intro="Pick your sizes, your dor and your charkhi. Everything goes into one basket at its normal price — there is no bundle markup."
        />

        {/* The builder hides itself with nothing to offer, which left this
            page as a header above blank cream. An unreadable catalogue is a
            third case: not "nothing to build with", but nothing to read. */}
        {!products.ok ? (
          <div className="shell py-16">
            <Unavailable what="the bundle catalogue" />
          </div>
        ) : products.data.length === 0 ? (
          <EmptyState
            title="Nothing to build with yet"
            body="Bundle building needs a loaded catalogue — kites, dor and charkhi to choose between. Once products are seeded they appear here."
            action={{ href: '/shop', label: 'Go to the shop' }}
          />
        ) : (
          <BundleBuilder products={products.data} />
        )}
      </main>
      <Footer />
    </>
  );
}
