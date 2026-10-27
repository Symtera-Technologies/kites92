'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-level error boundary.
 *
 * The message shown is deliberately generic: `error.message` from a server
 * component can carry a database URL, a query or a stack frame, none of which
 * belong on a customer's screen. The digest is shown instead so a specific
 * incident can be matched to the server log.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[route error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-navy-900">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-navy-900/65">
        We hit a problem loading this page. Trying again usually works — if it does
        not, please contact us and we will sort it out.
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-xs text-navy-900/40">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">Back to home</Link>
      </div>
    </div>
  );
}
