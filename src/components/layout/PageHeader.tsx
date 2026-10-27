import Link from 'next/link';

export interface Crumb {
  href: string;
  label: string;
}

interface PageHeaderProps {
  title: string;
  /** Shown under the title, right-to-left. */
  titleUrdu?: string | null;
  intro?: string | null;
  /**
   * Trail *above* this page. The current page is appended automatically from
   * `title`, so callers never repeat it.
   */
  crumbs?: Crumb[];
  /** Right-aligned slot: a result count, a sign-out button, a CTA. */
  aside?: React.ReactNode;
  /** Rendered under the intro — a search field, filter chips. */
  children?: React.ReactNode;
}

/**
 * The banded header every interior page opens with.
 *
 * Before this, each page rolled its own: `/shop` and `/collections` had a
 * breadcrumb and a tinted band, `/cart`, `/track`, `/search` and `/checkout`
 * had a bare `<h1>` on flat cream, and `/bundle-builder` had no heading at
 * all. The homepage earns its cinematic opening; the rest of the site needs
 * one consistent, calmer one.
 *
 * It also fixes a silent bug those bespoke bands shared. Both wrote
 * `bg-basant-sweep/10`, but Tailwind's opacity modifier only applies to
 * colour utilities — `basant-sweep` is a `backgroundImage`, so the class
 * matched nothing and was never generated. Those headers have been rendering
 * on plain cream. The brand gradient now appears where it can actually be
 * drawn: as a solid rule along the bottom edge, echoing the wordmark and the
 * primary button.
 */
export function PageHeader({
  title,
  titleUrdu,
  intro,
  crumbs,
  aside,
  children,
}: PageHeaderProps) {
  return (
    <header className="relative border-b border-navy-900/10 bg-gradient-to-b from-sky/15 via-cream to-cream">
      <div className="shell py-12 sm:py-16">
        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-900/50"
          >
            {crumbs.map((crumb) => (
              <span key={crumb.href}>
                <Link href={crumb.href} className="transition-colors hover:text-navy-900">
                  {crumb.label}
                </Link>
                <span className="mx-2" aria-hidden>
                  /
                </span>
              </span>
            ))}
            {/* The current page, not a link. */}
            <span className="text-navy-900">{title}</span>
          </nav>
        )}

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 className="text-display-sm">{title}</h1>
            {titleUrdu && (
              <p className="mt-1 font-urdu text-lg text-navy-900/55" dir="rtl" lang="ur">
                {titleUrdu}
              </p>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>

        {intro && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-navy-900/65">{intro}</p>
        )}

        {children}
      </div>

      {/* The brand sweep, as a rule rather than a wash — at the 10% tint the
          old class was reaching for, this gradient turns to mud. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-basant-sweep" />
    </header>
  );
}
