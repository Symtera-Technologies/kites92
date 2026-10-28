/**
 * Seed the Kites92 catalogue.
 *
 * WHAT THIS IS: a realistic STARTER catalogue so the store is usable the
 * moment it is installed — correct trade vocabulary (gudda, tawa, dor, pinna,
 * charkhi), plausible PKR price bands, real Punjab delivery zones.
 *
 * WHAT THIS IS NOT: your actual inventory. Every product here is marked as
 * sample data via the `catalogue.sampleData` setting, and the admin shows a
 * banner until you clear it. Replace the names, prices and stock with your
 * real products before taking orders.
 *
 * Two things are deliberately NOT seeded:
 *
 *  - REVIEWS. Inventing customer testimonials would put words in the mouths
 *    of people who do not exist. The review table starts empty and only
 *    staff-approved, genuine reviews are ever displayed.
 *
 *  - PRODUCT PHOTOS. There are no real photographs of these items, and
 *    generating stand-ins would misrepresent what a customer receives. The
 *    storefront renders a coloured kite motif from each variant's own swatch
 *    until you upload real photography.
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { buildDatabaseUrl } from '../src/lib/db-url.mjs';
import { loadDotEnv } from '../scripts/load-dotenv.mjs';

loadDotEnv();

// Composed from DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, so a password
// containing URI punctuation needs no hand-escaping. DATABASE_URL still wins.
const db = new PrismaClient({ datasourceUrl: buildDatabaseUrl() });

/* ── Categories ─────────────────────────────────────────────────────────── */

const categories = [
  {
    slug: 'traditional-kites',
    name: 'Traditional Kites',
    nameUrdu: 'روایتی پتنگ',
    description:
      'Classic hand-made guddas in the sizes Punjab has flown for generations, measured in tawa.',
    sortOrder: 1,
  },
  {
    slug: 'designer-kites',
    name: 'Colourful Designer Kites',
    nameUrdu: 'ڈیزائنر پتنگ',
    description: 'Bold multi-colour sails and printed patterns for a sky that stands out.',
    sortOrder: 2,
  },
  {
    slug: 'premium-kites',
    name: 'Premium Collection',
    nameUrdu: 'پریمیم پتنگ',
    description: 'Heavier paper, reinforced spars and tighter construction for serious flyers.',
    sortOrder: 3,
  },
  {
    slug: 'kids-kites',
    name: "Kids' Kites",
    nameUrdu: 'بچوں کی پتنگ',
    description: 'Small, light and forgiving — easy for young flyers to launch and keep up.',
    sortOrder: 4,
  },
  {
    slug: 'festival-special',
    name: 'Festival Special',
    nameUrdu: 'بسنت اسپیشل',
    description: 'Limited Basant designs released for the season.',
    sortOrder: 5,
  },
  {
    slug: 'dor-string',
    name: 'Dor & Pinna',
    nameUrdu: 'ڈور اور پنہ',
    description:
      'Plain cotton flying line on pinna. We do not stock metallic, glass-coated or chemically treated string of any kind.',
    sortOrder: 6,
  },
  {
    slug: 'charkhi-spools',
    name: 'Charkhi & Spools',
    nameUrdu: 'چرخی',
    description: 'Wooden and reinforced charkhi in several widths, plus spare handles.',
    sortOrder: 7,
  },
  {
    slug: 'accessories',
    name: 'Kite Accessories',
    nameUrdu: 'لوازمات',
    description: 'Hand protection, repair tape, carry bags and everything else for the roof.',
    sortOrder: 8,
  },
  {
    slug: 'basant-bundles',
    name: 'Basant Bundles',
    nameUrdu: 'بسنت بنڈل',
    description: 'Ready-made combinations of kites, line and spools at a bundle price.',
    sortOrder: 9,
  },
];

/* ── Products ───────────────────────────────────────────────────────────── */

