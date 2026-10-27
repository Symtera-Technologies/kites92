import type { Metadata } from 'next';
import { ContentPage, DraftNotice } from '@/components/layout/ContentPage';
import { getSettings } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What data Kites92 collects, why, and how long it is kept.',
  alternates: { canonical: '/privacy' },
};

/**
 * Privacy policy.
 *
 * This describes what this codebase ACTUALLY does — the specific fields the
 * checkout stores, the one cookie that exists, the browser storage the cart
 * uses. It is accurate as written, but it is not legal advice and the notice
 * below says so rather than implying a lawyer reviewed it.
 */
export default async function PrivacyPage() {
  const settings = await getSettings();
  const email = settings['store.email'];

  return (
    <ContentPage
      title="Privacy Policy"
      intro="What we collect, why we collect it, and what we do not do with it."
    >
      <DraftNotice what="This describes how the website is actually built, but it has not been reviewed by a lawyer and is not legal advice." />

      <h2>What we collect</h2>
      <p>When you place an order we store:</p>
      <ul>
        <li>Your name, mobile number and (if you give one) email address.</li>
        <li>The delivery address you enter: province, city, area, street and postal code.</li>
        <li>What you ordered, the prices at the time, and any note you added.</li>
        <li>Payment status — whether an advance or the full amount has been received.</li>
      </ul>
      <p>
        We do <strong>not</strong> collect or store card numbers, bank credentials or
        CNIC numbers. Bank transfers happen in your own banking app; we only record
        that a payment arrived.
      </p>

      <h2>Why we collect it</h2>
      <p>
        To pack and deliver your order, to contact you about it, and to keep an accurate
        record of what was sold. We do not use it for advertising, and we do not sell or
        share it with anyone other than the courier delivering to you.
      </p>

      <h2>Cookies and browser storage</h2>
      <ul>
        <li>
          <strong>Your basket</strong> is kept in your own browser&rsquo;s local storage.
          It never reaches our server until you check out.
        </li>
        <li>
          <strong>A session cookie</strong> is set only if you sign in to an account. It
          is httpOnly, meaning scripts on the page cannot read it, and it expires after
          14 days.
        </li>
        <li>
          <strong>A display preference</strong> may be stored locally if you change the
          site&rsquo;s graphics quality.
        </li>
      </ul>
      <p>
        There are no advertising or tracking cookies on this site, and no third-party
        analytics are loaded by default.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept as business records. If you want your details removed,
        contact us and we will remove what we are not required to keep.
      </p>

      <h2>Your order link</h2>
      <p>
        Order tracking pages use a long random token in the URL. Anyone with that link
        can see that order, so treat it as private and do not post it publicly.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about your data{email ? <> can go to <a href={`mailto:${email}`}>{email}</a></> : ' can be sent through our contact page'}.
      </p>
    </ContentPage>
  );
}
