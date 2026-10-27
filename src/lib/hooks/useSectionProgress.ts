'use client';

import { useEffect, useRef } from 'react';

export interface ProgressRef {
  /** Scroll progress through the section, 0 at entry and 1 at exit. */
  value: number;
}

/**
 * Track scroll progress through a tall section.
 *
 * Progress is written into a mutable ref rather than React state on purpose.
 * This value changes on every scroll frame, and putting it in state would
 * re-render the component — and its 3D subtree — sixty times a second. The
 * render loop reads `progress.current.value` directly instead, so scrolling
 * costs no React work at all.
 *
 * The element is expected to be taller than the viewport, with sticky content
 * inside it: progress reaches 0 when its top hits the top of the viewport and
 * 1 when its bottom does.
 */
export function useSectionProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const progress = useRef<ProgressRef>({ value: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const rect = element.getBoundingClientRect();
      // Distance the section travels while any part of it is pinned.
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) {
        // Section is shorter than the viewport, so there is nothing to scrub.
        progress.current.value = 0;
        return;
      }
      progress.current.value = Math.min(Math.max(-rect.top / travel, 0), 1);
    };

    // Coalesce to one measurement per frame: scroll events can fire far more
    // often than that, and `getBoundingClientRect` forces layout each time.
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return { ref, progress };
}