/**
 * Variant colours double as the storefront's visual stand-in for photography,
 * so every variant carries a real swatch.
 */
const SWATCH = {
  yellow: '#FFC928',
  orange: '#FF8A00',
  pink: '#FF3D85',
  purple: '#673AB7',
  blue: '#39BDF8',
  green: '#2BD9A8',
  red: '#FF5F57',
  white: '#FFFFFF',
};

const products = [
  // ── Traditional guddas, priced by tawa ──
  {
    slug: 'white-gudda-1-tawa',
    name: 'White Gudda — 1 Tawa',
    nameUrdu: 'سفید گڈا',
    tagline: 'The everyday Basant kite',
    description:
      'The plain white gudda is the kite most people learn on. One tawa is the standard mid-size sail: large enough to hold a steady line in moderate wind, small enough to stay controllable from a rooftop. Bamboo spine and bowed cross-spar, hand-pasted paper sail.',
    category: 'traditional-kites',
    basePriceRs: 350,
    tawaSize: 1,
    material: 'Kite paper, bamboo spars',
    bundleEligible: true,
    isFeatured: true,
    variants: [
      { label: '1 Tawa — White', colorName: 'White', colorHex: SWATCH.white, sizeLabel: '1 Tawa', priceRs: 350, stock: 120 },
      { label: '1 Tawa — Yellow', colorName: 'Basant Yellow', colorHex: SWATCH.yellow, sizeLabel: '1 Tawa', priceRs: 365, stock: 90 },
    ],
  },
  {
    slug: 'multi-gudda-1-5-tawa',
    name: 'Multi-Colour Gudda — 1.5 Tawa',
    tagline: 'Bigger sail, stronger pull',
    description:
      'A tawa and a half of sail. The extra area catches more wind and pulls noticeably harder on the line, which is what most experienced flyers want on a good Basant morning. Two-tone paper across the cross-spar.',
    category: 'traditional-kites',
    basePriceRs: 475,
    tawaSize: 1.5,
    material: 'Kite paper, bamboo spars',
    bundleEligible: true,
    isFeatured: true,
    variants: [
      { label: '1.5 Tawa — Yellow / Pink', colorName: 'Yellow & Pink', colorHex: SWATCH.pink, sizeLabel: '1.5 Tawa', priceRs: 475, stock: 70 },
      { label: '1.5 Tawa — Orange / Purple', colorName: 'Orange & Purple', colorHex: SWATCH.purple, sizeLabel: '1.5 Tawa', priceRs: 475, stock: 55 },
      { label: '1.5 Tawa — Blue / White', colorName: 'Blue & White', colorHex: SWATCH.blue, sizeLabel: '1.5 Tawa', priceRs: 490, stock: 40 },
    ],
  },
  {
    slug: 'pona-gudda-0-75-tawa',
    name: 'Pona Gudda — 0.75 Tawa',
    tagline: 'Light wind specialist',
    description:
      'Three-quarters of a tawa. A pona goes up in wind that leaves bigger kites sitting on the roof, which makes it the one to reach for early in the morning or late in the afternoon.',
    category: 'traditional-kites',
    basePriceRs: 240,
    tawaSize: 0.75,
    material: 'Kite paper, bamboo spars',
    bundleEligible: true,
    variants: [
      { label: '0.75 Tawa — Assorted', colorName: 'Assorted', colorHex: SWATCH.green, sizeLabel: '0.75 Tawa', priceRs: 240, stock: 85 },
    ],
  },
  {
    slug: 'adda-gudda-0-5-tawa',
    name: 'Adda Gudda — 0.5 Tawa',
    tagline: 'Smallest traditional size',
    description:
      'Half a tawa. Quick, twitchy and cheap enough to fly without worrying about losing it. Popular for practice and for children moving up from a kids kite.',
    category: 'traditional-kites',
    basePriceRs: 220,
    tawaSize: 0.5,
    material: 'Kite paper, bamboo spars',
    bundleEligible: true,
    variants: [
      { label: '0.5 Tawa — Assorted', colorName: 'Assorted', colorHex: SWATCH.orange, sizeLabel: '0.5 Tawa', priceRs: 220, stock: 110 },
    ],
  },

  // ── Designer ──
  {
    slug: 'designer-tiranga-gudda',
    name: 'Designer Tiranga Gudda',
    tagline: 'Three-panel colour split',
    description:
      'A three-panel sail in contrasting colours, pasted so the bands stay crisp in the air. Same traditional frame underneath — the difference is purely how it looks against the sky.',
    category: 'designer-kites',
    basePriceRs: 520,
    tawaSize: 1.25,
    material: 'Coloured kite paper, bamboo spars',
    bundleEligible: true,
    isFeatured: true,
    variants: [
      { label: 'Yellow / Pink / Purple', colorName: 'Sunset', colorHex: SWATCH.pink, sizeLabel: '1.25 Tawa', priceRs: 520, stock: 48 },
      { label: 'Blue / White / Green', colorName: 'Sky', colorHex: SWATCH.blue, sizeLabel: '1.25 Tawa', priceRs: 520, stock: 36 },
    ],
  },
  {
    slug: 'patterned-gudda-set-5',
    name: 'Patterned Gudda — Set of 5',
    tagline: 'Five printed sails',
    description:
      'Five patterned kites in mixed designs, supplied flat. Works out cheaper per kite than buying singles and gives a varied sky from one roof.',
    category: 'designer-kites',
    basePriceRs: 2100,
    comparePriceRs: 2500,
    tawaSize: 1,
    material: 'Printed kite paper, bamboo spars',
    bundleEligible: true,
    variants: [
      { label: 'Set of 5 — Mixed', colorName: 'Mixed', colorHex: SWATCH.purple, sizeLabel: '1 Tawa ×5', priceRs: 2100, stock: 30 },
    ],
  },

  // ── Premium ──
  {
    slug: 'premium-gudda-2-tawa',
    name: 'Premium Gudda — 2 Tawa',
    tagline: 'Heavy paper, reinforced spine',
    description:
      'Our largest single kite. Thicker paper and a reinforced bamboo spine let it hold shape under real load, so it stays stable in wind that would fold a standard sail. Pulls hard — pair it with a wide charkhi.',
    category: 'premium-kites',
    basePriceRs: 950,
    tawaSize: 2,
    material: 'Heavy kite paper, reinforced bamboo',
    bundleEligible: true,
    isFeatured: true,
    variants: [
      { label: '2 Tawa — Yellow / Red', colorName: 'Yellow & Red', colorHex: SWATCH.red, sizeLabel: '2 Tawa', priceRs: 950, stock: 24 },
      { label: '2 Tawa — Purple / Yellow', colorName: 'Purple & Yellow', colorHex: SWATCH.purple, sizeLabel: '2 Tawa', priceRs: 950, stock: 18 },
    ],
  },

  // ── Kids ──
  {
    slug: 'kids-starter-kite',
    name: "Kids' Starter Kite",
    tagline: 'Light, tough and easy to launch',
    description:
      'A small plastic-film kite on a light frame. More forgiving than paper: it survives being dragged across a roof and goes up in very little wind. Supplied with a short length of cotton line on a small spool.',
    category: 'kids-kites',
    basePriceRs: 280,
    tawaSize: 0.5,
    material: 'Plastic film, fibreglass spars',
    bundleEligible: true,
    variants: [
      { label: 'Small — Assorted', colorName: 'Assorted', colorHex: SWATCH.green, sizeLabel: 'Small', priceRs: 280, stock: 95 },
    ],
  },

  // ── Dor: plain cotton only ──
  {
    slug: 'cotton-dor-pinna-standard',
    name: 'Cotton Dor on Pinna — Standard',
    nameUrdu: 'سوتی ڈور',
    tagline: 'Plain cotton line, no coating',
    description:
      'Plain cotton flying line wound on a pinna. Uncoated and untreated — no glass, no metal, no chemical dressing of any kind. This is the only type of line we sell. Roughly 900 metres per pinna.',
    category: 'dor-string',
    basePriceRs: 1450,
    material: '100% cotton, uncoated',
    bundleEligible: true,
    isFeatured: true,
    variants: [
      { label: 'Standard — 1 Pinna', colorName: 'Natural', colorHex: '#E8DCC8', sizeLabel: '1 Pinna', priceRs: 1450, stock: 60 },
      { label: 'Standard — 2 Pinna', colorName: 'Natural', colorHex: '#E8DCC8', sizeLabel: '2 Pinna', priceRs: 2800, stock: 35 },
    ],
  },
  {
    slug: 'cotton-dor-pinna-heavy',
    name: 'Cotton Dor on Pinna — Heavy',
    tagline: 'Thicker cotton for larger sails',
    description:
      'A heavier cotton line for 1.5 and 2 tawa kites, which load the line far harder than a standard gudda. Uncoated and untreated, same as all our line.',
    category: 'dor-string',
    basePriceRs: 1950,
    material: '100% cotton, uncoated',
    bundleEligible: true,
    variants: [
      { label: 'Heavy — 1 Pinna', colorName: 'Natural', colorHex: '#D8C8AE', sizeLabel: '1 Pinna', priceRs: 1950, stock: 42 },
    ],
  },

  // ── Charkhi ──
  {
    slug: 'wooden-charkhi-standard',
    name: 'Wooden Charkhi — Standard',
    nameUrdu: 'لکڑی کی چرخی',
    tagline: 'Hand-turned wooden spool',
    description:
      'A hand-turned wooden charkhi with smooth end discs and a through-handle. Holds one standard pinna comfortably. The classic two-handed spool most flyers grow up using.',
    category: 'charkhi-spools',
    basePriceRs: 1200,
    material: 'Seasoned wood',
    bundleEligible: true,
    isFeatured: true,
    variants: [
      { label: 'Standard — Natural', colorName: 'Natural Wood', colorHex: '#8B5E34', sizeLabel: 'Standard', priceRs: 1200, stock: 44 },
      { label: 'Standard — Painted', colorName: 'Painted', colorHex: SWATCH.yellow, sizeLabel: 'Standard', priceRs: 1350, stock: 28 },
    ],
  },
  {
    slug: 'wide-charkhi-premium',
    name: 'Wide Charkhi — Premium',
    tagline: 'For heavy line and big kites',
    description:
      'A wider barrel that takes two pinna and resists flexing when a 2 tawa kite is pulling. Reinforced discs and a longer handle for a steadier two-handed grip.',
    category: 'charkhi-spools',
    basePriceRs: 2400,
    material: 'Seasoned wood, reinforced discs',
    bundleEligible: true,
    variants: [
      { label: 'Wide — Natural', colorName: 'Natural Wood', colorHex: '#6B4A2A', sizeLabel: 'Wide', priceRs: 2400, stock: 16 },
    ],
  },

  // ── Accessories ──
  {
    slug: 'hand-protection-tape',
    name: 'Hand Protection Tape',
    tagline: 'Protects fingers from line burn',
    description:
      'Cloth tape for wrapping the fingers and palm before a long session. Even plain cotton line will cut into skin under load from a large kite.',
    category: 'accessories',
    basePriceRs: 300,
    material: 'Cotton tape',
    bundleEligible: true,
    variants: [
      { label: 'Single Roll', colorName: 'White', colorHex: SWATCH.white, sizeLabel: '1 Roll', priceRs: 300, stock: 150 },
      { label: 'Pack of 3', colorName: 'White', colorHex: SWATCH.white, sizeLabel: '3 Rolls', priceRs: 800, stock: 70 },
    ],
  },
  {
    slug: 'kite-carry-bag',
    name: 'Kite Carry Bag',
    tagline: 'Keeps sails flat and dry',
    description:
      'A flat padded sleeve that holds up to twenty kites without creasing them. Paper sails are fragile in transit and this is the difference between twenty kites and twenty torn kites.',
    category: 'accessories',
    basePriceRs: 750,
    material: 'Nylon, padded',
    bundleEligible: true,
    variants: [
      { label: 'Standard', colorName: 'Navy', colorHex: '#101B35', sizeLabel: 'Up to 20 kites', priceRs: 750, stock: 38 },
    ],
  },
  {
    slug: 'kite-repair-kit',
    name: 'Kite Repair Kit',
    tagline: 'Patch paper and splint spars',
    description:
      'Gummed paper patches, spare bamboo splints and glue. A torn sail or a cracked spar is a ten-minute repair rather than a lost kite.',
    category: 'accessories',
    basePriceRs: 450,
    material: 'Paper patches, bamboo, adhesive',
    bundleEligible: true,
    variants: [
      { label: 'Standard Kit', colorName: 'Mixed', colorHex: SWATCH.orange, sizeLabel: 'Kit', priceRs: 450, stock: 55 },
    ],
  },
];

