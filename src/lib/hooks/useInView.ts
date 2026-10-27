'use client';

import { useEffect, useRef, useState } from 'react';

export interface InViewOptions {
  /** Expand the viewport so a scene wakes up just before it scrolls in. */
  rootMargin?: string;
  threshold?: number;
  /** Stop observing after the first intersection (for one-shot reveals). */
  once?: boolean;
}

/**
 * Track whether an element is in (or near) the viewport.
 *
 * Every 3D scene uses this to stop its render loop while offscreen. A page
 * with several WebGL scenes that all keep rendering will drain a phone battery
 * and stall the scroll, so this is load-bearing for performance, not polish.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: InViewOptions = {},
) {
  const { rootMargin = '200px', threshold = 0, once = false } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // No IntersectionObserver (very old browsers): assume visible rather than
    // leaving the scene permanently frozen.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}
