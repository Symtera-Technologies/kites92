import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TrackForm } from '@/components/checkout/TrackForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { getSetting } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Track Your Order',
  description: 'Check the status of your Kites92 order with your order number and mobile number.',
  alternates: { canonical: '/track' },
};

export default async function TrackPage() {
  const whatsapp = await getSetting('whatsapp.number');

  return (
    <>
      <Header />
      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader
          title="Track Your Order"
          crumbs={[{ href: '/', label: 'Home' }]}
          intro="Enter your order number and the mobile number you ordered with. Both are needed — an order number on its own is short enough to guess."
        />
        <div className="shell max-w-lg py-12">
          <div className="rounded-3xl border border-navy-900/10 bg-white p-6 shadow-card">
            <TrackForm whatsappNumber={whatsapp} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