/* ── Bundles, composed from the products above ──────────────────────────── */

const bundles = [
  {
    slug: 'basant-starter-bundle',
    name: 'Basant Starter Bundle',
    tagline: 'Everything a first-timer needs',
    description:
      'A complete first setup: five mixed guddas, one pinna of plain cotton dor, a standard wooden charkhi and a roll of hand tape. Enough to spend a full morning on the roof without needing anything else.',
    category: 'basant-bundles',
    basePriceRs: 3400,
    comparePriceRs: 3900,
    isFeatured: true,
    items: [
      { slug: 'white-gudda-1-tawa', quantity: 3 },
      { slug: 'adda-gudda-0-5-tawa', quantity: 2 },
      { slug: 'cotton-dor-pinna-standard', quantity: 1 },
      { slug: 'wooden-charkhi-standard', quantity: 1 },
      { slug: 'hand-protection-tape', quantity: 1 },
    ],
    variantLabel: 'Starter Bundle',
    stock: 25,
    colorHex: SWATCH.yellow,
  },
  {
    slug: 'basant-family-bundle',
    name: 'Basant Family Bundle',
    tagline: 'For a full roof of people',
    description:
      'Twelve kites across four sizes, two pinna of cotton dor, two charkhi and a carry bag. Sized for a household or a group sharing one rooftop.',
    category: 'basant-bundles',
    basePriceRs: 9500,
    comparePriceRs: 11200,
    isFeatured: true,
    items: [
      { slug: 'white-gudda-1-tawa', quantity: 4 },
      { slug: 'multi-gudda-1-5-tawa', quantity: 3 },
      { slug: 'pona-gudda-0-75-tawa', quantity: 3 },
      { slug: 'kids-starter-kite', quantity: 2 },
      { slug: 'cotton-dor-pinna-standard', quantity: 2 },
      { slug: 'wooden-charkhi-standard', quantity: 2 },
      { slug: 'kite-carry-bag', quantity: 1 },
    ],
    variantLabel: 'Family Bundle',
    stock: 12,
    colorHex: SWATCH.pink,
  },
  {
    slug: 'basant-premium-bundle',
    name: 'Basant Premium Bundle',
    tagline: 'Large sails and heavy line',
    description:
      'Built around the bigger kites: two premium 2 tawa guddas, three 1.5 tawa, heavy cotton dor and a wide charkhi that can take the load. For flyers who already know what they are doing.',
    category: 'basant-bundles',
    basePriceRs: 12800,
    items: [
      { slug: 'premium-gudda-2-tawa', quantity: 2 },
      { slug: 'multi-gudda-1-5-tawa', quantity: 3 },
      { slug: 'designer-tiranga-gudda', quantity: 2 },
      { slug: 'cotton-dor-pinna-heavy', quantity: 2 },
      { slug: 'wide-charkhi-premium', quantity: 1 },
      { slug: 'hand-protection-tape', quantity: 2 },
      { slug: 'kite-repair-kit', quantity: 1 },
    ],
    variantLabel: 'Premium Bundle',
    stock: 8,
    colorHex: SWATCH.purple,
  },
];

