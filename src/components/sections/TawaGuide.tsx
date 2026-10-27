import Link from 'next/link';
import { KiteMotif } from '@/components/ui/KiteMotif';
import { Reveal } from '@/components/ui/Reveal';
import { palette } from '@/lib/design/tokens';

interface TawaSize {
  /** Traditional name, as it is asked for in the bazaar. */
  name: string;
  /** The size as a fraction of a tawa, written the way a sign would write it. */
  fraction: string;
  tagline: string;
  body: string;
  /**
   * Shop search term. These match the `— N Tawa` suffix in the seeded product
   * names, which is a substring search, so "1 Tawa" finds the 1-tawa gudda
   * without also matching 1.5 or 2.
   */
  query: string;
  /**
   * Sail height relative to the largest card, as a fraction.
   *
   * Tawa measures sail *area*, so the linear scale is the square root of it —
   * drawing the kites at a width proportional to the tawa figure itself would
   * exaggerate the difference by the square. These are sqrt(tawa) normalised
   * against the 1.5-tawa card, so the four kites below are genuinely to scale
   * against each other.
   */
  scale: number;
  topColor: string;
  bottomColor: string;
}

const SIZES: TawaSize[] = [
  {
    name: 'Adda',
    fraction: '½ tawa',
    tagline: 'The first kite',
    body: 'Half a tawa of sail. Light enough for a child to hold the line and forgiving enough to get up without help — and cheap enough that losing a few to the neighbours does not sting.',
    query: '0.5 Tawa',
    scale: 0.58,
    topColor: palette.basant,
    bottomColor: '#FFFFFF',
  },
  {
    name: 'Pona',
    fraction: '¾ tawa',
    tagline: 'A step up, still forgiving',
    body: 'Three-quarters of a tawa. Noticeably more lift than an adda but still easy to bring back down. The usual next size once the first kite stops being a challenge.',
    query: '0.75 Tawa',
    scale: 0.71,
    topColor: palette.vibrant,
    bottomColor: palette.basant,
  },
  {
    name: 'Ek',
    fraction: '1 tawa',
    tagline: 'The standard Basant kite',
    body: 'One tawa is the reference size everything else is described against. Large enough to hold a steady line in moderate wind, small enough to stay controllable from a rooftop. Buying one kite? Buy this one.',
    query: '1 Tawa',
    scale: 0.82,
    topColor: palette.sky,
    bottomColor: palette.vibrant,
  },
  {
    name: 'Dedh & Do',
    fraction: '1½–2 tawa',
    tagline: 'Strong morning, experienced hands',
    body: 'A tawa and a half, or a full two. The extra sail area pulls hard on the line — exactly what you want on a windy Basant morning, and a handful on any other. Worth pairing with heavier dor.',
    query: '1.5 Tawa',
    scale: 1,
    topColor: palette.royal,
    bottomColor: palette.festival,
  },
];

/**
 * Section B — how kites are sized.
 *
 * This sits directly under the hero because size is the question every kite
 * buyer actually has, and the one that gets asked on WhatsApp over and over:
 * a gudda is sold by *tawa*, which means nothing to anyone who has not bought
 * one before, and guessing wrong means a kite that will not fly for you.
 *
 * It deliberately depends on nothing. No products, no categories, no
 * photographs, no database — so it is the one section that is never empty,
 * including before the catalogue is seeded. Everything it claims is about how
 * kites are sized rather than about this shop's stock, so nothing here can go
 * out of date or quietly misrepresent what is available.
 *
 * The four kites are drawn to scale against each other (see `scale`), which
 * is the part a paragraph cannot do: the difference between an adda and a do
 * tawa is something you understand by looking at it.
 */
export function TawaGuide() {
  return (
    <section className="relative overflow-hidden bg-cream py-20 sm:py-28" aria-labelledby="tawa-heading">
      {/* Carries the hero's sky down into the page rather than cutting hard
          from the photograph to flat cream. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-sky/20 to-transparent"
      />

      <div className="shell relative">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-festival">
            Start here
          </p>
          <h2 id="tawa-heading" className="mt-3 text-display-sm">
            Which Size Gudda?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-900/65">
            Kites in Punjab are sized in <strong className="font-semibold text-navy-900">tawa</strong> —
            the traditional measure of how much sail the kite carries, not its
            length or its wingspan. One tawa is the standard mid-size gudda, and
            every other size is a fraction or a multiple of it.
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SIZES.map((size, index) => (
            <Reveal as="li" key={size.name} delay={index * 70}>
              <Link
                href={`/shop?q=${encodeURIComponent(size.query)}`}
                className="group flex h-full flex-col rounded-3xl border border-navy-900/10 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
              >
                {/* Bottom-aligned on a fixed-height row so the four sails
                    share a baseline and the size difference reads as size
                    rather than as inconsistent padding. */}
                <div className="flex h-36 items-end justify-center">
                  <div
                    className="aspect-[4/5] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105"
                    style={{ height: `${size.scale * 100}%` }}
                  >
                    <KiteMotif topColor={size.topColor} bottomColor={size.bottomColor} />
                  </div>
                </div>

                <h3 className="mt-5 font-display text-lg font-bold leading-snug text-navy-900">
                  {size.name}
                  <span className="tnum ml-2 text-sm font-semibold text-royal">
                    {size.fraction}
                  </span>
                </h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-vibrant">
                  {size.tagline}
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-navy-900/60">{size.body}</p>

                <span className="mt-auto pt-4 text-xs font-bold uppercase tracking-wider text-royal">
                  See this size →
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>

        <Reveal
          delay={320}
          className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-navy-900/10 pt-6"
        >
          {/* Named rather than fixed, because the names genuinely do move
              around: the same sail is an adda in one mohalla and something
              else two streets over. The tawa figure is the part that does not
              shift, so that is what each product leads with. */}
          <p className="max-w-xl text-sm leading-relaxed text-navy-900/55">
            Names vary from one mohalla to the next, so go by the tawa figure on
            each kite. Not sure between two sizes? Message us on WhatsApp and
            describe your roof — the wind up there decides more than the kite does.
          </p>
          <Link href="/shop" className="btn-ghost shrink-0">
            Dor, charkhi &amp; the rest
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
