import Link from 'next/link';
import { KiteMotif } from '@/components/ui/KiteMotif';
import { palette } from '@/lib/design/tokens';
import { whatsappLink } from '@/lib/utils';

interface UnavailableProps {
  /**
   * What could not be read, as a noun phrase completing "we can't load ___":
   * "the catalogue", "this collection", "checkout".
   */
  what: string;
  /**
   * Overrides the WhatsApp number. Defaults to the build-time one, because the
   * number in settings lives in the same database that just failed.
   */
  whatsappNumber?: string;
}

/**
 * What a page shows when the data it exists to display cannot be read.
 *
 * Deliberately not `EmptyState`. That one reports something true about the
 * catalogue — nothing matches these filters, nothing has been added yet — and
 * offers a way to widen the search. This one reports a fault on our side.
 *
 * Saying "0 products" or "no cities available" when the database is simply
 * unreachable is not a cosmetic slip, it is a false claim about the business:
 * the shelves are not empty and we have not stopped delivering. So this says
 * plainly that the fault is ours, and offers only paths that do not need the
 * database to work — a static page, and a real WhatsApp conversation.
 */
export function Unavailable({ what, whatsappNumber }: UnavailableProps) {
  const number = whatsappNumber?.trim() || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-festival/50 bg-festival/5 px-6 py-14 text-center">
      <div aria-hidden className="mx-auto h-24 w-20 opacity-30">
        <KiteMotif topColor={palette.sky} bottomColor={palette.royal} />
      </div>

      <h2 className="mt-6 font-display text-xl font-bold text-navy-900">
        We can’t load {what} right now
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-900/65">
        This is a fault at our end, not with your connection. Please try again in
        a few minutes.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {number && (
          <a
            href={whatsappLink(number, 'Assalam o alaikum — the website is down. Can I order here?')}
            className="btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Order on WhatsApp
          </a>
        )}
        <Link href="/" className="btn-ghost">
          Back to home
        </Link>
      </div>
    </div>
  );
}
