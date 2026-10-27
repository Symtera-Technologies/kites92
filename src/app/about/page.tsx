import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage, DraftNotice } from '@/components/layout/ContentPage';
import { getSettings } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Kites92 sells traditional Pakistani kites, plain cotton dor and charkhi for Basant in Punjab.',
  alternates: { canonical: '/about' },
};

export default async function AboutPage() {
  const settings = await getSettings();
  const story = settings['about.story'];

  return (
    <ContentPage
      title="About Kites92"
      intro="A kite shop for the people who actually go up on the roof."
    >
      {story ? (
        <p className="whitespace-pre-line">{story}</p>
      ) : (
        <>
          <DraftNotice what="This page has no story set in the admin yet (settings key: about.story), so the text below is generic placeholder copy rather than your history." />

          <p>
            Kites92 sells traditional kites, flying line and charkhi for Basant in
            Punjab. Everything is listed the way people actually ask for it — guddas by
            tawa, dor by pinna — because that is the language of the roof, not of a
            product catalogue.
          </p>

          <h2>What we stock</h2>
          <p>
            Plain white and multi-colour guddas from half a tawa up to two, designer
            and printed sails, kids kites, plain cotton dor, hand-turned charkhi, and
            the accessories that make a long session bearable: hand tape, repair kits
            and flat carry bags.
          </p>

          <h2>What we will not stock</h2>
          <p>
            We sell plain, uncoated cotton line only. No glass coating, no metallic
            content, no chemical dressing. That line injures and kills people every
            season, and no amount of demand changes our answer. There is more detail on
            the <Link href="/safety">safety page</Link>.
          </p>

          <h2>How ordering works</h2>
          <p>
            Pick what you want, see the price in rupees and the real stock level, and
            place the order. Cash on delivery where it is supported, bank transfer
            elsewhere with the receipt confirmed on WhatsApp. You can check your order
            any time on the <Link href="/track">tracking page</Link>.
          </p>
        </>
      )}
    </ContentPage>
  );
}