/* ── Delivery zones ─────────────────────────────────────────────────────── */

const deliveryZones = [
  { province: 'Punjab', city: 'Lahore', feeRs: 200, freeOverRs: 5000, codAvailable: true, estimateDays: '1-2 days' },
  { province: 'Punjab', city: 'Faisalabad', feeRs: 300, freeOverRs: 8000, codAvailable: true, estimateDays: '2-3 days' },
  { province: 'Punjab', city: 'Rawalpindi', feeRs: 300, freeOverRs: 8000, codAvailable: true, estimateDays: '2-3 days' },
  { province: 'Punjab', city: 'Gujranwala', feeRs: 250, freeOverRs: 6000, codAvailable: true, estimateDays: '2-3 days' },
  { province: 'Punjab', city: 'Multan', feeRs: 350, freeOverRs: 8000, codAvailable: true, estimateDays: '2-4 days' },
  { province: 'Punjab', city: 'Sialkot', feeRs: 300, freeOverRs: 8000, codAvailable: true, estimateDays: '2-3 days' },
  { province: 'Punjab', city: 'Sargodha', feeRs: 350, freeOverRs: 8000, codAvailable: true, estimateDays: '2-4 days' },
  { province: 'Punjab', city: 'Bahawalpur', feeRs: 400, freeOverRs: 10000, codAvailable: false, estimateDays: '3-5 days' },
  { province: 'Islamabad Capital Territory', city: 'Islamabad', feeRs: 300, freeOverRs: 8000, codAvailable: true, estimateDays: '2-3 days' },
];

