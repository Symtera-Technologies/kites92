'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { DoubleSide, Group } from 'three';
import { getSailGeometry, getSparGeometry, buildTailGeometry } from '@/lib/three/kiteGeometry';
import { getSailTexture } from '@/lib/three/materials';
import type { TetheredKite } from '@/lib/three/kiteFlight';
import { useQuality } from './QualityProvider';

interface KiteMeshProps {
  /** Upper sail colour (above the cross-spar). */
  topColor: string;
  /** Lower sail colour. */
  bottomColor: string;
  /** Overall scale in world units. */
  scale?: number;
  /** Tail length relative to the kite. Set 0 to omit the tail. */
  tailLength?: number;
}

/**
 * The kite body: billowed paper sail, crossed spars, fluttering tail.
 *
 * Purely presentational — it holds no flight state, so the same mesh serves
 * the hero kite, the product previews and the bundle builder.
 */
export function KiteMesh({
  topColor,
  bottomColor,
  scale = 1,
  tailLength = 1.6,
}: KiteMeshProps) {
  const { settings, reducedMotion } = useQuality();

  const sailGeometry = useMemo(
    () => getSailGeometry({ segments: settings.segments }),
    [settings.segments],
  );
  const sparGeometry = useMemo(() => getSparGeometry({}), []);
  const texture = useMemo(() => getSailTexture(topColor, bottomColor), [topColor, bottomColor]);

  const tail = useMemo(
    () =>
      tailLength > 0
        ? buildTailGeometry({
            length: tailLength,
            // Fewer segments on weak devices; the whip reads fine at 10.
            segments: Math.max(8, Math.round(settings.segments * 1.25)),
          })
        : null,
    [tailLength, settings.segments],
  );

  // Geometry built here is owned here, so it must be released here. Without
  // this, every quality change or remount leaks a GPU buffer.
  useEffect(() => () => tail?.geometry.dispose(), [tail]);

  useFrame(({ clock }) => {
    if (!tail || reducedMotion) return;
    const t = clock.elapsedTime;
    tail.update(t, Math.sin(t * 0.6) * 0.5);
  });

  return (
    <group scale={scale}>
      <mesh geometry={sailGeometry} castShadow={settings.shadows}>
        <meshStandardMaterial
          map={texture}
          side={DoubleSide}
          roughness={0.72}
          metalness={0}
          // Paper is thin enough to glow when backlit. A faint emissive tint
          // fakes that far more cheaply than real transmission.
          emissive={topColor}
          emissiveIntensity={0.1}
        />
      </mesh>

      <mesh geometry={sparGeometry}>
        <meshStandardMaterial color="#6B4A2A" roughness={0.9} metalness={0} />
      </mesh>

      {tail && (
        // Anchored at the kite's lower tip and trailing downward.
        <mesh geometry={tail.geometry} position={[0, -0.5, 0]}>
          <meshStandardMaterial
            color={bottomColor}
            side={DoubleSide}
            roughness={0.8}
            emissive={bottomColor}
            emissiveIntensity={0.08}
          />
        </mesh>
      )}
    </group>
  );
}

interface HeroKiteProps extends KiteMeshProps {
  /** The flight simulation driving this kite. Owned by the parent scene. */
  sim: TetheredKite;
}

/**
 * The hero kite: a `KiteMesh` slaved to a running flight simulation.
 *
 * Transform is copied from the simulation rather than interpolated toward it.
 * The simulation already runs at frame rate with its own damping, so smoothing
 * on top would only add visible lag between the kite and its string.
 */
export function HeroKite({ sim, ...meshProps }: HeroKiteProps) {
  const group = useRef<Group>(null);

  useFrame(() => {
    const node = group.current;
    if (!node) return;
    node.position.copy(sim.position);
    node.quaternion.copy(sim.quaternion);
  });

  return (
    <group ref={group}>
      <KiteMesh {...meshProps} />
    </group>
  );
}
