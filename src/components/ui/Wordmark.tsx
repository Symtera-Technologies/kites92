import { cn } from '@/lib/utils';

interface WordmarkProps {
  /** Size, tracking and anything else positional. */
  className?: string;
  /**
   * What the mark is sitting on.
   *
   * `bg-clip-text` turns the glyphs into a mask, so only a `filter` follows
   * that mask — `text-shadow` paints nothing. On a dark surface the mark gets
   * a soft glow to lift it off the background; on a light one it gets a tight
   * dark edge instead, because the sweep opens on `#FFC928` and pale yellow
   * on cream has very little to hold onto.
   */
  on?: 'light' | 'dark';
}

/**
 * The KITES92 wordmark.
 *
 * One definition, used in the header, the footer and the admin. It previously
 * existed as four copies in three different treatments — `text-festival` in
 * the header and admin, `text-basant` in the footer, plain cream over the
 * hero — which is how a brand mark quietly stops being one mark.
 *
 * The fill is `basant-sweep`, the same gradient as the hero banner's wordmark
 * and the primary button, so the mark reads identically wherever it appears.
 */
export function Wordmark({ className, on = 'light' }: WordmarkProps) {
  return (
    <span
      className={cn(
        'bg-basant-sweep bg-clip-text font-display font-extrabold text-transparent',
        on === 'dark'
          ? '[filter:drop-shadow(0_2px_10px_rgba(10,18,38,0.6))]'
          : '[filter:drop-shadow(0_1px_2px_rgba(16,27,53,0.38))]',
        className,
      )}
    >
      KITES92
    </span>
  );
}
