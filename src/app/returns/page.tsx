import type { Metadata } from 'next';
import { ContentPage, DraftNotice } from '@/components/layout/ContentPage';
import { getSettings } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Refunds & Returns',
  description: 'When Kites92 refunds an order and how to request one.',
  alternates: { canonical: '/returns' },
};

export default async function ReturnsPage() {
  const settings = await getSettings();
  const policy = settings['returns.policy'];

  return (
    <ContentPage
      title="Refunds & Returns"
      intro="Kites are fragile and seasonal, so this policy is deliberately specific about what is and is not covered."
    >
      {!policy && (
        <DraftNotice what="No refunds policy has been set in the admin yet, so the text below is a starting point only." />
      )}

      {policy && <p className="rounded-2xl bg-cream-300 p-4">{policy}</p>}

      <h2>When we refund</h2>
      <ul>
        <li>
          <strong>Stock unavailable.</strong> If we cannot supply something you paid
          for, that amount is refunded in full.
        </li>
        <li>
          <strong>Delivery failed.</strong> If the courier cannot deliver and the order
          comes back to us, we refund the goods.
        </li>
        <li>
          <strong>Cancelled before dispatch.</strong> Tell us before the order leaves
          and we refund what you have paid.
        </li>
        <li>
          <strong>Damaged on arrival.</strong> If kites arrive torn or spars are
          broken, send photographs on WhatsApp on the day of delivery.
        </li>
      </ul>

      <h2>When we cannot</h2>
      <p>
        Paper kites cannot be returned once handed over and inspected. A gudda is a
        sheet of paper on bamboo — it cannot be restocked after it has left us, and we
        have no way to tell a transit tear from a flying one after the fact. The same
        applies to dor that has been unwound.
      </p>
      <p>
        We also cannot refund because the wind was poor on the day, or because a kite
        was cut in a flight. That is Basant.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Message us on WhatsApp with your order number and, where relevant, photographs.
        Refunds are returned by the same method you paid with. Bank transfers are
        processed back to the account the advance came from.
      </p>

      <h2>Cancellations</h2>
      <p>
        Orders can be cancelled any time before dispatch. Once an order shows as
        dispatched on your{' '}
        <a href="/track">tracking page</a>, it is with the courier and can no longer
        be cancelled.
      </p>
    </ContentPage>
  );
}
