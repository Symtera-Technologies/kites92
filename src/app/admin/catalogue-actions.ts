'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { deleteStoredImage, saveImage } from '@/lib/media';
import { slugify } from '@/lib/utils';

/**
 * Catalogue writes: products, their photographs and their variants.
 *
 * Split from `./actions.ts` — which handles sessions, orders, reviews and
 * settings — because this is the one area with enough fields to be worth
 * reading on its own.
 *
 * Every action calls `requireAdmin()` first. A server action is a POST
 * endpoint to anyone who learns its id; being rendered inside an admin page
 * is not access control.
 *
 * Outcomes travel back as a `?notice=` code rather than as returned state.
 * The editor is a page of a dozen small forms, and threading `useActionState`
 * through each would make every one of them a client component for the sake
 * of one line of text. The codes are a closed set, turned into sentences in
 * the page that renders them, so nothing a caller supplies is ever reflected.
 */

const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

function toEditor(id: string, notice: string): never {
  redirect(`/admin/products/${id}?notice=${notice}`);
}

/** Blank form fields are absent values, not empty strings in the database. */
function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : null;
}

function intOrNull(value: FormDataEntryValue | null): number | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function checked(value: FormDataEntryValue | null): boolean {
  return value === 'on' || value === '1' || value === 'true';
}

/** Refresh every storefront surface a product appears on. */
function revalidateProduct(slug: string | null) {
  if (slug) revalidatePath(`/product/${slug}`);
  revalidatePath('/shop');
  revalidatePath('/categories');
  revalidatePath('/bundle-builder');
  revalidatePath('/');
  revalidatePath('/admin/products');
}

/** A slug nobody else is using, by appending -2, -3 … if needed. */
async function freeSlug(base: string, excludeId?: string): Promise<string | null> {
  if (!base) return null;

  for (let attempt = 1; attempt <= 25; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const clash = await db.product.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return null;
}

// ───────────────────────────────  Products  ───────────────────────────────

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  basePriceRs: z.coerce.number().int().min(1).max(10_000_000),
});

/**
 * Start a product.
 *
 * Only the three things needed to have a row at all; the rest is the editor's
 * job. New products are always DRAFT — nothing reaches the storefront before
 * someone has looked at it.
 */
export async function createProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = CreateSchema.safeParse({
    name: formData.get('name'),
    basePriceRs: formData.get('basePriceRs'),
  });
  if (!parsed.success) redirect('/admin/products/new?notice=invalid');

  const slug = await freeSlug(slugify(parsed.data.name));
  // Only reachable from a name with no letters or digits in it at all.
  if (!slug) redirect('/admin/products/new?notice=slug-impossible');

  const categoryId = textOrNull(formData.get('categoryId'));

  const product = await db.product.create({
    data: {
      name: parsed.data.name,
      slug,
      basePriceRs: parsed.data.basePriceRs,
      status: 'DRAFT',
      ...(categoryId ? { categoryId } : {}),
    },
    select: { id: true },
  });

  revalidatePath('/admin/products');
  toEditor(product.id, 'created');
}

const DetailsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  status: z.enum(STATUSES),
  basePriceRs: z.coerce.number().int().min(1).max(10_000_000),
});