/* ── Settings ───────────────────────────────────────────────────────────── */

const settings = {
  'store.name': 'Kites92',
  'store.tagline': 'Let Your Happiness Fly!',
  'store.email': 'hello@kites92.com',
  'store.phone': '+92 300 1234567',
  'store.address': 'Lahore, Punjab, Pakistan',

  'whatsapp.number': '923001234567',
  'whatsapp.greeting': 'Assalam-o-Alaikum! I have a question about an order on Kites92.',

  'payment.advancePercent': '50',
  'payment.bankName': 'REPLACE WITH YOUR BANK NAME',
  'payment.accountTitle': 'REPLACE WITH YOUR ACCOUNT TITLE',
  'payment.accountNumber': 'REPLACE WITH YOUR ACCOUNT / IBAN',
  'payment.instructions':
    'Send the advance payment to the account above and share the receipt on WhatsApp with your order number. Your order is confirmed once the receipt is received.',

  // Shown site-wide. Edit or blank it in the admin. Kept in the database
  // precisely because its accuracy depends on the current legal position,
  // which the code has no way to know.
  'notice.salesGate':
    'Kite flying is regulated in Punjab. Orders are accepted and dispatched only where and when flying is permitted under the current provincial position. Please confirm local permission before ordering.',

  'notice.safety':
    'We sell plain, uncoated cotton line only. We do not stock metallic, glass-coated or chemically treated string of any kind. Please never fly with coated or metallic line — it causes serious injuries and is prohibited.',

  'delivery.note': 'Delivery charges and availability depend on your city. Select your city at checkout to see the exact charge.',
  'returns.policy':
    'Refunds apply where stock is unavailable, delivery fails, or an order is cancelled before dispatch. Paper kites cannot be returned once handed over.',

  // Cleared from the admin once the real catalogue replaces this one.
  'catalogue.sampleData': 'true',
  'catalogue.sampleSeededAt': new Date().toISOString(),
};

