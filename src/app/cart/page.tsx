import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartPageContents } from '@/components/checkout/CartPageContents';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = {
  title: 'Your Basket',
  robots: { index: false, follow: true },
};

/**
 * The basket itself is client state, but the footer reads store settings from
 * the database. Prerendering this page at build time baked in an empty footer,
 * since the build machine has no database connection.
 */
export const dynamic = 'force-dynamic';

export default function CartPage() {
  return (
    <>
      <Header />
      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader title="Your Basket" crumbs={[{ href: '/', label: 'Home' }]} />
        <div className="shell py-10">
          <CartPageContents />
        </div>
      </main>
      <Footer />
    </>
  );
}
