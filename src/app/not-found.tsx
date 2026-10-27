import Link from 'next/link';
import { KiteMotif } from '@/components/ui/KiteMotif';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

/**
 * 404.
 *
 * Deliberately standalone — no Header or Footer, because both read from the
 * database and a 404 must render even when the database is the thing that is
 * broken.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <div className="h-36 w-32 animate-kite-sway opacity-80">
        <KiteMotif topColor="#FFC928" bottomColor="#FF3D85" />
      </div>

      <p className="mt-8 font-display text-6xl font-extrabold text-navy-900">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy-900">
        This one got away
      </h1>
      <p className="mt-3 max-w-sm text-navy-900/65">
        The page you were looking for has drifted off. The cut string happens to
        everyone.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">Back to home</Link>
        <Link href="/shop" className="btn-ghost">Browse kites</Link>
      </div>
    </div>
  );
}