export async function updateProductDetails(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('productId') ?? '');
  if (!id) redirect('/admin/products');

  const existing = await db.product.findUnique({
    where: { id },
    select: { slug: true, variants: { where: { isActive: true }, select: { id: true } } },
  });
  if (!existing) redirect('/admin/products?notice=gone');

  const parsed = DetailsSchema.safeParse({
    name: formData.get('name'),
    status: formData.get('status'),
    basePriceRs: formData.get('basePriceRs'),
  });
  if (!parsed.success) toEditor(id, 'invalid');

  // A live product with nothing purchasable on it is a page with a dead buy
  // button. Refuse rather than publish one.
  if (parsed.data.status === 'ACTIVE' && existing.variants.length === 0) {
    toEditor(id, 'no-variants');
  }

  const comparePriceRs = intOrNull(formData.get('comparePriceRs'));
  if (comparePriceRs !== null && comparePriceRs <= parsed.data.basePriceRs) {
    // A struck-through price at or below the asking price is a false discount.
    toEditor(id, 'compare-price');
  }

  const requestedSlug = textOrNull(formData.get('slug'));
  const slug = await freeSlug(slugify(requestedSlug ?? parsed.data.name), id);
  if (!slug) toEditor(id, 'slug-impossible');

  const tawaRaw = textOrNull(formData.get('tawaSize'));
  const tawaSize = tawaRaw === null ? null : Number(tawaRaw);
  if (tawaSize !== null && (!Number.isFinite(tawaSize) || tawaSize <= 0)) {
    toEditor(id, 'tawa-size');
  }

  await db.product.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug,
      status: parsed.data.status,
      basePriceRs: parsed.data.basePriceRs,
      comparePriceRs,
      nameUrdu: textOrNull(formData.get('nameUrdu')),
      tagline: textOrNull(formData.get('tagline')),
      description: textOrNull(formData.get('description')),
      categoryId: textOrNull(formData.get('categoryId')),
      material: textOrNull(formData.get('material')),
      tawaSize,
      metaTitle: textOrNull(formData.get('metaTitle')),
      metaDescription: textOrNull(formData.get('metaDescription')),
      isFeatured: checked(formData.get('isFeatured')),
      bundleEligible: checked(formData.get('bundleEligible')),
    },
  });

  revalidateProduct(existing.slug);
  // The old URL needs clearing too when the slug moved, or the cache keeps
  // serving a page that no longer exists.
  if (slug !== existing.slug) revalidateProduct(slug);

  toEditor(id, slug === existing.slug ? 'saved' : 'saved-slug-changed');
}

/**
 * Delete a product.
 *
 * Guarded by typing the slug rather than by a dialog, so the confirmation is
 * checked on the server instead of in a browser the owner may have clicked
 * past. Past orders survive this: `OrderItem` keeps its own copy of the name
 * and price, and its product link is `SetNull`.
 */
export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('productId') ?? '');
  if (!id) redirect('/admin/products');

  const product = await db.product.findUnique({
    where: { id },
    select: { slug: true, partOf: { select: { bundleId: true } } },
  });
  if (!product) redirect('/admin/products?notice=gone');

  if (String(formData.get('confirmSlug') ?? '').trim() !== product.slug) {
    toEditor(id, 'confirm-mismatch');
  }

  const images = await db.productImage.findMany({
    where: { productId: id },
    select: { url: true },
  });

  // Rows cascade; files do not. Unlink before the rows disappear, or the
  // uploads are orphaned on disk with nothing left pointing at them.
  await Promise.all(images.map((image) => deleteStoredImage(image.url)));

  await db.product.delete({ where: { id } });

  revalidateProduct(product.slug);
  redirect(
    product.partOf.length > 0
      ? '/admin/products?notice=deleted-from-bundles'
      : '/admin/products?notice=deleted',
  );
}

// ────────────────────────────────  Images  ────────────────────────────────

/**
 * Add one photograph, with its alt text.
 *
 * One file per submit, deliberately. The schema requires alt text on every
 * image, and alt text describes a particular photograph — a multi-file upload
 * would either share one line across several pictures or invent the rest.
 */
