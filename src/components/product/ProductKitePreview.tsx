'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';
import { KiteMesh } from '@/components/three/Kite';
import { SceneCanvas } from '@/components/three/SceneCanvas';
import { useQuality } from '@/components/three/QualityProvider';
import { KiteMotif } from '@/components/ui/KiteMotif';

function SpinningKite({ topColor, bottomColor }: { topColor: string; bottomColor: string }) {
  const group = useRef<Group>(null);
  const { reducedMotion } = useQuality();

  useFrame(({ clock }) => {
    const node = group.current;
    if (!node || reducedMotion) return;
    const t = clock.elapsedTime;
    // A slow turn with a slight bob, as though hanging on a line indoors —
    // enough to show both faces of the sail without making it hard to look at.
    node.rotation.y = t * 0.45;
    node.rotation.z = Math.sin(t * 0.9) * 0.08;
    node.position.y = Math.sin(t * 1.1) * 0.06;
  });

  return (
    <group ref={group}>
      <KiteMesh topColor={topColor} bottomColor={bottomColor} scale={1.5} tailLength={1.5} />
    </group>
  );
}

/**
 * Rotating 3D preview of a product, tinted by the selected variant.
 *
 * This shows the SHAPE and the COLOUR the customer is choosing, not a
 * photograph — the product page labels it as such. It reuses the same
 * `KiteMesh` as the hero, so a change to the kite geometry shows up
 * everywhere rather than drifting between scenes.
 */
export function ProductKitePreview({
  topColor,
  bottomColor,
  label,
}: {
  topColor: string;
  bottomColor: string;
  label: string;
}) {
  return (
    <SceneCanvas
      className="h-full w-full"
      camera={{ fov: 38, position: [0, 0.1, 4.2] }}
      fallback={
        <div className="flex h-full w-full items-center justify-center p-10">
          <KiteMotif topColor={topColor} bottomColor={bottomColor} label={label} />
        </div>
      }
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#FFF4E0" />
      <directionalLight position={[-4, -1, -3]} intensity={0.7} color="#39BDF8" />
      <SpinningKite topColor={topColor} bottomColor={bottomColor} />
    </SceneCanvas>
  );
}
