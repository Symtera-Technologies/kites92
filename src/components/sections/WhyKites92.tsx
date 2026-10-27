import { KiteMotif } from '@/components/ui/KiteMotif';
import { Reveal } from '@/components/ui/Reveal';
import { kiteFabric } from '@/lib/design/tokens';

/**
 * Section F — why shop here.
 *
 * The delivery, payment and support lines are passed in from the `Setting`
 * table rather than written here, because they are promises about how the
 * business operates. Hardcoding "Delivery across Pakistan" into a component
 * would make the site claim something the owner cannot correct.
 */
export interface Reason {
  title: string;
  body: string;
}

export function WhyKites92({ reasons }: { reasons: Reason[] }) {
  if (reasons.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-navy-900 py-20 text-cream sm:py-28" aria-labelledby="why-heading">
      {/* Decorative kites drifting behind the cards. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07]">
        {[
          { left: '6%', top: '12%', size: 150, delay: '0s' },
          { left: '78%', top: '8%', size: 110, delay: '1.4s' },
          { left: '42%', top: '62%', size: 130, delay: '2.6s' },
          { left: '88%', top: '58%', size: 90, delay: '0.8s' },
        ].map((kite, i) => (
          <div
            key={i}
            className="absolute animate-kite-sway"
            style={{ left: kite.left, top: kite.top, width: kite.size, animationDelay: kite.delay }}
          >
            <KiteMotif
              topColor={kiteFabric[i % kiteFabric.length]}
              bottomColor={kiteFabric[(i + 2) % kiteFabric.length]}
            />
          </div>
        ))}
      </div>

      <div className="shell relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-basant">
            Why Kites92
          </p>
          <h2 id="why-heading" className="mt-3 text-display-sm text-cream">
            Built for the people on the roof
          </h2>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, index) => (
            <Reveal as="li" key={reason.title} delay={index * 70}>
              <div className="h-full rounded-3xl border border-cream/12 bg-cream/[0.06] p-6 backdrop-blur-sm transition-colors hover:border-basant/40 hover:bg-cream/[0.1]">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-basant-sweep font-display text-sm font-extrabold text-navy-900"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-cream">{reason.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/70">{reason.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
