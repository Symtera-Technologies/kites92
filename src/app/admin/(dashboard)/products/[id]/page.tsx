import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatPkr } from '@/lib/commerce/money';
import { MAX_UPLOAD_BYTES } from '@/lib/media';
import { Notice } from '@/components/admin/Notice';
import {
  addProductImage,
  createVariant,
  deleteProduct,
  deleteProductImage,
  deleteVariant,
  moveProductImage,
  toggleVariantActive,
  updateImageAlt,
  updateProductDetails,
  updateVariantDetails,
} from '../../../catalogue-actions';

export const dynamic = 'force-dynamic';

/**
 * The full product editor.
 *
 * Plain forms posting to server actions, no client components. The admin is
 * used over a phone connection on a rooftop in February; every field here
 * works with JavaScript switched off, and the only state is in the database.
 *
 * Each section saves on its own. One Save button for the lot would mean a
 * rejected price losing a rewritten description.
 */
type Params = Promise<{ id: string }>;
type Search = Promise<{ notice?: string }>;

const field =
  'w-full rounded-xl border border-navy-900/15 bg-white px-3 py-2.5 text-sm focus:border-royal focus:outline-none';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy-900/55';
const card = 'mt-6 rounded-2xl border border-navy-900/10 bg-white p-6';
const sectionHeading = 'font-display text-lg font-bold';
const primary =
  'rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream hover:bg-navy-800';
const small =
  'rounded-lg border border-navy-900/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-navy-900/70 hover:border-navy-900/35 hover:text-navy-900';

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { name: true } });
  return { title: product ? `${product.name} — edit` : 'Product' };
}

