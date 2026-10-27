'use client';

import { useEffect, useRef } from 'react';
import { ExperienceWorld } from '@/components/three/ExperienceWorld';
import { SceneCanvas } from '@/components/three/SceneCanvas';
import { useSectionProgress } from '@/lib/hooks/useSectionProgress';

/**
 * Beats of the travelling shot.
 *
 * `at` is the scroll position where each line peaks. Each is visible for a
 * window around that point and cross-fades with its neighbours, so the copy
 * moves with the camera rather than appearing all at once.
 */
const BEATS = [
  { at: 0.08, title: 'Feel the Wind.', body: 'The pull on the line before the kite even lifts.' },
  { at: 0.34, title: 'Celebrate the Colours.', body: 'A sky in yellow, pink and gold from roof to roof.' },
  { at: 0.62, title: 'Own the Sky.', body: 'Your gudda, your dor, your corner of the horizon.' },
  { at: 0.88, title: 'Experience Basant with Kites92.', body: 'Everything you need, delivered to your door.' },
];

/** Static fallback when WebGL is unavailable. */
function ExperienceFallback() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-[#3B2B6B] via-[#FF7A4D] to-[#FFC928]" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-navy-900/35" />
    </div>
  );
}

export function BasantExperience() {
  const { ref: sectionRef, progress } = useSectionProgress<HTMLElement>();
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Beat opacity is written directly to the DOM on a rAF rather than held in
  // React state: this value changes every frame while scrolling, and state
  // would re-render the 3D subtree alongside it.
  useEffect(() => {
    let frame = requestAnimationFrame(tick);

    function tick() {
      const p = progress.current.value;
      for (let i = 0; i < BEATS.length; i++) {
        const node = beatRefs.current[i];
        if (!node) continue;

        const distance = Math.abs(p - BEATS[i].at);

        // Full strength within 0.05 of the beat, fully gone by 0.12.
        //
        // These numbers matter: the beats are ~0.26 apart and stacked at the
        // same position, so the fade half-width MUST stay under half that
        // spacing. A wider window left both neighbours around 60% opacity at
        // the midpoint between them, printing two headlines on top of each
        // other.
        const visibility = 1 - Math.min(Math.max((distance - 0.05) / 0.07, 0), 1);

        node.style.opacity = String(visibility);
        node.style.transform = `translate3d(0, ${(1 - visibility) * 28}px, 0)`;
        // Below the fade floor, take it out of the paint path entirely so no
        // sub-pixel ghost survives behind the active beat.
        node.style.visibility = visibility < 0.01 ? 'hidden' : 'visible';
      }
      frame = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(frame);
  }, [progress]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[320vh] bg-navy-900"
      aria-labelledby="experience-heading"
    >
      <h2 id="experience-heading" className="sr-only">
        The Basant Experience
      </h2>

      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <SceneCanvas
          className="absolute inset-0 h-full w-full"
          camera={{ fov: 48, near: 0.1, far: 400, position: [-17, 7.5, 13] }}
          fallback={<ExperienceFallback />}
        >
          <ExperienceWorld progress={progress} />
        </SceneCanvas>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-navy-950/35"
        />

        {/* Beats are stacked in one place and cross-faded. They are also all
            present in the DOM for screen readers and search engines, rather
            than being swapped in and out. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <div className="relative w-full max-w-3xl text-center">
            {BEATS.map((beat, index) => (
              <div
                key={beat.title}
                ref={(node) => {
                  beatRefs.current[index] = node;
                }}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-0 will-change-transform"
              >
                <p className="bg-basant-sweep bg-clip-text font-display text-display-md font-extrabold text-transparent">
                  {beat.title}
                </p>
                <p className="mt-3 text-lg text-cream/85">{beat.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
