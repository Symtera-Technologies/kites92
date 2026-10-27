import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Unavailable } from '@/components/ui/Unavailable';
import { tryDeliveryZones, getSettings } from '@/lib/commerce/queries';
import { whatsappLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your Kites92 order with cash on delivery or bank transfer.',
  // Checkout must never be indexed or followed.
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [zones, settings] = await Promise.all([tryDeliveryZones(), getSettings()]);

  // Settings live in the same database, so fall back to the build-time number:
  // an outage is exactly when someone needs a way to reach a human.
  const whatsappNumber =
    settings['whatsapp.number'] || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

  return (
    <>
      {/* No cart drawer here: opening a slide-over on top of the checkout form
          would bury the form the visitor is trying to complete. */}
      <Header />

      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader title="Checkout" crumbs={[{ href: '/cart', label: 'Basket' }]} />

        {!zones.ok ? (
          /* No form at all. A checkout that cannot price delivery or tell COD
             from bank transfer must not collect an address and a promise it is
             in no position to keep. */
          <div className="shell py-16">
            <Unavailable what="checkout" whatsappNumber={whatsappNumber} />
          </div>
        ) : zones.data.length === 0 ? (
          /* Read fine, genuinely empty — a true fact about setup, not an
             outage, so it gets the plain empty state and its own wording. */
          <EmptyState
            title="Delivery areas aren’t set up yet"
            body="No delivery areas are configured, so we can’t price delivery or confirm payment options yet. Message us and we’ll take the order directly."
            action={
              whatsappNumber
                ? {
                    href: whatsappLink(
                      whatsappNumber,
                      'Assalam o alaikum — I would like to place an order.',
                    ),
                    label: 'Order on WhatsApp',
                  }
                : undefined
            }
            secondary={{ href: '/cart', label: 'Back to basket' }}
          />
        ) : (
          <div className="shell py-10">
            <CheckoutForm
              zones={zones.data}
              advancePercent={Number(settings['payment.advancePercent'] ?? 50)}
              whatsappNumber={whatsappNumber}
              bankDetails={{
                bankName: settings['payment.bankName'] ?? '—',
                accountTitle: settings['payment.accountTitle'] ?? '—',
                accountNumber: settings['payment.accountNumber'] ?? '—',
                instructions: settings['payment.instructions'] ?? '',
              }}
            />
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
