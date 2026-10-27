import Link from 'next/link';
import { KiteMotif } from '@/components/ui/KiteMotif';
import { palette, skyStops } from '@/lib/design/tokens';

/**
 * Kites over the closing band.
 *
 * Fixed anchor points with small in-place motion, the same model as the hero:
 * a kite on a line is tethered and cannot migrate across the sky. Reuses the
 * `kite-wander` / `kite-tilt` keyframes and the `kite-layer` class, so the
 * reduced-motion rule in `globals.css` covers this layer too.
 */
const KITES = [
  { left: '6%', top: '16%', size: 44, wander: 9, tilt: 4.3, delay: -3, opacity: 0.5 },
  { left: '21%', top: '58%', size: 30, wander: 12, tilt: 5.6, delay: -7, opacity: 0.34 },
  { left: '36%', top: '12%', size: 34, wander: 10.5, tilt: 4.9, delay: -5, opacity: 0.4 },
  { left: '63%', top: '66%', size: 38, wander: 8, tilt: 3.7, delay: -2, opacity: 0.36 },
  { left: '79%', top: '14%', size: 52, wander: 13, tilt: 6.1, delay: -9, opacity: 0.52 },
  { left: '92%', top: '48%', size: 32, wander: 7.5, tilt: 3.4, delay: -6, opacity: 0.38 },
];

/**
 * Section I — the closing call to action.
 *
 * Painted dusk rather than a photograph. This band used to reuse the hero
 * image under a triple gradient, which was the wrong call twice over: it put
 * the same picture on screen twice, and the wash needed to keep the copy
 * legible was heavy enough (85% / 45% / 90%) that the photograph underneath
 * survived only as a murky purple haze — a degraded copy of the opening shot
 * rather than a reprise of it.
 *
 * So this is built instead of shot. The gradient is `skyStops.sunset`, the
 * same three stops the 3D sky and its WebGL fallback use, which is what ties
 * the band to the rest of the site. Dark at the top and warm only along the
 * bottom edge, for two reasons: the heading is `bg-basant-sweep`, whose
 * yellow-to-orange range would vanish into a bright sky, and the footer below
 * is `bg-navy-900`, so a dusk band runs into it instead of stopping dead.
 *
 * To use a photograph here instead, drop one in `public/images/` and render it
 * behind these layers — but it wants to be a *different* photograph, not the
 * hero again.
 */
export function FinalCta() {
  return (
    <section
      className="relative isolate overflow-hidden bg-navy-950"
      aria-labelledby="final-cta-heading"
    >
      {/* Dusk, bottom-lit. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${skyStops.sunset.top} 0%, ${palette.navy} 46%, #2A1B45 78%, ${skyStops.sunset.mid} 128%)`,
        }}
      />
      {/* The sun, just below the horizon — an ellipse rather than a circle, so
          the glow spreads along the bottom edge instead of reading as a blob. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-64"
        style={{
          background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${skyStops.sunset.sun}66 0%, ${skyStops.sunset.mid}2E 45%, transparent 75%)`,
        }}
      />

      <div aria-hidden className="kite-layer pointer-events-none absolute inset-0 overflow-hidden">
        {KITES.map((kite, index) => (
          <div
            key={index}
            className="absolute will-change-transform"
            style={{
              left: kite.left,
              top: kite.top,
              width: kite.size,
              animation: `kite-wander ${kite.wander}s ease-in-out ${kite.delay}s infinite`,
            }}
          >
            <div
              className="will-change-transform"
              style={{
                animation: `kite-tilt ${kite.tilt}s ease-in-out ${kite.delay / 2}s infinite`,
                opacity: kite.opacity,
              }}
            >
              <KiteMotif
                topColor={index % 2 === 0 ? palette.basant : palette.vibrant}
                bottomColor={index % 2 === 0 ? palette.festival : palette.royal}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="shell relative z-10 flex flex-col items-center py-28 text-center sm:py-36">
        <p className="text-xs font-bold uppercase tracking-[0.42em] text-basant">
          One more flight
        </p>

        <h2
          id="final-cta-heading"
          className="mt-4 bg-basant-sweep bg-clip-text font-display text-display-lg font-extrabold text-transparent"
        >
          The Sky Is Calling!
        </h2>

        <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-cream/90">
          Your next Basant adventure starts at Kites92.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/shop" className="btn-primary px-9 py-4 text-base">
            Shop Kites Now
          </Link>
          <Link
            href="/collections/basant-bundles"
            className="btn-ghost border-cream/30 bg-cream/10 px-9 py-4 text-base text-cream hover:bg-cream/20"
          >
            Browse Bundles
          </Link>
        </div>
      </div>
    </section>
  );
}
