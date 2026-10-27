'use client';

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import type { TetheredKite } from '@/lib/three/kiteFlight';
import { gustNoise } from '@/lib/three/kiteFlight';

/**
 * Structural type for drei's `Line`, which forwards its ref to a `Line2`.
 *
 * Typed by shape rather than imported from `three-stdlib`: that package is
 * drei's transitive dependency, not ours, so importing its types directly
 * would break the build the moment drei reorganises them.
 */
interface FatLine {
  geometry: {
    setPositions: (array: number[] | Float32Array) => void;
  };
}

interface KiteStringProps {
  sim: TetheredKite;
  /** Number of points along the curve. 24 is smooth at any plausible zoom. */
  segments?: number;
  color?: string;
  /** Screen-space width in pixels. Real kite line is thin; 1.5-2 reads well. */
  width?: number;
}

/**
 * The line from the flyer's hand to the kite.
 *
 * This is the detail that makes the hero scene believable, so it is driven by
 * the simulation's own tension rather than drawn as decoration:
 *
 *  - Slack line (`taut` below 1) sags under its own weight.
 *  - As the kite pulls to the end of its tether the sag vanishes and the line
 *    snaps straight, which is the visual cue that the kite is working.
 *  - The slack portion bows downwind, because a loose line is light enough for
 *    the wind to push sideways.
 *
 * Rendered as a fat line (`Line2`) rather than `LineBasicMaterial`, whose
 * `linewidth` is ignored by every major WebGL platform and would leave the
 * string a hairline on high-DPI phones.
 */
export function KiteString({
  sim,
  segments = 24,
  color = '#F4EBD8',
  width = 1.8,
}: KiteStringProps) {
  const lineRef = useRef<FatLine>(null);

  // Flat XYZ buffer, reused every frame. `Line2.setPositions` wants a flat
  // array, and reallocating 75 floats per frame is pure garbage.
  const buffer = useMemo(() => new Float32Array((segments + 1) * 3), [segments]);
  const scratch = useMemo(() => new Vector3(), []);

  // drei needs an initial point list to build the geometry; the real values
  // are written on the first frame.
  const initialPoints = useMemo<[number, number, number][]>(
    () => Array.from({ length: segments + 1 }, () => [0, 0, 0]),
    [segments],
  );

  useFrame(({ clock }) => {
    const line = lineRef.current;
    if (!line) return;

    const t = clock.elapsedTime;
    const anchor = sim.anchor;
    const kite = sim.position;

    const straight = scratch.copy(kite).sub(anchor).length();
    // How much line is not doing any work, in metres.
    const slack = Math.max(sim.stringLength - straight, 0);
    // Sag grows with slack but saturates: a very loose line puddles rather
    // than drooping proportionally forever.
    const sag = Math.min(slack * 0.42, 2.6);
    const bow = sag * 0.35 * (0.6 + 0.4 * gustNoise(t * 0.7, 2));

    for (let i = 0; i <= segments; i++) {
      const s = i / segments;
      // Half-sine: zero at both fixed ends, maximum in the middle.
      const droop = Math.sin(Math.PI * s);

      const base = i * 3;
      buffer[base] = anchor.x + (kite.x - anchor.x) * s + bow * droop;
      buffer[base + 1] = anchor.y + (kite.y - anchor.y) * s - sag * droop;
      buffer[base + 2] = anchor.z + (kite.z - anchor.z) * s + bow * droop * 0.5;
    }

    line.geometry.setPositions(buffer);
  });

  return (
    <Line
      ref={lineRef as never}
      points={initialPoints}
      color={color}
      lineWidth={width}
      // The line is thin and bright against the sky; skipping depth-write
      // avoids it carving a visible notch into the kite it attaches to.
      depthWrite={false}
      transparent
      opacity={0.9}
    />
  );
}
