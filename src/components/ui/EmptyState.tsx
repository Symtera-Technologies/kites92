import Link from 'next/link';
import { KiteMotif } from '@/components/ui/KiteMotif';
import { palette } from '@/lib/design/tokens';

interface EmptyStateProps {
  title: string;
  body: string;
  action?: { href: string; label: string };
  /** A quieter second option, e.g. "Browse everything". */
  secondary?: { href: string; label: string };
}

/**
 * What a page shows where content would be, when there is none.
 *
 * Several sections return `null` when their data is empty, which is right for
 * a homepage band — a section with nothing in it should not announce itself.
 * It is wrong for a page whose entire purpose is that data: `/categories` and
 * `/bundle-builder` each rendered a heading above nothing at all, which looks
 * like the site is broken rather than like the catalogue is not loaded yet.
 *
 * So this says what is missing and offers somewhere to go. It never pretends
 * data exists.
 */
export function EmptyState({ title, body, action, secondary }: EmptyStateProps) {
  return (
    <div className="shell py-16 sm:py-24">
      <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-navy-900/20 bg-white/60 px-6 py-14 text-center">
        <div className="mx-auto h-24 w-20 opacity-40">
          <KiteMotif topColor={palette.sky} bottomColor={palette.royal} />
        </div>

        <h2 className="mt-6 font-display text-xl font-bold text-navy-900">{title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-900/60">{body}</p>

        {(action || secondary) && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {action && (
              <Link href={action.href} className="btn-primary">
                {action.label}
              </Link>
            )}
            {secondary && (
              <Link href={secondary.href} className="btn-ghost">
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
