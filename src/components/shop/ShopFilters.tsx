'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  slug: string;
  name: string;
  _count: { products: number };
}

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

const PRICE_BANDS = [
  { label: 'Under Rs. 500', min: '', max: '500' },
  { label: 'Rs. 500 – 2,000', min: '500', max: '2000' },
  { label: 'Rs. 2,000 – 10,000', min: '2000', max: '10000' },
  { label: 'Over Rs. 10,000', min: '10000', max: '' },
];

/**
 * Shop filter rail.
 *
 * Filters live in the URL rather than component state, so a filtered view can
 * be shared, bookmarked and reached with the back button — and so the server
 * component does the filtering in SQL rather than shipping the whole catalogue
 * to the browser to filter there.
 */
export function ShopFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      // Any filter change invalidates the current page number.
      params.delete('page');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activeCategory = searchParams.get('category');
  const activeSort = searchParams.get('sort') ?? 'newest';
  const activeMin = searchParams.get('min') ?? '';
  const activeMax = searchParams.get('max') ?? '';
  const inStockOnly = searchParams.get('stock') === '1';
  const hasFilters = Boolean(
    activeCategory || activeMin || activeMax || inStockOnly || searchParams.get('q'),
  );

  return (
    <aside aria-label="Product filters" className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:self-start">
      <div className="space-y-7 rounded-3xl border border-navy-900/10 bg-white p-5 shadow-card">
        <div>
          <label htmlFor="sort" className="mb-2 block text-xs font-bold uppercase tracking-wider text-navy-900/55">
            Sort by
          </label>
          <select
            id="sort"
            value={activeSort}
            onChange={(event) => setParams({ sort: event.target.value })}
            className="w-full rounded-xl border border-navy-900/15 bg-cream px-3 py-2.5 text-sm font-medium focus:border-royal"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-900/55">
            Category
          </legend>
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                onClick={() => setParams({ category: null })}
                className={cn(
                  'w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  !activeCategory ? 'bg-royal/10 font-semibold text-royal' : 'hover:bg-navy-900/5',
                )}
              >
                All products
              </button>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => setParams({ category: category.slug })}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    activeCategory === category.slug
                      ? 'bg-royal/10 font-semibold text-royal'
                      : 'hover:bg-navy-900/5',
                  )}
                >
                  <span className="truncate">{category.name}</span>
                  <span className="tnum shrink-0 text-xs text-navy-900/40">
                    {category._count.products}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-900/55">
            Price
          </legend>
          <ul className="space-y-0.5">
            {PRICE_BANDS.map((band) => {
              const active = activeMin === band.min && activeMax === band.max;
              return (
                <li key={band.label}>
                  <button
                    type="button"
                    onClick={() =>
                      setParams(
                        active
                          ? { min: null, max: null }
                          : { min: band.min || null, max: band.max || null },
                      )
                    }
                    className={cn(
                      'w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      active ? 'bg-royal/10 font-semibold text-royal' : 'hover:bg-navy-900/5',
                    )}
                  >
                    {band.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => setParams({ stock: event.target.checked ? '1' : null })}
            className="h-4 w-4 rounded border-navy-900/25 text-royal focus:ring-royal"
          />
          In stock only
        </label>

        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            className="w-full rounded-xl border border-navy-900/15 py-2.5 text-xs font-bold uppercase tracking-wider text-navy-900/70 hover:border-navy-900/30 hover:text-navy-900"
          >
            Clear filters
          </button>
        )}
      </div>
    </aside>
  );
}
