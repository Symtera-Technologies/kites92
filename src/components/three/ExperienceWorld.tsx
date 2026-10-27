'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, type RefObject } from 'react';
import { CatmullRomCurve3, Fog, Vector3 } from 'three';
import { TetheredKite, type WindParams } from '@/lib/three/kiteFlight';
import { palette } from '@/lib/design/tokens';
import type { ProgressRef } from '@/lib/hooks/useSectionProgress';
import { BackgroundKites } from './BackgroundKites';
import { Character } from './Character';
import { HeroKite } from './Kite';
import { KiteString } from './KiteString';
import { SkyDome } from './SkyDome';
import { useQuality } from './QualityProvider';

/**
 * Section C — a travelling shot across the rooftops at golden hour.
 *
 * Shares every system with the hero (kite simulation, character rig, sky
 * shader, instanced flock) and changes only the staging: more flyers, a
 * warmer sky, and a camera that tracks sideways rather than climbing. That
 * reuse is what makes the page feel like one continuous world instead of a
 * sequence of unrelated set pieces.
 */

const experienceWind: WindParams = {
  direction: new Vector3(-0.9, 0.12, -0.4).normalize(),
  baseSpeed: 5.2,
  gustiness: 0.38,
  seed: 29,
};

/** Rooftops the flyers stand on, spread along the camera's path. */
const ROOFS = [
  { x: -11, y: 3.4, z: -2, w: 11, d: 10, color: '#D8C3A5' },
  { x: 3, y: 2.4, z: -7, w: 13, d: 11, color: '#CBB294' },
  { x: 16, y: 4.2, z: -1, w: 10, d: 9, color: '#E0CBAD' },
];

function TravellingCamera({ progress }: { progress: RefObject<ProgressRef> }) {
  const camera = useThree((state) => state.camera);
  const { reducedMotion } = useQuality();

  // A gentle left-to-right drift with a slight rise, so the move reads as a
  // crane rather than a flat pan.
  const path = useMemo(
    () =>
      new CatmullRomCurve3(
        [
          new Vector3(-17, 7.5, 13),
          new Vector3(-7, 8.2, 12),
          new Vector3(4, 9.0, 12.5),
          new Vector3(14, 9.8, 12),
          new Vector3(23, 10.5, 13),
        ],
        false,
        'catmullrom',
        0.45,
      ),
    [],
  );

  const aim = useMemo(
    () =>
      new CatmullRomCurve3(
        [
          new Vector3(-14, 6.5, -6),
          new Vector3(-5, 7.0, -8),
          new Vector3(5, 7.6, -9),
          new Vector3(15, 8.2, -8),
          new Vector3(23, 8.8, -6),
        ],
        false,
        'catmullrom',
        0.45,
      ),
    [],
  );

  const scratch = useMemo(
    () => ({ position: new Vector3(), target: new Vector3(), smoothed: 0 }),
    [],
  );

  useFrame((_, delta) => {
    const raw = progress.current?.value ?? 0;
    const k = 1 - Math.pow(0.002, Math.min(delta, 0.05));
    scratch.smoothed += (raw - scratch.smoothed) * (reducedMotion ? 1 : k);
    const t = Math.min(Math.max(scratch.smoothed, 0), 1);

    path.getPointAt(t, scratch.position);
    aim.getPointAt(t, scratch.target);
    camera.position.copy(scratch.position);
    camera.lookAt(scratch.target);
  });

  return null;
}

export function ExperienceWorld({ progress }: { progress: RefObject<ProgressRef> }) {
  const { settings, tier, reducedMotion } = useQuality();
  const scene = useThree((state) => state.scene);

  // Flyer count scales with the device. The IK rig is the most expensive thing
  // in the scene, so this is the lever that keeps a mid-range phone usable.
  const flyerCount = tier === 'low' ? 0 : tier === 'medium' ? 1 : 2;

  const sims = useMemo(
    () =>
      Array.from(
        { length: flyerCount },
        (_, i) =>
          new TetheredKite({
            stringLength: 9 + i * 2,
            floorY: 7 + i,
            seed: 13 + i * 17,
          }),
      ),
    [flyerCount],
  );

  useLayoutEffect(() => {
    const previous = scene.fog;
    // Warmer and tighter than the hero's haze, which is what sells late
    // afternoon light over a dusty city.
    scene.fog = new Fog('#F0C98B', 30, 150);
    return () => {
      scene.fog = previous;
    };
  }, [scene]);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    for (const sim of sims) sim.step(delta, clock.elapsedTime, experienceWind);
  });

  return (
    <>
      <SkyDome preset="sunset" sunDirection={[-0.8, 0.2, 0.3]} radius={300} />

      <directionalLight
        position={[-26, 10, 12]}
        intensity={2.4}
        color="#FFCE8E"
        castShadow={settings.shadows}
        shadow-mapSize-width={settings.shadows ? 1024 : 256}
        shadow-mapSize-height={settings.shadows ? 1024 : 256}
        shadow-camera-far={80}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0008}
      />
      <hemisphereLight args={['#FFB36B', '#8A6A4E', 1.1]} />
      <ambientLight intensity={0.5} />

      {ROOFS.map((roof, index) => (
        <group key={index} position={[roof.x, roof.y, roof.z]}>
          <mesh position={[0, -0.5, 0]} receiveShadow={settings.shadows}>
            <boxGeometry args={[roof.w, 1, roof.d]} />
            <meshStandardMaterial color={roof.color} roughness={0.95} />
          </mesh>
          {/* Back parapet only; the camera never sees the other three. */}
          <mesh position={[0, 0.35, -roof.d / 2]} castShadow={settings.shadows}>
            <boxGeometry args={[roof.w, 0.7, 0.3]} />
            <meshStandardMaterial color="#C2A98C" roughness={0.92} />
          </mesh>
          {/* The building below, sunk far enough that its base never shows. */}
          <mesh position={[0, -7, 0]}>
            <boxGeometry args={[roof.w * 0.94, 13, roof.d * 0.94]} />
            <meshStandardMaterial color="#A9815F" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {sims.map((sim, index) => (
        <group key={index}>
          <Character
            sim={sim}
            position={[ROOFS[index].x + (index === 0 ? 1.5 : -2), ROOFS[index].y, ROOFS[index].z + 2]}
            rotationY={index === 0 ? -0.9 : -1.6}
            scale={1.05}
            kameezColor={index === 0 ? palette.cream : '#FFE7C2'}
          />
          <HeroKite
            sim={sim}
            topColor={index === 0 ? palette.vibrant : palette.sky}
            bottomColor={index === 0 ? palette.basant : palette.cream}
            scale={1.5}
            tailLength={1.9}
          />
          <KiteString sim={sim} width={1.5} />
        </group>
      ))}

      {/* Denser than the hero: this section is about the sky being full. */}
      <BackgroundKites count={Math.round(settings.backgroundKites * 1.3)} seed={404} />

      <TravellingCamera progress={progress} />
    </>
  );
}
