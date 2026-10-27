import Link from 'next/link';
import { db } from '@/lib/db';
import { Notice } from '@/components/admin/Notice';
import { createProduct } from '../../../catalogue-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New product' };

/**
 * Start a product.
 *
 * Three fields, not thirty. A new product is a draft with a name and a price;
 * everything else — photographs, variants, Urdu name, description, SEO — is
 * the editor's job, and asking for all of it before the row exists means
 * losing the lot to one mistyped field.
 */
export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;

  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, isActive: true },
  });

  const field =
    'w-full rounded-xl border border-navy-900/15 bg-white px-3 py-2.5 text-sm focus:border-royal focus:outline-none';
  const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy-900/55';

  return (
    <div className="max-w-xl">
      <Link href="/admin/products" className="text-sm font-semibold text-royal hover:underline">
        ← Products
      </Link>

      <h1 className="mt-3 font-display text-2xl font-extrabold">New product</h1>
      <p className="mt-2 text-sm text-navy-900/60">
        This creates a draft. Nothing appears on the storefront until you add a variant and press
        Publish.
      </p>

      <Notice code={notice} dismissTo="/admin/products/new" />

      <form action={createProduct} className="mt-6 space-y-5 rounded-2xl border border-navy-900/10 bg-white p-6">
        <div>
          <label htmlFor="name" className={label}>
            Name
          </label>
          <input id="name" name="name" required minLength={2} maxLength={120} className={field} />
          <p className="mt-1.5 text-xs text-navy-900/50">
            The web address is made from this and can be changed afterwards.
          </p>
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
            className={`tnum ${field}`}
          />
          <p className="mt-1.5 text-xs text-navy-900/50">
            The “from” figure on cards. What a customer is actually charged comes from the variant
            they pick.
          </p>
        </div>

        <div>
          <label htmlFor="categoryId" className={label}>
            Category
          </label>
          <select id="categoryId" name="categoryId" className={field} defaultValue="">
            <option value="">Uncategorised</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.isActive && ' (hidden)'}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream hover:bg-navy-800"
        >
          Create draft
        </button>
      </form>
    </div>
  );
}
