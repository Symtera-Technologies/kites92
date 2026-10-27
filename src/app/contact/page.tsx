import type { Metadata } from 'next';
import { ContentPage } from '@/components/layout/ContentPage';
import { getSettings } from '@/lib/commerce/queries';
import { whatsappLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Kites92 by WhatsApp, phone or email.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const whatsapp = settings['whatsapp.number'];

  return (
    <ContentPage
      title="Contact Us"
      intro="WhatsApp is the fastest way to reach us — it is where orders are confirmed and where most questions get answered."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {whatsapp && (
          <a
            href={whatsappLink(whatsapp, settings['whatsapp.greeting'])}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-navy-900/10 bg-white p-5 no-underline transition-transform hover:-translate-y-0.5"
          >
            <p className="font-display text-base font-bold text-navy-900">WhatsApp</p>
            <p className="tnum mt-1 text-sm text-navy-900/70">+{whatsapp}</p>
            <p className="mt-2 text-xs text-navy-900/50">
              Order confirmations, payment receipts and stock questions.
            </p>
          </a>
        )}

        {settings['store.phone'] && (
          <a
            href={`tel:${settings['store.phone'].replace(/\s/g, '')}`}
            className="rounded-2xl border border-navy-900/10 bg-white p-5 no-underline transition-transform hover:-translate-y-0.5"
          >
            <p className="font-display text-base font-bold text-navy-900">Phone</p>
            <p className="tnum mt-1 text-sm text-navy-900/70">{settings['store.phone']}</p>
          </a>
        )}

        {settings['store.email'] && (
          <a
            href={`mailto:${settings['store.email']}`}
            className="rounded-2xl border border-navy-900/10 bg-white p-5 no-underline transition-transform hover:-translate-y-0.5"
          >
            <p className="font-display text-base font-bold text-navy-900">Email</p>
            <p className="mt-1 text-sm text-navy-900/70">{settings['store.email']}</p>
          </a>
        )}

        {settings['store.address'] && (
          <div className="rounded-2xl border border-navy-900/10 bg-white p-5">
            <p className="font-display text-base font-bold text-navy-900">Address</p>
            <p className="mt-1 text-sm text-navy-900/70">{settings['store.address']}</p>
          </div>
        )}
      </div>

      <h2>About your order</h2>
      <p>
        If you already have an order number, quote it in your first message — it saves
        a round trip. You can also check the status yourself on the{' '}
        <a href="/track">track your order</a> page using your order number and the
        mobile number you ordered with.
      </p>

      <h2>Wholesale and bulk</h2>
      <p>
        For large Basant orders, message us on WhatsApp with the sizes and quantities
        you need and we will tell you what is available and what it will cost.
      </p>
    </ContentPage>
  );
}
