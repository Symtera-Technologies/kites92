import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/layout/ContentPage';
import { getSettings } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Safety & Compliance',
  description:
    'Kites92 sells plain, uncoated cotton flying line only. We do not stock metallic, glass-coated or chemically treated string of any kind.',
  alternates: { canonical: '/safety' },
};

export default async function SafetyPage() {
  const settings = await getSettings();

  return (
    <ContentPage
      title="Safety & Compliance"
      intro="Kite flying is wonderful and it is also genuinely dangerous when the wrong materials are involved. Here is exactly where we stand."
    >
      <h2>The line we sell</h2>
      <p>
        We sell <strong>plain, uncoated cotton flying line only</strong>. It has no
        glass coating, no metallic content and no chemical dressing of any kind.
      </p>
      <p>
        We do not stock, supply or source coated or metallic string — sometimes sold
        as &ldquo;China dor&rdquo; or similar — under any circumstances, and we will not
        fulfil requests for it. Coated and metallic line cuts people. It has killed
        motorcyclists and children in Punjab, and it brings down power lines. There is
        no version of this business that sells it.
      </p>
      {settings['notice.safety'] && (
        <p className="rounded-2xl bg-cream-300 p-4">{settings['notice.safety']}</p>
      )}

      <h2>Flying safely</h2>
      <ul>
        <li>Never fly near overhead power lines, substations or transformers.</li>
        <li>
          Keep away from roads. A line across a carriageway is dangerous even when it
          is plain cotton.
        </li>
        <li>
          Tape your fingers. Cotton line under load from a large kite will still cut
          skin — we sell hand protection tape for this reason.
        </li>
        <li>Children should fly with an adult, and never from an unguarded roof edge.</li>
        <li>
          Do not retrieve a kite caught in cables or on a roof you do not have
          permission to be on.
        </li>
      </ul>

      <h2>Legal position</h2>
      <p>
        Kite flying is regulated in Punjab, and the position changes. We accept and
        dispatch orders only where and when flying is permitted under the current
        provincial position, and it is your responsibility to confirm local permission
        before ordering or flying.
      </p>
      {settings['notice.salesGate'] && (
        <p className="rounded-2xl bg-cream-300 p-4">{settings['notice.salesGate']}</p>
      )}

      <h2>Reporting a problem</h2>
      <p>
        If you believe something we sold you is unsafe, or you received something other
        than what is described here, contact us immediately via the{' '}
        <Link href="/contact">contact page</Link> and we will take it seriously.
      </p>
    </ContentPage>
  );
}
