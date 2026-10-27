import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getSetting } from '@/lib/commerce/queries';
import { Wordmark } from '@/components/ui/Wordmark';
import { adminLogout } from '../actions';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/settings', label: 'Settings' },
];

/**
 * Guarded admin shell.
 *
 * `requireAdmin()` runs here, which covers every page in this route group.
 * Each server action re-checks it as well — a layout guard protects the
 * rendering of a page, not the endpoints it posts to.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const sampleData = await getSetting('catalogue.sampleData');

  return (
    <div className="min-h-screen">
      <header className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
          <Link href="/admin">
            <Wordmark className="text-lg" />
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-navy-900/40">
              Admin
            </span>
          </Link>

          <nav aria-label="Admin" className="flex flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-navy-900/70 hover:bg-navy-900/5 hover:text-navy-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="font-semibold text-royal hover:underline">
              View store ↗
            </Link>
            <span className="hidden text-navy-900/45 sm:inline">{user.email}</span>
            <form action={adminLogout}>
              <button
                type="submit"
                className="rounded-full border border-navy-900/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-navy-900/70 hover:border-navy-900/35 hover:text-navy-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {sampleData === 'true' && (
        <div className="border-b border-festival/30 bg-festival/15">
          <p className="mx-auto max-w-7xl px-5 py-2.5 text-sm text-navy-900/80">
            <strong className="font-bold">This catalogue is sample data.</strong>{' '}
            The products, prices and payment details came from the seed script, not
            from your business. Replace them before taking real orders, then clear
            this notice in{' '}
            <Link href="/admin/settings" className="font-semibold text-royal underline">
              Settings
            </Link>
            .
          </p>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
