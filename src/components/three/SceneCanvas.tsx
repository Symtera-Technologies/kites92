'use client';

import { Canvas, type CanvasProps } from '@react-three/fiber';
import { Suspense, type ReactNode } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { useInView } from '@/lib/hooks/useInView';
import { cn } from '@/lib/utils';
import { useQuality } from './QualityProvider';

interface SceneCanvasProps extends Omit<CanvasProps, 'children' | 'fallback'> {
  children: ReactNode;
  /**
   * Shown instead of the canvas when WebGL is unavailable. Required: a 3D-first
   * storefront must still be shoppable on a device that cannot render it.
   */
  fallback: ReactNode;
  className?: string;
  /** Keep rendering while offscreen. Only for a scene that is always visible. */
  alwaysRender?: boolean;
}

/**
 * Shared wrapper for every 3D scene on the site.
 *
 * Centralises three things that are easy to get wrong per-scene:
 *
 *  1. WebGL absence renders `fallback` instead of a blank rectangle.
 *  2. Offscreen scenes stop their render loop entirely (`frameloop="never"`),
 *     so a long page with several scenes costs one scene's GPU time.
 *  3. Reduced-motion visitors get a single rendered frame — a still of the
 *     world rather than nothing at all, which keeps the art direction while
 *     respecting the preference.
 */
export function SceneCanvas({
  children,
  fallback,
  className,
  alwaysRender = false,
  ...canvasProps
}: SceneCanvasProps) {
  const { settings, reducedMotion, webgl, resolved } = useQuality();
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '300px' });

  // Only trust a negative WebGL result after detection has actually run;
  // before that, `webgl` is just the optimistic default.
  if (resolved && !webgl) {
    return (
      <div ref={ref} className={cn('relative', className)}>
        {fallback}
      </div>
    );
  }

  const active = alwaysRender || inView;
  const frameloop = !active ? 'never' : reducedMotion ? 'demand' : 'always';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Canvas
        // The scene is decorative scenery; the surrounding markup carries the
        // meaning, so screen readers should skip it rather than announce an
        // unlabelled graphic.
        aria-hidden
        frameloop={frameloop}
        dpr={settings.dpr}
        shadows={settings.shadows}
        gl={{
          antialias: settings.shadows, // off on the low tier, where it costs most
          powerPreference: 'high-performance',
          alpha: true,
          // The sky is a gradient dome, so there is nothing to read back.
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        {...canvasProps}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
