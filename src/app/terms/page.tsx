import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage, DraftNotice } from '@/components/layout/ContentPage';
import { getSettings } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms you agree to when ordering from Kites92.',
  alternates: { canonical: '/terms' },
};

export default async function TermsPage() {
  const settings = await getSettings();
  const advance = settings['payment.advancePercent'] ?? '50';

  return (
    <ContentPage title="Terms of Service" intro="The basis on which we sell to you.">
      <DraftNotice what="These terms describe how the shop is built and intended to operate, but they have not been reviewed by a lawyer and are not legal advice." />

      <h2>Orders</h2>
      <p>
        Placing an order is an offer to buy, not a completed sale. An order becomes
        binding when we confirm it — for bank transfer, that is when your advance is
        received and matched; for cash on delivery, when we confirm by phone or
        WhatsApp. We may decline or cancel any order before dispatch, in which case
        anything you have paid is refunded in full.
      </p>

      <h2>Prices and stock</h2>
      <p>
        Prices are in Pakistani Rupees and include no hidden charges; delivery is shown
        separately at checkout. Stock levels shown are live, but two people can reach
        the last item at the same moment. If that happens, your order is adjusted or
        refunded rather than silently short-shipped.
      </p>
      <p>
        If an item is listed at an obviously incorrect price, we will contact you
        before charging or dispatching rather than fulfilling it or cancelling silently.
      </p>

      <h2>Payment</h2>
      <p>
        Where bank transfer is used, {advance}% of the order total is required in
        advance to confirm the order, with the balance due as agreed. Cash on delivery
        is available only in the cities listed on the{' '}
        <Link href="/delivery">delivery page</Link>.
      </p>

      <h2>Delivery</h2>
      <p>
        Delivery estimates are estimates, not guarantees — they depend on the courier,
        and Basant is their busiest week of the year. We deliver only to the areas
        listed at checkout.
      </p>

      <h2>Use of what we sell</h2>
      <p>
        Kite flying is regulated in Punjab and the position changes. By ordering, you
        confirm that you are permitted to fly where you intend to, and you accept
        responsibility for flying safely. Our{' '}
        <Link href="/safety">safety page</Link> sets out what we sell, what we refuse
        to sell, and why.
      </p>
      <p>
        We sell plain uncoated cotton line only. Using our products with prohibited
        coated or metallic line, or in a prohibited place, is your responsibility and
        not ours.
      </p>

      <h2>Refunds</h2>
      <p>
        Covered separately on the <Link href="/returns">refunds and returns page</Link>,
        which forms part of these terms.
      </p>

      <h2>Reviews</h2>
      <p>
        Reviews are published only after we check them, and only from genuine
        customers. We do not write or commission reviews. We may decline to publish
        abusive or off-topic submissions, but we do not remove a review for being
        critical.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may change. The version in force is the one published when you
        place your order.
      </p>
    </ContentPage>
  );
}
