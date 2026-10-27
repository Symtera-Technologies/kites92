import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Noto_Nastaliq_Urdu, Plus_Jakarta_Sans } from 'next/font/google';
import { QualityProvider } from '@/components/three/QualityProvider';
import { SmoothScroll } from '@/components/scroll/SmoothScroll';
import './globals.css';

/**
 * Type pairing.
 *
 * Bricolage Grotesque for display: it has the slightly irregular, hand-cut
 * character that suits a paper-and-bamboo festival, where a neutral grotesque
 * would read as generic SaaS. Plus Jakarta Sans handles the shopping
 * interface, where legibility at small sizes matters more than personality.
 *
 * Both are loaded as variables and referenced through the Tailwind theme, so
 * nothing in the app hardcodes a font family.
 */
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700', '800'],
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

/**
 * Urdu support. Nastaliq needs its own face — Latin fonts have no Arabic-script
 * coverage, and the system fallback renders Urdu in Naskh, which is legible but
 * wrong for a Pakistani consumer brand.
 */
const urdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  variable: '--font-urdu',
  display: 'swap',
  weight: ['400', '600'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kites92.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Kites92 — Basant Kites, Charkhi & Festival Collections in Punjab',
    template: '%s · Kites92',
  },
  description:
    'Shop traditional Pakistani kites (gudda), charkhi spools and Basant festival bundles. Delivery across supported areas in Punjab, with cash on delivery and bank transfer.',
  keywords: [
    'kites92',
    'kites online Pakistan',
    'basant kites',
    'gudda',
    'charkhi',
    'patang',
    'kite shop Lahore',
    'Punjab kite store',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: siteUrl,
    siteName: 'Kites92',
    title: 'Kites92 — Let Your Happiness Fly',
    description:
      'An interactive Basant festival you can shop inside. Traditional kites, charkhi spools and festival bundles.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kites92 — Let Your Happiness Fly',
    description: 'Traditional kites, charkhi spools and Basant festival bundles.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The hero is a full-bleed sky; letting it tint the browser chrome keeps the
  // phone UI from cutting a hard white line across it.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF9EF' },
    { media: '(prefers-color-scheme: dark)', color: '#101B35' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${urdu.variable}`}>
      <body>
        {/* Keyboard users must be able to jump past the 3D hero, which is a
            long scroll track with no focusable content. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <QualityProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </QualityProvider>
      </body>
    </html>
  );
}
