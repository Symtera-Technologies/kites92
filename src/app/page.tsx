import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Hero } from '@/components/sections/Hero';
import { TawaGuide } from '@/components/sections/TawaGuide';
import { CategoryGallery } from '@/components/sections/CategoryGallery';
import { FeaturedProducts } from '@/components/sections/FeaturedProducts';
import { BundleBuilder } from '@/components/sections/BundleBuilder';
import { WhyKites92, type Reason } from '@/components/sections/WhyKites92';
import { BasantGallery, type GalleryImage } from '@/components/sections/BasantGallery';
import { Testimonials } from '@/components/sections/Testimonials';
import { FinalCta } from '@/components/sections/FinalCta';
import {
  getApprovedReviews,
  getBundleEligibleProducts,
  getCategories,
  getFeaturedProducts,
  getSettings,
} from '@/lib/commerce/queries';

// Stock levels and prices are shown on this page, so it is rendered per
// request rather than frozen into the build output.
export const dynamic = 'force-dynamic';

/**
 * Parse a JSON-valued setting.
 *
 * Settings are free text edited by a human in the admin, so malformed JSON is
 * an expected input, not an exceptional one. A broken value hides its section
 * instead of taking down the homepage.
 */
function parseJsonSetting<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) || typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Default reasons.
 *
 * Deliberately claims nothing specific about delivery times, coverage or
 * guarantees — those depend on how this business actually operates, so they
 * are left to the `why.reasons` setting rather than asserted in code.
 */
const DEFAULT_REASONS: Reason[] = [
  {
    title: 'Kites sized the traditional way',
    body: 'Guddas measured in tawa, the way Punjab has always sized them, so you know exactly what you are buying.',
  },
  {
    title: 'Plain cotton dor only',
    body: 'Uncoated, untreated cotton line. We do not stock metallic, glass-coated or chemically treated string of any kind.',
  },
  {
    title: 'Ordering without the phone tag',
    body: 'Pick what you want, see the price in rupees, and place the order. No back-and-forth to find out what is in stock.',
  },
  {
    title: 'Pay the way you prefer',
    body: 'Cash on delivery where it is supported, or bank transfer with the receipt confirmed on WhatsApp.',
  },
  {
    title: 'Packed so it arrives flat',
    body: 'Paper sails crease and tear in transit. Orders are packed flat, with bags available for larger orders.',
  },
  {
    title: 'A person on WhatsApp',
    body: 'Questions about sizes, wind or what to pair with what go to someone who flies, not a ticket queue.',
  },
];

export default async function HomePage() {
  const [categories, featured, bundleProducts, reviews, settings] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
    getBundleEligibleProducts(),
    getApprovedReviews(6),
    getSettings(),
  ]);

  const reasons = parseJsonSetting<Reason[]>(settings['why.reasons'], DEFAULT_REASONS);
  const galleryImages = parseJsonSetting<GalleryImage[]>(settings['gallery.images'], []);

  return (
    <>
      {/* `overHero` lets the header sit transparent over the photograph until
          the visitor scrolls, which is only legible because the hero has a
          dark scrim behind it. */}
      <Header overHero />
      <CartDrawer />

      <Hero />

      <main id="main">
        {/* Sizing comes first, and is the one section that renders with no
            data at all. Everything below it hides itself when the catalogue
            is empty, which otherwise leaves the hero sitting on nothing. */}
        <TawaGuide />

        <CategoryGallery categories={categories} />
        <FeaturedProducts products={featured} />

        {/* The interactive 3D world (`BasantExperience`) used to sit here. It
            is 320vh of sticky canvas, so with an unseeded catalogue above it
            it became three screens of empty sky directly under the hero.
            `src/components/three/` and its acceptance checks are untouched —
            re-import the section and drop it back on this line to restore it. */}

        <BundleBuilder products={bundleProducts} />
        <WhyKites92 reasons={reasons} />

        {/* Both of these render nothing until there is real content: real
            photographs, and real approved customer reviews. */}
        <BasantGallery images={galleryImages} />
        <Testimonials reviews={reviews} />

        <FinalCta />
      </main>

      {/* The closing band is full-bleed and dark, and runs straight into the
          footer — no cream gap between them. */}
      <Footer flush />
    </>
  );
}
