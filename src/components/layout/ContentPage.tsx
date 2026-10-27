import { Header } from './Header';
import { Footer } from './Footer';
import { PageHeader } from './PageHeader';

/**
 * Shell for text pages: policies, delivery info, about, safety.
 *
 * `prose`-style spacing is applied here with explicit utilities rather than a
 * typography plugin, so these pages inherit the site's own type scale instead
 * of a second, slightly different one.
 */
export function ContentPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  /** Shown as "Last updated". Pass the date the copy was actually reviewed. */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main" className="pt-[var(--nav-h)]">
        {/* The same banded header the commerce pages use, so a policy page
            does not look like it belongs to a different site. */}
        <PageHeader title={title} intro={intro} crumbs={[{ href: '/', label: 'Home' }]}>
          {updated && (
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-navy-900/45">
              Last updated {updated}
            </p>
          )}
        </PageHeader>

        <article className="shell max-w-3xl py-12">
          <div
            className="space-y-5 leading-relaxed text-navy-900/80
                       [&_a]:font-semibold [&_a]:text-royal hover:[&_a]:underline
                       [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-navy-900
                       [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-navy-900
                       [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1
                       [&_ul]:space-y-2"
          >
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

/**
 * Banner marking copy the owner still has to review.
 *
 * Policy pages shipped with starter text are a liability if they are mistaken
 * for reviewed legal copy, so pages carrying defaults say so plainly rather
 * than reading as though a lawyer wrote them.
 */
export function DraftNotice({ what }: { what: string }) {
  return (
    <aside className="rounded-2xl border border-festival/40 bg-festival/10 p-4 text-sm">
      <strong className="font-bold">Starter text.</strong> {what} Review and edit
      this page before launch so it reflects how Kites92 actually operates.
    </aside>
  );
}