/* ── Run ────────────────────────────────────────────────────────────────── */

async function main() {
  console.log('Seeding Kites92...\n');

  // Categories
  const categoryIds = {};
  for (const category of categories) {
    const row = await db.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    categoryIds[category.slug] = row.id;
  }
  console.log(`  categories    ${categories.length}`);

  // Products + variants
  const productIds = {};
  let variantCount = 0;
  for (const product of products) {
    const { variants, category, ...fields } = product;

    const row = await db.product.upsert({
      where: { slug: product.slug },
      update: { ...fields, status: 'ACTIVE', categoryId: categoryIds[category] },
      create: { ...fields, status: 'ACTIVE', categoryId: categoryIds[category] },
    });
    productIds[product.slug] = row.id;

    for (const [index, variant] of variants.entries()) {
      // SKU derived from the slug so re-running the seed updates rather than
      // duplicating.
      const sku = `K92-${product.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)}-${index + 1}`;
      await db.productVariant.upsert({
        where: { sku },
        update: { ...variant, productId: row.id, isActive: true },
        create: { ...variant, sku, productId: row.id, isActive: true },
      });
      variantCount++;
    }
  }
  console.log(`  products      ${products.length}`);
  console.log(`  variants      ${variantCount}`);

  // Bundles
  for (const bundle of bundles) {
    const { items, category, variantLabel, stock, colorHex, ...fields } = bundle;

    const row = await db.product.upsert({
      where: { slug: bundle.slug },
      update: { ...fields, status: 'ACTIVE', isBundle: true, categoryId: categoryIds[category] },
      create: { ...fields, status: 'ACTIVE', isBundle: true, categoryId: categoryIds[category] },
    });

    const sku = `K92-BUNDLE-${bundle.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}`;
    await db.productVariant.upsert({
      where: { sku },
      update: { label: variantLabel, priceRs: bundle.basePriceRs, stock, colorHex, productId: row.id, isActive: true },
      create: { sku, label: variantLabel, priceRs: bundle.basePriceRs, stock, colorHex, productId: row.id, isActive: true },
    });

    // Rebuild the component list so edits to the seed take effect.
    await db.bundleItem.deleteMany({ where: { bundleId: row.id } });
    for (const item of items) {
      const itemId = productIds[item.slug];
      if (!itemId) {
        console.warn(`    ! bundle "${bundle.slug}" references unknown product "${item.slug}"`);
        continue;
      }
      await db.bundleItem.create({
        data: { bundleId: row.id, itemId, quantity: item.quantity },
      });
    }
  }
  console.log(`  bundles       ${bundles.length}`);

  // Delivery zones
  for (const zone of deliveryZones) {
    await db.deliveryZone.upsert({
      where: { province_city: { province: zone.province, city: zone.city } },
      update: zone,
      create: zone,
    });
  }
  console.log(`  zones         ${deliveryZones.length}`);

  // Settings
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`  settings      ${Object.keys(settings).length}`);

  // Admin account
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    await db.user.upsert({
      where: { email: adminEmail },
      update: { role: 'ADMIN' },
      create: {
        email: adminEmail,
        name: 'Store Owner',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash(adminPassword, 12),
      },
    });
    console.log(`  admin         ${adminEmail}`);
  } else {
    console.log('  admin         skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD)');
  }

  console.log(`
  reviews       0  — intentionally empty.
                     Only genuine, staff-approved customer reviews are shown.
  images        0  — intentionally empty.
                     Upload real product photography from the admin; until
                     then the storefront draws a kite motif from each
                     variant's colour swatch.

  NOTE: this is SAMPLE data. Replace the products, prices, stock and the
        payment.* settings with your real details before taking orders.
        Clear the "catalogue.sampleData" setting once you have.
`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
