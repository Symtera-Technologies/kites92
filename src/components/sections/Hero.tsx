'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { KiteMotif } from '@/components/ui/KiteMotif';
import { kiteFabric } from '@/lib/design/tokens';

/**
 * Kites hovering over the banner.
 *
 * Each one holds a fixed spot and only tugs around it, the way a kite on a
 * line does. They do not travel across the sky.
 *
 * Positions are hand-placed rather than randomised, for two reasons random
 * placement cannot guarantee: every kite has to stay in the open sky band
 * above the headline, and they have to be spread evenly enough that the sky
 * does not clump.
 *
 * All `top` values sit inside the upper quarter, which is clear of the copy
 * at every breakpoint — the headline starts around 30% even on a phone, where
 * it is centred.
 *
 * `wander` and `tilt` periods are deliberately mismatched per kite and never
 * share a common factor, so no two kites bob in step and none of them visibly
 * repeats. Negative delays start each one part-way through its cycle, so the
 * sky is already in motion on the first painted frame rather than every kite
 * starting from rest together.
 */
const HOVERING_KITES = [
  { left: '7%', top: '8%', size: 52, wander: 9, tilt: 4.3, delay: -3, opacity: 0.95 },
  { left: '19%', top: '17%', size: 34, wander: 12, tilt: 5.6, delay: -7, opacity: 0.8 },
  { left: '32%', top: '7%', size: 44, wander: 10.5, tilt: 4.9, delay: -5, opacity: 0.9 },
  { left: '45%', top: '14%', size: 60, wander: 8, tilt: 3.7, delay: -2, opacity: 1 },
  { left: '57%', top: '6%', size: 30, wander: 13, tilt: 6.1, delay: -9, opacity: 0.76 },
  { left: '68%', top: '19%', size: 66, wander: 7.5, tilt: 3.4, delay: -6, opacity: 1 },
  { left: '80%', top: '10%', size: 38, wander: 11.5, tilt: 5.2, delay: -4, opacity: 0.85 },
  { left: '90%', top: '25%', size: 46, wander: 9.5, tilt: 4.6, delay: -8, opacity: 0.92 },
];