export async function addProductImage(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('productId') ?? '');
  if (!id) redirect('/admin/products');

  const alt = textOrNull(formData.get('alt'));
  if (!alt || alt.length < 4) toEditor(id, 'alt-required');

  const product = await db.product.findUnique({ where: { id }, select: { slug: true } });
  if (!product) redirect('/admin/products?notice=gone');

  const file = formData.get('file');
  const saved = await saveImage(file instanceof File ? file : null);
  if (!saved.ok) toEditor(id, `upload-${saved.code}`);

  const last = await db.productImage.findFirst({
    where: { productId: id },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  await db.productImage.create({
    data: {
      productId: id,
      url: saved.url,
      alt: alt.slice(0, 300),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  revalidateProduct(product.slug);
  toEditor(id, 'image-added');
}

export async function updateImageAlt(formData: FormData): Promise<void> {
  await requireAdmin();

  const imageId = String(formData.get('imageId') ?? '');
  const alt = textOrNull(formData.get('alt'));
  if (!imageId) redirect('/admin/products');

  const image = await db.productImage.findUnique({
    where: { id: imageId },
    select: { productId: true, product: { select: { slug: true } } },
  });
  if (!image) redirect('/admin/products?notice=gone');

  if (!alt || alt.length < 4) toEditor(image.productId, 'alt-required');

  await db.productImage.update({ where: { id: imageId }, data: { alt: alt.slice(0, 300) } });

  revalidateProduct(image.product.slug);
  toEditor(image.productId, 'image-alt-saved');
}

/**
 * Move a photograph one place up or down.
 *
 * Order matters beyond tidiness: the first image is the one on cards, in the
 * basket, in the OpenGraph tag and in the product's structured data.
 */
export async function moveProductImage(formData: FormData): Promise<void> {
  await requireAdmin();

  const imageId = String(formData.get('imageId') ?? '');
  const direction = String(formData.get('direction') ?? '');
  if (!imageId || (direction !== 'up' && direction !== 'down')) redirect('/admin/products');

  const image = await db.productImage.findUnique({
    where: { id: imageId },
    select: { productId: true, sortOrder: true, product: { select: { slug: true } } },
  });
  if (!image) redirect('/admin/products?notice=gone');

  const neighbour = await db.productImage.findFirst({
    where: {
      productId: image.productId,
      sortOrder: direction === 'up' ? { lt: image.sortOrder } : { gt: image.sortOrder },
    },
    orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
    select: { id: true, sortOrder: true },
  });
  // Already at the end; the button just does nothing.
  if (!neighbour) toEditor(image.productId, 'noop');

  await db.$transaction([
    db.productImage.update({ where: { id: imageId }, data: { sortOrder: neighbour.sortOrder } }),
    db.productImage.update({ where: { id: neighbour.id }, data: { sortOrder: image.sortOrder } }),
  ]);

  revalidateProduct(image.product.slug);
  toEditor(image.productId, 'image-moved');
}

export async function deleteProductImage(formData: FormData): Promise<void> {
  await requireAdmin();

  const imageId = String(formData.get('imageId') ?? '');
  if (!imageId) redirect('/admin/products');

  const image = await db.productImage.findUnique({
    where: { id: imageId },
    select: { url: true, productId: true, product: { select: { slug: true } } },
  });
  if (!image) redirect('/admin/products?notice=gone');

  await db.productImage.delete({ where: { id: imageId } });
  await deleteStoredImage(image.url);

  revalidateProduct(image.product.slug);
  toEditor(image.productId, 'image-deleted');
}

// ───────────────────────────────  Variants  ───────────────────────────────

const VariantSchema = z.object({
  label: z.string().trim().min(1).max(120),
  priceRs: z.coerce.number().int().min(1).max(10_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
});

const HEX = /^#[0-9a-fA-F]{6}$/;

function variantFields(formData: FormData) {
  const parsed = VariantSchema.safeParse({
    label: formData.get('label'),
    priceRs: formData.get('priceRs'),
    stock: formData.get('stock'),
  });
  if (!parsed.success) return null;

  const colorHex = textOrNull(formData.get('colorHex'));
  if (colorHex !== null && !HEX.test(colorHex)) return null;

  return {
    label: parsed.data.label,
    priceRs: parsed.data.priceRs,
    stock: parsed.data.stock,
    colorName: textOrNull(formData.get('colorName')),
    colorHex,
    sizeLabel: textOrNull(formData.get('sizeLabel')),
  };
}

export async function createVariant(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('productId') ?? '');
  if (!id) redirect('/admin/products');

  const product = await db.product.findUnique({ where: { id }, select: { slug: true } });
  if (!product) redirect('/admin/products?notice=gone');

  const fields = variantFields(formData);
  if (!fields) toEditor(id, 'variant-invalid');

  // A SKU is what the owner reads off a packing slip, so let them choose one;
  // when they do not, build one from the slug and label.
  const requested = textOrNull(formData.get('sku'));
  const sku = (requested ?? slugify(`${product.slug}-${fields.label}`)).toUpperCase();
  if (!sku) toEditor(id, 'sku-invalid');

  const clash = await db.productVariant.findUnique({ where: { sku }, select: { id: true } });
  if (clash) toEditor(id, 'sku-taken');

  await db.productVariant.create({ data: { productId: id, sku, ...fields } });

  revalidateProduct(product.slug);
  toEditor(id, 'variant-added');
}

/** The full variant form in the editor, as against the price/stock pair on the list page. */
export async function updateVariantDetails(formData: FormData): Promise<void> {
  await requireAdmin();

  const variantId = String(formData.get('variantId') ?? '');
  if (!variantId) redirect('/admin/products');

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, sku: true, product: { select: { slug: true } } },
  });
  if (!variant) redirect('/admin/products?notice=gone');

  const fields = variantFields(formData);
  if (!fields) toEditor(variant.productId, 'variant-invalid');

  const requested = textOrNull(formData.get('sku'));
  const sku = requested ? requested.toUpperCase() : variant.sku;
  if (sku !== variant.sku) {
    const clash = await db.productVariant.findUnique({ where: { sku }, select: { id: true } });
    if (clash) toEditor(variant.productId, 'sku-taken');
  }

  await db.productVariant.update({ where: { id: variantId }, data: { sku, ...fields } });

  revalidateProduct(variant.product.slug);
  toEditor(variant.productId, 'variant-saved');
}

export async function toggleVariantActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const variantId = String(formData.get('variantId') ?? '');
  if (!variantId) redirect('/admin/products');

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: {
      isActive: true,
      productId: true,
      product: { select: { slug: true, status: true } },
    },
  });
  if (!variant) redirect('/admin/products?notice=gone');

  if (variant.isActive && variant.product.status === 'ACTIVE') {
    const others = await db.productVariant.count({
      where: { productId: variant.productId, isActive: true, id: { not: variantId } },
    });
    // Same rule as deleting the last variant: a published page with nothing
    // purchasable on it should not be reachable by a different button.
    if (others === 0) toEditor(variant.productId, 'variant-last-hide');
  }

  await db.productVariant.update({
    where: { id: variantId },
    data: { isActive: !variant.isActive },
  });

  revalidateProduct(variant.product.slug);
  toEditor(variant.productId, variant.isActive ? 'variant-hidden' : 'variant-shown');
}

/**
 * Delete a variant.
 *
 * Deactivating is usually what is wanted — it keeps the SKU out of the way of
 * a future one — but a variant typed in by mistake should be removable.
 * Orders are unaffected: `OrderItem.variantId` is `SetNull` and the line keeps
 * its own label and price.
 */
export async function deleteVariant(formData: FormData): Promise<void> {
  await requireAdmin();

  const variantId = String(formData.get('variantId') ?? '');
  if (!variantId) redirect('/admin/products');

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, product: { select: { slug: true, status: true } } },
  });
  if (!variant) redirect('/admin/products?notice=gone');

  const remaining = await db.productVariant.count({
    where: { productId: variant.productId, isActive: true, id: { not: variantId } },
  });
  // Removing the last way to buy a published product would leave a live page
  // with no price. Unpublish first, deliberately.
  if (remaining === 0 && variant.product.status === 'ACTIVE') {
    toEditor(variant.productId, 'variant-last');
  }

  await db.productVariant.delete({ where: { id: variantId } });

  revalidateProduct(variant.product.slug);
  toEditor(variant.productId, 'variant-deleted');
}
