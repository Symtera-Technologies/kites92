import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Kites92 Admin' },
  // The admin must never appear in search results.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Base admin shell.
 *
 * Deliberately contains no authentication check. The guard lives in the
 * `(dashboard)` route group's layout, so `/admin/login` — which sits outside
 * that group — can render without redirecting to itself.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream-300">{children}</div>;
}