function HoveringKites() {
  return (
    <div
      aria-hidden
      className="kite-layer pointer-events-none absolute inset-0 overflow-hidden"
    >
      {HOVERING_KITES.map((kite, index) => (
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
              filter: 'drop-shadow(0 6px 14px rgba(10,18,38,0.35))',
            }}
          >
            <KiteMotif
              topColor={kiteFabric[index % kiteFabric.length]}
              bottomColor={kiteFabric[(index + 3) % kiteFabric.length]}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Hero banner.
 *
 * A real photograph of Basant over Lahore, not a rendered scene. The
 * interactive 3D world still exists further down the page, in the "Basant
 * Experience" section, where it reads as a deliberate interactive moment
 * rather than trying to pass for a photograph.
 *
 * The image is served from /public and rendered with `priority`, because it is
 * the page's Largest Contentful Paint element — lazy-loading it would push the
 * LCP out by however long the rest of the page takes.
 */
export function Hero() {
  const imageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  /**
   * Parallax: the photograph drifts slower than the page and lifts slightly,
   * while the copy fades as it scrolls away.
   *
   * Written straight to style on a rAF rather than held in React state — this
   * updates every frame while scrolling, and state would re-render the whole
   * section each time. Skipped entirely under reduced motion.
   */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = requestAnimationFrame(tick);

    function tick() {
      const image = imageRef.current;
      const copy = copyRef.current;
      if (image && copy) {
        const viewport = window.innerHeight;
        // 0 at the top of the page, 1 once the hero has fully scrolled past.
        const progress = Math.min(Math.max(window.scrollY / viewport, 0), 1);

        image.style.transform = `translate3d(0, ${progress * 14}%, 0) scale(${1 + progress * 0.08})`;
        copy.style.opacity = String(1 - Math.min(progress * 1.6, 1));
        copy.style.transform = `translate3d(0, ${progress * -40}px, 0)`;
      }
      frame = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="relative h-[100svh] min-h-[34rem] w-full overflow-hidden bg-navy-900">
      <div ref={imageRef} className="absolute inset-0 will-change-transform">
        <Image
          src="/images/hero-basant-lahore.webp"
          alt="Basant in Lahore at sunset: a man on a rooftop flies a kite with a charkhi in his hand while his family watches, dozens of colourful kites fill the golden sky, and the domes and minarets of the Badshahi Mosque rise over the rooftops behind."
          fill
          priority
          // One large image across the full viewport width at every breakpoint.
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/*
        Scrims, targeted rather than global.

        The photograph is the point of this section, so nothing here darkens it
        uniformly — an earlier pair of full-bleed gradients stacked to ~90%
        opacity and left the hero looking like a flat navy box. Each layer
        below covers only the area that actually needs a contrast floor:

          1. A mild overall wash on small screens, where the copy is centred
             over the brightest part of the sky. Removed at `lg`.
          2. A left-weighted wash on wide screens, behind the copy column only,
             fading to clear well before the mosque.
          3. A short bar under the fixed header so the nav stays readable.
          4. A bottom fade for the scroll cue.
      */}
      <div aria-hidden className="absolute inset-0 bg-navy-950/45 lg:hidden" />
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-gradient-to-r from-navy-950/85 via-navy-950/45 to-transparent lg:block"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-navy-950/70 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-950/70 to-transparent"
      />

      {/*
        Above the scrims, not below them.

        Underneath, the left-hand wash knocked these back by 85% exactly where
        the background is darkest and they would have shown best, while on the
        right they vanished into the photograph's own kites. Sitting on top
        they stay legible across the full width — which is the entire point of
        adding them.
      */}
      <HoveringKites />

      <div
        ref={copyRef}
        className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center will-change-transform lg:items-start lg:pl-[7vw] lg:text-left"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.42em] text-basant sm:text-sm">
          Lahore · Punjab, Pakistan
        </p>

        <h1 className="flex flex-col items-center gap-1 lg:items-start">
          {/* The brand gradient, matching the primary button. It works at this
              size where it did not on the smaller line below — the letterforms
              are wide enough to show the full yellow-to-purple sweep instead
              of sampling one muddy slice of it.

              `drop-shadow` rather than `text-shadow`: with `bg-clip-text` the
              glyphs are a mask, and only a filter follows that mask. */}
          <span className="bg-basant-sweep bg-clip-text font-display text-display-xl font-extrabold leading-none text-transparent [filter:drop-shadow(0_4px_26px_rgba(10,18,38,0.85))]">
            KITES92
          </span>
          {/* Solid cream rather than the brand gradient: the gradient's
              yellow-to-orange range is almost exactly the colour of the sunset
              behind it, so the words disappeared into the sky. The accent
              moves to a single word, which keeps the brand colour without
              costing legibility. */}
          <span className="font-display text-display-md font-bold text-cream drop-shadow-[0_3px_18px_rgba(10,18,38,0.95)]">
            Let Your <span className="text-basant">Happiness</span> Fly!
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-cream/90 drop-shadow-[0_2px_12px_rgba(10,18,38,0.9)] sm:text-lg">
          Celebrate the colours of Basant — discover beautiful kites, festive
          collections and everything you need for the sky.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
          <Link href="/shop" className="btn-primary">
            Explore Kites
          </Link>
          <Link href="/collections/basant-bundles" className="btn-ghost border-cream/30 bg-cream/10 text-cream hover:bg-cream/20">
            Shop Basant Collection
          </Link>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cream/70">
          Scroll
        </span>
        <span className="relative block h-11 w-[1.5px] overflow-hidden bg-cream/25">
          <span className="absolute inset-x-0 top-0 h-1/3 animate-[drift-up_1.8s_ease-in-out_infinite] bg-cream/90" />
        </span>
      </div>
    </section>
  );
}