export default async function ProductEditorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const { notice } = await searchParams;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: [{ isActive: 'desc' }, { priceRs: 'asc' }] },
        partOf: { select: { bundle: { select: { id: true, name: true } } } },
        _count: { select: { orderItems: true, reviews: true } },
      },
    }),
    db.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  if (!product) notFound();

  const here = `/admin/products/${product.id}`;
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const cheapest = activeVariants.reduce<number | null>(
    (lowest, variant) => (lowest === null || variant.priceRs < lowest ? variant.priceRs : lowest),
    null,
  );
  // The storefront prints basePriceRs as the "from" figure, so a mismatch
  // advertises a price no variant actually charges.
  const priceMismatch = cheapest !== null && cheapest !== product.basePriceRs;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm font-semibold text-royal hover:underline">
        ← Products
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-extrabold">{product.name}</h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${
            product.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-navy-900/10 text-navy-900/60'
          }`}
        >
          {product.status.toLowerCase()}
        </span>
        <Link
          href={`/product/${product.slug}`}
          target="_blank"
          className="ml-auto text-sm font-semibold text-royal hover:underline"
        >
          View on site ↗
        </Link>
      </div>

      <p className="mt-1 text-sm text-navy-900/55">
        /product/{product.slug}
        {product.isBundle && ' · bundle'}
        {product._count.orderItems > 0 && ` · ordered ${product._count.orderItems} time(s)`}
        {product._count.reviews > 0 && ` · ${product._count.reviews} review(s)`}
      </p>

      <Notice code={notice} dismissTo={here} />

      {/* ─────────────────────────────  Details  ───────────────────────────── */}

      <form action={updateProductDetails} className={card}>
        <input type="hidden" name="productId" value={product.id} />
        <h2 className={sectionHeading}>Details</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className={label}>
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={product.name}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="nameUrdu" className={label}>
              Name in Urdu
            </label>
            <input
              id="nameUrdu"
              name="nameUrdu"
              dir="rtl"
              lang="ur"
              maxLength={120}
              defaultValue={product.nameUrdu ?? ''}
              className={`font-urdu ${field}`}
            />
          </div>

          <div>
            <label htmlFor="slug" className={label}>
              Web address
            </label>
            <input
              id="slug"
              name="slug"
              maxLength={120}
              defaultValue={product.slug}
              className={`font-mono ${field}`}
            />
            <p className="mt-1.5 text-xs text-navy-900/50">
              Changing this breaks existing links to the product.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="tagline" className={label}>
              Tagline
            </label>
            <input
              id="tagline"
              name="tagline"
              maxLength={160}
              defaultValue={product.tagline ?? ''}
              className={field}
            />
            <p className="mt-1.5 text-xs text-navy-900/50">
              One short line, shown on cards and on hover in the 3D gallery.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className={label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={product.description ?? ''}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="categoryId" className={label}>
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={product.categoryId ?? ''}
              className={field}
            >
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.isActive && ' (hidden)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className={label}>
              Status
            </label>
            <select id="status" name="status" defaultValue={product.status} className={field}>
              <option value="DRAFT">Draft — not on the storefront</option>
              <option value="ACTIVE">Published</option>
              <option value="ARCHIVED">Archived — kept for records</option>
            </select>
          </div>

          <div>
            <label htmlFor="basePriceRs" className={label}>
              Price from (Rs)
            </label>
            <input
              id="basePriceRs"
              name="basePriceRs"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={product.basePriceRs}
              className={`tnum ${field}`}
            />
            {priceMismatch && (
              <p className="mt-1.5 text-xs font-semibold text-festival-600">
                Cheapest variant is {formatPkr(cheapest)}. Cards will say “from{' '}
                {formatPkr(product.basePriceRs)}”, which no variant charges.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="comparePriceRs" className={label}>
              Was (Rs)
            </label>
            <input
              id="comparePriceRs"
              name="comparePriceRs"
              type="number"
              min={0}
              step={1}
              defaultValue={product.comparePriceRs ?? ''}
              className={`tnum ${field}`}
            />
            <p className="mt-1.5 text-xs text-navy-900/50">
              Struck through next to the price. Leave empty unless it is genuinely a reduction.
            </p>
          </div>

          <div>
            <label htmlFor="tawaSize" className={label}>
              Size (tawa)
            </label>
            <input
              id="tawaSize"
              name="tawaSize"
              type="number"
              min={0}
              step="0.25"
              defaultValue={product.tawaSize ?? ''}
              className={`tnum ${field}`}
            />
            <p className="mt-1.5 text-xs text-navy-900/50">Leave empty for anything that is not a kite.</p>
          </div>

          <div>
            <label htmlFor="material" className={label}>
              Material
            </label>
            <input
              id="material"
              name="material"
              maxLength={120}
              defaultValue={product.material ?? ''}
              className={field}
            />
          </div>

          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={product.isFeatured}
                className="h-4 w-4 rounded border-navy-900/25 text-royal focus:ring-royal"
              />
              Feature on the homepage
            </label>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="bundleEligible"
                defaultChecked={product.bundleEligible}
                className="h-4 w-4 rounded border-navy-900/25 text-royal focus:ring-royal"
              />
              Allow in the bundle builder
            </label>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="metaTitle" className={label}>
              Search title
            </label>
            <input
              id="metaTitle"
              name="metaTitle"
              maxLength={160}
              defaultValue={product.metaTitle ?? ''}
              className={field}
            />
            <p className="mt-1.5 text-xs text-navy-900/50">
              Empty is fine — the product name is used instead.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="metaDescription" className={label}>
              Search description
            </label>
            <textarea
              id="metaDescription"
              name="metaDescription"
              rows={3}
              maxLength={320}
              defaultValue={product.metaDescription ?? ''}
              className={field}
            />
          </div>
        </div>

        <button type="submit" className={`mt-6 ${primary}`}>
          Save details
        </button>
      </form>

      {/* ───────────────────────────  Photographs  ─────────────────────────── */}

      <section className={card}>
        <h2 className={sectionHeading}>Photographs</h2>
        <p className="mt-2 text-sm text-navy-900/60">
          {product.images.length === 0
            ? 'None yet, so the product page is showing the 3D illustration and saying so. A real photograph replaces it everywhere.'
            : 'The first one is used on cards, in the basket and in link previews.'}
        </p>

        {product.images.length > 0 && (
          <ul className="mt-5 space-y-4">
            {product.images.map((image, index) => (
              <li
                key={image.id}
                className="flex flex-wrap items-start gap-4 rounded-xl border border-navy-900/10 p-4"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-navy-900/5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded media, served unoptimised from /api/media */}
                  <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                  {index === 0 && (
                    <span className="absolute left-0 top-0 rounded-br-lg bg-navy-900 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-cream">
                      Main
                    </span>
                  )}
                </div>

                <form action={updateImageAlt} className="min-w-56 flex-1">
                  <input type="hidden" name="imageId" value={image.id} />
                  <label htmlFor={`alt-${image.id}`} className={label}>
                    What is in the picture
                  </label>
                  <textarea
                    id={`alt-${image.id}`}
                    name="alt"
                    rows={2}
                    required
                    minLength={4}
                    maxLength={300}
                    defaultValue={image.alt}
                    className={field}
                  />
                  <button type="submit" className={`mt-2 ${small}`}>
                    Save description
                  </button>
                </form>

                <div className="flex shrink-0 flex-col gap-2">
                  <div className="flex gap-2">
                    <form action={moveProductImage}>
                      <input type="hidden" name="imageId" value={image.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        className={small}
                        aria-label="Move earlier"
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveProductImage}>
                      <input type="hidden" name="imageId" value={image.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        className={small}
                        aria-label="Move later"
                        disabled={index === product.images.length - 1}
                      >
                        ↓
                      </button>
                    </form>
                  </div>
                  <form action={deleteProductImage}>
                    <input type="hidden" name="imageId" value={image.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-vibrant/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-vibrant-600 hover:bg-vibrant/5"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addProductImage}
          className="mt-6 rounded-xl border border-dashed border-navy-900/20 p-5"
        >
          <input type="hidden" name="productId" value={product.id} />
          <h3 className="text-sm font-bold">Add a photograph</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="file" className={label}>
                Image file
              </label>
              <input
                id="file"
                name="file"
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-cream"
              />
              <p className="mt-1.5 text-xs text-navy-900/50">
                JPEG, PNG, WebP or AVIF, up to {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.
              </p>
            </div>

            <div>
              <label htmlFor="new-alt" className={label}>
                What is in the picture
              </label>
              <textarea
                id="new-alt"
                name="alt"
                rows={2}
                required
                minLength={4}
                maxLength={300}
                className={field}
              />
              <p className="mt-1.5 text-xs text-navy-900/50">
                Read out by screen readers and indexed by Google. One picture at a time, so each
                gets its own description.
              </p>
            </div>
          </div>

          <button type="submit" className={`mt-4 ${primary}`}>
            Upload
          </button>
        </form>
      </section>

      {/* ────────────────────────────  Variants  ──────────────────────────── */}

      <section className={card}>
        <h2 className={sectionHeading}>Variants</h2>
        <p className="mt-2 text-sm text-navy-900/60">
          {product.variants.length === 0
            ? 'None yet. A product with no variant has nothing to add to a basket, so it cannot be published.'
            : 'Each one is a separate SKU with its own price and stock. This is what a customer actually buys.'}
        </p>

        {product.variants.length > 0 && (
          <ul className="mt-5 space-y-4">
            {product.variants.map((variant) => (
              <li key={variant.id} className="rounded-xl border border-navy-900/10 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-navy-900/50">{variant.sku}</span>
                  {!variant.isActive && (
                    <span className="rounded-full bg-navy-900/10 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-navy-900/60">
                      hidden
                    </span>
                  )}
                  <span className="tnum ml-auto text-sm font-bold">
                    {formatPkr(variant.priceRs)}
                  </span>
                </div>

                <form action={updateVariantDetails}>
                  <input type="hidden" name="variantId" value={variant.id} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label htmlFor={`label-${variant.id}`} className={label}>
                        Label
                      </label>
                      <input
                        id={`label-${variant.id}`}
                        name="label"
                        required
                        maxLength={120}
                        defaultValue={variant.label}
                        className={field}
                      />
                    </div>
                    <div>
                      <label htmlFor={`sku-${variant.id}`} className={label}>
                        SKU
                      </label>
                      <input
                        id={`sku-${variant.id}`}
                        name="sku"
                        maxLength={60}
                        defaultValue={variant.sku}
                        className={`font-mono ${field}`}
                      />
                    </div>
                    <div>
                      <label htmlFor={`vprice-${variant.id}`} className={label}>
                        Price (Rs)
                      </label>
                      <input
                        id={`vprice-${variant.id}`}
                        name="priceRs"
                        type="number"
                        min={1}
                        step={1}
                        required
                        defaultValue={variant.priceRs}
                        className={`tnum ${field}`}
                      />
                    </div>
                    <div>
                      <label htmlFor={`vstock-${variant.id}`} className={label}>
                        Stock
                      </label>
                      <input
                        id={`vstock-${variant.id}`}
                        name="stock"
                        type="number"
                        min={0}
                        step={1}
                        required
                        defaultValue={variant.stock}
                        className={`tnum ${field}`}
                      />
                    </div>
                    <div>
                      <label htmlFor={`vsize-${variant.id}`} className={label}>
                        Size label
                      </label>
                      <input
                        id={`vsize-${variant.id}`}
                        name="sizeLabel"
                        maxLength={60}
                        defaultValue={variant.sizeLabel ?? ''}
                        className={field}
                      />
                    </div>
                    <div>
                      <label htmlFor={`vcolor-${variant.id}`} className={label}>
                        Colour
                      </label>
                      <input
                        id={`vcolor-${variant.id}`}
                        name="colorName"
                        maxLength={60}
                        defaultValue={variant.colorName ?? ''}
                        className={field}
                      />
                    </div>
                    <div>
                      <label htmlFor={`vhex-${variant.id}`} className={label}>
                        Swatch
                      </label>
                      <input
                        id={`vhex-${variant.id}`}
                        name="colorHex"
                        maxLength={7}
                        placeholder="#1f3a93"
                        defaultValue={variant.colorHex ?? ''}
                        className={`font-mono ${field}`}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button type="submit" className={small}>
                      Save variant
                    </button>
                  </div>
                </form>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={toggleVariantActive}>
                    <input type="hidden" name="variantId" value={variant.id} />
                    <button type="submit" className={small}>
                      {variant.isActive ? 'Hide from storefront' : 'Show on storefront'}
                    </button>
                  </form>
                  <form action={deleteVariant}>
                    <input type="hidden" name="variantId" value={variant.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-vibrant/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-vibrant-600 hover:bg-vibrant/5"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={createVariant}
          className="mt-6 rounded-xl border border-dashed border-navy-900/20 p-5"
        >
          <input type="hidden" name="productId" value={product.id} />
          <h3 className="text-sm font-bold">Add a variant</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="new-label" className={label}>
                Label
              </label>
              <input
                id="new-label"
                name="label"
                required
                maxLength={120}
                placeholder="1.5 Tawa — Multi"
                className={field}
              />
            </div>
            <div>
              <label htmlFor="new-sku" className={label}>
                SKU
              </label>
              <input
                id="new-sku"
                name="sku"
                maxLength={60}
                className={`font-mono ${field}`}
              />
              <p className="mt-1.5 text-xs text-navy-900/50">Built from the name if left empty.</p>
            </div>
            <div>
              <label htmlFor="new-price" className={label}>
                Price (Rs)
              </label>
              <input
                id="new-price"
                name="priceRs"
                type="number"
                min={1}
                step={1}
                required
                className={`tnum ${field}`}
              />
            </div>
            <div>
              <label htmlFor="new-stock" className={label}>
                Stock
              </label>
              <input
                id="new-stock"
                name="stock"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={0}
                className={`tnum ${field}`}
              />
            </div>
            <div>
              <label htmlFor="new-size" className={label}>
                Size label
              </label>
              <input id="new-size" name="sizeLabel" maxLength={60} className={field} />
            </div>
            <div>
              <label htmlFor="new-color" className={label}>
                Colour
              </label>
              <input id="new-color" name="colorName" maxLength={60} className={field} />
            </div>
            <div>
              <label htmlFor="new-hex" className={label}>
                Swatch
              </label>
              <input
                id="new-hex"
                name="colorHex"
                maxLength={7}
                placeholder="#1f3a93"
                className={`font-mono ${field}`}
              />
            </div>
          </div>

          <button type="submit" className={`mt-4 ${primary}`}>
            Add variant
          </button>
        </form>
      </section>

      {/* ─────────────────────────────  Delete  ───────────────────────────── */}

      <section className="mt-6 rounded-2xl border border-vibrant/30 bg-vibrant/5 p-6">
        <h2 className={sectionHeading}>Delete this product</h2>
        <p className="mt-2 text-sm text-navy-900/70">
          Removes the product, its variants and its uploaded photographs. Past orders are not
          touched — each line keeps its own copy of the name and the price it was sold at.
          {product._count.reviews > 0 &&
            ` ${product._count.reviews} review(s) will go with it.`}
          {product.partOf.length > 0 &&
            ` It is part of ${product.partOf.length} bundle(s), which will be left short an item.`}
        </p>

        <form action={deleteProduct} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="productId" value={product.id} />
          <div>
            <label htmlFor="confirmSlug" className={label}>
              Type <span className="font-mono">{product.slug}</span> to confirm
            </label>
            <input
              id="confirmSlug"
              name="confirmSlug"
              required
              autoComplete="off"
              className={`font-mono ${field} sm:w-80`}
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-vibrant-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-vibrant-500"
          >
            Delete permanently
          </button>
        </form>
      </section>
    </div>
  );
}
