import 'server-only';
import { db } from '@/lib/db';

/**
 * Run a read that the page can survive without.
 *
 * If the database is unreachable, a storefront is better off rendering its
 * shell — navigation, branding, contact details — than returning a 500 to
 * every visitor. The failure is logged loudly so an outage is still visible
 * in the server log rather than silently swallowed.
 *
 * This is deliberately NOT used for checkout, product detail or any read that
 * decides what a customer is charged. There, a database failure must surface
 * as an error: showing a product page with missing prices or stale stock is
 * worse than showing nothing.
 */
async function optional<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[db] "${label}" failed; rendering without it.`, error);
    return fallback;
  }
}

/**
 * A read whose failure the page must be able to tell apart from an empty
 * result.
 *
 * `optional` collapses the two: an outage arrives as `[]`. That is right for a
 * homepage band, which simply does not render. It is wrong wherever the page
 * then makes a claim about what it found - "0 products", "no matches for your
 * search", `notFound()` on a collection that has not gone anywhere. Those are
 * false statements about the business, not missing decoration.
 *
 * Reads behind a page's main content return this instead, so the page can say
 * which of the two actually happened.
 */
export type ReadResult<T> = { ok: true; data: T } | { ok: false };

async function attempt<T>(label: string, run: () => Promise<T>): Promise<ReadResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    console.error(`[db] "${label}" is unavailable.`, error);
    return { ok: false };
  }
}

/**
 * Server-side catalogue reads.
 *
 * Every query selects explicit fields rather than returning whole rows. That
 * keeps password hashes and admin notes from ever reaching a client component
 * by accident, and keeps the payload that Next serialises into the HTML small
 * — which matters on a page that is already shipping a 3D engine.
 */

/** Shape the storefront needs to render a product card. */
const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  nameUrdu: true,
  tagline: true,
  basePriceRs: true,
  comparePriceRs: true,
  isBundle: true,
  tawaSize: true,
  images: {
    select: { url: true, alt: true },
    orderBy: { sortOrder: 'asc' },
    take: 1,
  },
  variants: {
    where: { isActive: true },
    select: { id: true, priceRs: true, stock: true, colorHex: true },
  },
  category: { select: { slug: true, name: true } },
} as const;

export type ProductCard = Awaited<ReturnType<typeof getFeaturedProducts>>[number];

export async function getFeaturedProducts(limit = 8) {
  return optional('featured products', () => db.product.findMany({
    where: { status: 'ACTIVE', isFeatured: true },
    select: productCardSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  }), []);
}

function readCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      nameUrdu: true,
      description: true,
      imageUrl: true,
      _count: { select: { products: { where: { status: 'ACTIVE' } } } },
    },
  });
}

/**
 * Categories, graceful - for the homepage band and the shop's filter rail,
 * neither of which is *about* categories. Both are fine without them.
 */
export async function getCategories() {
  return optional('categories', readCategories, []);
}

/**
 * Categories for `/categories`, where they are the whole page.
 *
 * "No categories yet" is true of a fresh install and false during an outage,
 * and an empty array cannot tell the page which it is looking at.
 */
export async function tryCategories() {
  return attempt('categories', readCategories);
}

/**
 * A collection (a category with its own page) by slug.
 *
 * `{ ok: true, data: null }` means there is no such collection and the page
 * should 404. `{ ok: false }` means we could not look it up, which must not
 * 404 - a 404 tells crawlers to drop a page that is perfectly fine.
 */
export async function getCollection(slug: string) {
  return attempt(`collection:${slug}`, () =>
    db.category.findFirst({
      where: { slug, isActive: true },
      select: { name: true, nameUrdu: true, description: true },
    }),
  );
}

export interface ProductFilters {
  categorySlug?: string;
  search?: string;
  minPriceRs?: number;
  maxPriceRs?: number;
  /** Hide anything with no stock on any active variant. */
  inStockOnly?: boolean;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'name';
  page?: number;
  perPage?: number;
}

/**
 * Paginated, filtered product listing.
 *
 * Returns the total alongside the rows so the caller can render pagination
 * without a second round trip, and reports an unreadable catalogue as
 * `{ ok: false }` rather than as zero results - see `ReadResult`.
 */
export async function listProducts(filters: ProductFilters = {}) {
  const {
    categorySlug,
    search,
    minPriceRs,
    maxPriceRs,
    inStockOnly,
    sort = 'newest',
    page = 1,
    perPage = 12,
  } = filters;

  const where = {
    status: 'ACTIVE' as const,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { tagline: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
    ...(minPriceRs != null || maxPriceRs != null
      ? {
          basePriceRs: {
            ...(minPriceRs != null ? { gte: minPriceRs } : {}),
            ...(maxPriceRs != null ? { lte: maxPriceRs } : {}),
          },
        }
      : {}),
    // "In stock" means at least one active variant with stock, which is where
    // stock actually lives.
    ...(inStockOnly ? { variants: { some: { isActive: true, stock: { gt: 0 } } } } : {}),
  };

  const orderBy =
    sort === 'price-asc'
      ? { basePriceRs: 'asc' as const }
      : sort === 'price-desc'
        ? { basePriceRs: 'desc' as const }
        : sort === 'name'
          ? { name: 'asc' as const }
          : { createdAt: 'desc' as const };

  return attempt('product listing', async () => {
    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        select: productCardSelect,
        orderBy,
        skip: (Math.max(page, 1) - 1) * perPage,
        take: perPage,
      }),
      db.product.count({ where }),
    ]);

    return { items, total, page, perPage, pageCount: Math.ceil(total / perPage) };
  });
}

/**
 * One product, or `null` if there is no such product.
 *
 * Wrapped in `attempt` so the page can tell a slug that does not exist from a
 * database it cannot reach. Both used to arrive as `null`, and `notFound()` on
 * an outage tells the customer a kite has been discontinued when it has not.
 *
 * This only guards *whether* the row could be read. The row itself is still
 * used strictly: a product is never rendered with a partial price.
 */
export async function getProductBySlug(slug: string) {
  return attempt(`product:${slug}`, () => db.product.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true,
      slug: true,
      name: true,
      nameUrdu: true,
      tagline: true,
      description: true,
      basePriceRs: true,
      comparePriceRs: true,
      isBundle: true,
      tawaSize: true,
      material: true,
      metaTitle: true,
      metaDescription: true,
      category: { select: { slug: true, name: true } },
      images: { select: { url: true, alt: true }, orderBy: { sortOrder: 'asc' } },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          label: true,
          colorName: true,
          colorHex: true,
          sizeLabel: true,
          priceRs: true,
          stock: true,
        },
        orderBy: { priceRs: 'asc' },
      },
      bundleItems: {
        select: {
          quantity: true,
          item: {
            select: {
              slug: true,
              name: true,
              basePriceRs: true,
              images: { select: { url: true, alt: true }, take: 1 },
            },
          },
        },
      },
      // Only approved reviews are ever exposed.
      reviews: {
        where: { isApproved: true },
        select: { id: true, authorName: true, rating: true, title: true, body: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  }));
}

function readBundleEligibleProducts() {
  return db.product.findMany({
    where: { status: 'ACTIVE', bundleEligible: true },
    select: productCardSelect,
    orderBy: { basePriceRs: 'asc' },
  });
}

/** Products the customer may combine in the bundle builder, graceful. */
export async function getBundleEligibleProducts() {
  return optional('bundle-eligible products', readBundleEligibleProducts, []);
}

/** The same, for `/bundle-builder`, where they are the page rather than a band. */
export async function tryBundleEligibleProducts() {
  return attempt('bundle-eligible products', readBundleEligibleProducts);
}

/**
 * "You might also like" - a band, not the page.
 *
 * Graceful: if this fails after the product itself loaded, the right answer is
 * to show the product without suggestions, not to lose the sale.
 */
export async function getRelatedProducts(productId: string, categorySlug?: string, limit = 4) {
  return optional('related products', () => db.product.findMany({
    where: {
      status: 'ACTIVE',
      id: { not: productId },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    select: productCardSelect,
    take: limit,
  }), []);
}

/** Approved reviews across the catalogue, for the homepage testimonials. */
export async function getApprovedReviews(limit = 8) {
  return optional('approved reviews', () => db.review.findMany({
    where: { isApproved: true },
    select: {
      id: true,
      authorName: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  }), []);
}

/**
 * Delivery zones, raw.
 *
 * Allowed to throw. A checkout with no zones cannot price delivery or tell COD
 * from bank transfer, and degrading to an empty list would present "no cities
 * available" as a fact about coverage rather than a database outage - taking,
 * or silently blocking, orders on the strength of a connection failure.
 *
 * Callers go through one of the two wrappers below rather than calling this
 * directly, so the failure is handled deliberately in both places.
 */
export async function requireDeliveryZones() {
  return db.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: [{ province: 'asc' }, { city: 'asc' }],
    select: {
      id: true,
      province: true,
      city: true,
      feeRs: true,
      freeOverRs: true,
      codAvailable: true,
      estimateDays: true,
    },
  });
}

/**
 * Delivery zones, graceful — for the public `/delivery` page.
 *
 * That page already renders a "no zones configured" state, but the strict
 * read threw before it could reach that branch, so the page 500'd instead of
 * showing its own empty state. Nothing is charged or promised here, so
 * degrading is safe; see `requireDeliveryZones` for where it is not.
 */
export async function getDeliveryZones() {
  return optional('deliveryZones', requireDeliveryZones, []);
}

/**
 * Delivery zones for `/checkout`.
 *
 * Checkout needs the distinction, not the fallback: it must withhold the order
 * form when zones are unreadable, but say so as our fault rather than crash or
 * - worse - show a form that cannot price what it is about to charge.
 */
export async function tryDeliveryZones() {
  return attempt('delivery zones', requireDeliveryZones);
}

/**
 * Site settings as a plain record.
 *
 * Settings hold the claims this business makes — delivery promises, bank
 * details, the Basant sales notice — so they live in the database and are
 * editable, never hardcoded in a component.
 */
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await optional(
    'settings',
    () => db.setting.findMany({ select: { key: true, value: true } }),
    [] as { key: string; value: string }[],
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/**
 * One setting, with a fallback.
 *
 * Wrapped for the same reason as the settings bulk read: a single cosmetic
 * value — a WhatsApp number for a help link — must not be able to take a
 * page down. `/track` was returning 500 for exactly that.
 */
/**
 * The storefront WhatsApp number.
 *
 * Falls back to the build-time env var, because the number in settings lives
 * in the same database that has just failed - and an outage is exactly when a
 * customer most needs a way to reach a human.
 */
export async function getWhatsappNumber(): Promise<string> {
  return (
    (await getSetting('whatsapp.number')) ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    ''
  );
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const row = await optional(
    `setting:${key}`,
    () => db.setting.findUnique({ where: { key }, select: { value: true } }),
    null,
  );
  return row?.value ?? fallback;
}
