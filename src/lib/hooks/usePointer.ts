'use client';

import { useEffect, useRef } from 'react';

export interface PointerRef {
  /** Horizontal position, -1 at the left edge to 1 at the right. */
  x: number;
  /** Vertical position, -1 at the bottom to 1 at the top. */
  y: number;
  /** True once the visitor has actually moved a pointer or touched. */
  active: boolean;
}

/**
 * Track normalised pointer position in a ref.
 *
 * Ref rather than state for the same reason as scroll progress: this updates
 * continuously and must not re-render the 3D tree.
 *
 * Touch is included so the kite responds to a finger drag, but touchmove is
 * not cancelled — stealing it would break scrolling on the one device where
 * scrolling matters most.
 */
export function usePointer() {
  const pointer = useRef<PointerRef>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const set = (clientX: number, clientY: number) => {
      pointer.current.x = (clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((clientY / window.innerHeight) * 2 - 1);
      pointer.current.active = true;
    };

    const onMouse = (event: MouseEvent) => set(event.clientX, event.clientY);
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) set(touch.clientX, touch.clientY);
    };
    // Recentre when the pointer leaves, so the kite drifts back to neutral
    // instead of staying stuck at the last edge position.
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
      pointer.current.active = false;
    };

    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return pointer;
}
