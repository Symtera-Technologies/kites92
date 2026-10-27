'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, InstancedMesh, Object3D, Quaternion, Vector3 } from 'three';
import { createDriftingFlock } from '@/lib/three/kiteFlight';
import { getSailGeometry } from '@/lib/three/kiteGeometry';
import { kiteFabric } from '@/lib/design/tokens';
import { useQuality } from './QualityProvider';

interface BackgroundKitesProps {
  /** Overrides the quality tier's count. Used by scenes that want a denser sky. */
  count?: number;
  seed?: number;
}

/**
 * The sky full of other people's kites.
 *
 * One `InstancedMesh`, so the whole flock is a single draw call regardless of
 * count — the difference between a sky that reads as a festival and a sky that
 * costs thirty draw calls. Colour varies per instance through `instanceColor`,
 * which `MeshStandardMaterial` picks up with no shader work.
 *
 * Count comes from the resolved quality tier (36 / 18 / 8), which is the single
 * biggest lever on frame rate in the hero scene.
 */
export function BackgroundKites({ count, seed = 1337 }: BackgroundKitesProps) {
  const { settings, reducedMotion } = useQuality();
  const total = count ?? settings.backgroundKites;

  const meshRef = useRef<InstancedMesh>(null);

  const flock = useMemo(() => createDriftingFlock(total, seed), [total, seed]);
  const geometry = useMemo(
    // Distant kites get the coarsest sail that still silhouettes correctly.
    () => getSailGeometry({ segments: Math.max(4, Math.round(settings.segments / 2)) }),
    [settings.segments],
  );

  // Scratch objects, hoisted out of the frame loop.
  const dummy = useMemo(() => new Object3D(), []);
  const position = useMemo(() => new Vector3(), []);
  const quaternion = useMemo(() => new Quaternion(), []);

  /** Write every instance's transform for time `t`. */
  const writeMatrices = (t: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < flock.length; i++) {
      const kite = flock[i];
      kite.sample(t, position, quaternion);
      dummy.position.copy(position);
      dummy.quaternion.copy(quaternion);
      dummy.scale.setScalar(kite.spec.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  // Colours never change, so they are written once rather than every frame.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const color = new Color();
    for (let i = 0; i < flock.length; i++) {
      color.set(kiteFabric[flock[i].spec.colorIndex % kiteFabric.length]);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Seed the transforms too, so a reduced-motion visitor sees a composed
    // sky on the single frame that gets rendered.
    writeMatrices(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flock]);

  // The instanced mesh owns a cloned geometry internally; the shared sail
  // geometry is cached and must outlive this component, so only the mesh's own
  // instance buffers are released.
  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      // Braces matter: `dispose()` returns the mesh, and returning it from an
      // effect would make React treat it as the cleanup function.
      mesh?.dispose();
    };
  }, []);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    writeMatrices(clock.elapsedTime);
  });

  return (
    <instancedMesh
      ref={meshRef}
      // `args` is fixed at construction, so changing the count must remount
      // the mesh — hence `key`.
      key={total}
      args={[geometry, undefined, total]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        side={DoubleSide}
        roughness={0.75}
        metalness={0}
      />
    </instancedMesh>
  );
}
