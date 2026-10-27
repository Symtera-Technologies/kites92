'use client';

import Lenis from 'lenis';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const LenisContext = createContext<Lenis | null>(null);

/** The active Lenis instance, or null when smooth scrolling is disabled. */
export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Smooth scrolling for the whole document.
 *
 * The 3D camera is driven by scroll position, and raw wheel events arrive as
 * coarse jumps — roughly 100px per notch — which makes a scroll-driven camera
 * stutter no matter how smooth the scene itself is. Lenis interpolates scroll
 * position between those events, so the camera move reads as a continuous
 * flight rather than a series of steps.
 *
 * Disabled entirely under `prefers-reduced-motion`: hijacking scroll is
 * exactly the kind of motion that setting asks us not to do, and native
 * scrolling must keep working.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const instance = new Lenis({
      // ~0.9s to settle: long enough to feel cinematic, short enough that the
      // page still responds immediately to a flick.
      duration: 0.9,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      // Touch devices keep native scrolling. Overriding it on mobile fights
      // the platform's own momentum and feels broken.
      syncTouch: false,
      touchMultiplier: 1.6,
    });

    setLenis(instance);

    const raf = (time: number) => {
      instance.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
