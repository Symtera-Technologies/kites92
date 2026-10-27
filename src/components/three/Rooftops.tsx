'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedMesh, Object3D } from 'three';
import { gustNoise, mulberry32 } from '@/lib/three/kiteFlight';
import { kiteFabric, palette } from '@/lib/design/tokens';
import { useQuality } from './QualityProvider';

/**
 * A Lahore rooftop at Basant.
 *
 * Everything is procedural and deterministically seeded, so the skyline is
 * art-directed and identical on every load and on both server and client,
 * while costing nothing to download.
 *
 * Depth is built in three deliberate layers — the roof underfoot, a dense
 * midground of neighbouring rooftops, and a distant silhouette of minarets and
 * domes. That separation is what the scroll camera parallaxes against; a single
 * flat band of buildings would read as a backdrop painting.
 */

/** Triangular pennant, pointing down from its mount. */
function buildPennantGeometry(width = 0.17, height = 0.24): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([-width / 2, 0, 0, width / 2, 0, 0, 0, -height, 0]),
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

interface BuntingProps {
  /** Endpoints of the line, in local space. */
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  /** How far the line sags at its middle. */
  sag?: number;
}

/**
 * A string of pennants across the roof.
 *
 * Each flag flutters on its own phase, offset along the line, so the motion
 * travels as a wave instead of every flag flapping in unison — which is the
 * tell-tale sign of a single shared animation.
 */
function Bunting({ from, to, count = 11, sag = 0.5 }: BuntingProps) {
  const { reducedMotion } = useQuality();
  const flagsRef = useRef<Group>(null);
  const geometry = useMemo(() => buildPennantGeometry(), []);

  const flags = useMemo(() => {
    const rand = mulberry32(77);
    return Array.from({ length: count }, (_, i) => {
      const s = (i + 0.5) / count;
      return {
        position: [
          from[0] + (to[0] - from[0]) * s,
          from[1] + (to[1] - from[1]) * s - Math.sin(Math.PI * s) * sag,
          from[2] + (to[2] - from[2]) * s,
        ] as [number, number, number],
        color: kiteFabric[Math.floor(rand() * kiteFabric.length)],
        phase: s * 6,
      };
    });
  }, [from, to, count, sag]);

  useFrame(({ clock }) => {
    const group = flagsRef.current;
    if (!group || reducedMotion) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < group.children.length; i++) {
      const flag = group.children[i];
      const phase = flags[i]?.phase ?? 0;
      // Travelling wave down the line, plus a slow gust that leans them all.
      flag.rotation.z = Math.sin(t * 3.1 - phase) * 0.33 + gustNoise(t * 0.5, 9) * 0.15;
      flag.rotation.y = Math.sin(t * 2.3 - phase * 1.3) * 0.5;
    }
  });

  return (
    <group>
      <group ref={flagsRef}>
        {flags.map((flag, i) => (
          <mesh key={i} geometry={geometry} position={flag.position}>
            <meshStandardMaterial
              color={flag.color}
              side={DoubleSide}
              roughness={0.7}
              emissive={flag.color}
              emissiveIntensity={0.1}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Neighbouring rooftops, as one instanced draw call. */
function MidgroundRooftops({ count }: { count: number }) {
  const meshRef = useRef<InstancedMesh>(null);
  const { settings } = useQuality();

  const blocks = useMemo(() => {
    const rand = mulberry32(2024);
    return Array.from({ length: count }, () => {
      // Tall blocks sunk well below the hero roof, so their bases are hidden
      // behind its parapet. Short blocks sitting on an invisible plane read as
      // floating boxes — there is no street geometry down there to stand on.
      const height = 8 + rand() * 12;
      return {
        position: [
          (rand() - 0.5) * 70,
          height / 2 - 9,
          -12 - rand() * 55,
        ] as [number, number, number],
        scale: [2.5 + rand() * 5, height, 2.5 + rand() * 5] as [number, number, number],
        rotation: (rand() - 0.5) * 0.5,
        // Mostly Lahore brick and plaster, with the occasional painted wall —
        // a city of identical brown boxes reads as a placeholder.
        tint: rand(),
        painted: rand() > 0.72 ? rand() : -1,
      };
    });
  }, [count]);

  // These rooftops never move, so their transforms are written exactly once.
  // This belongs in a layout effect, not in the render body: mutating GPU
  // buffers during render runs twice under StrictMode and is not guaranteed to
  // happen before the first paint.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new Object3D();
    const color = new Color();
    const brick = new Color('#9C6B4F');
    const plaster = new Color('#C9AE92');
    // Muted washes seen on Lahore rooftops — desaturated so they sit behind
    // the kites rather than competing with them.
    const washes = [new Color('#7E9AA6'), new Color('#C9B06B'), new Color('#A98192')];

    blocks.forEach((block, i) => {
      dummy.position.set(...block.position);
      dummy.scale.set(...block.scale);
      dummy.rotation.y = block.rotation;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.copy(brick).lerp(plaster, block.tint);
      if (block.painted >= 0) {
        const wash = washes[Math.floor(block.painted * washes.length) % washes.length];
        color.lerp(wash, 0.65);
      }
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blocks]);

  return (
    <instancedMesh
      ref={meshRef}
      key={count}
      args={[undefined, undefined, count]}
      castShadow={settings.shadows}
      receiveShadow={settings.shadows}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.92} metalness={0} />
    </instancedMesh>
  );
}

/**
 * The far silhouette: minarets and domes.
 *
 * Deliberately simple shapes placed far back, where fog desaturates them into
 * a haze line. Detail here would be invisible and the geometry is only there
 * to say "this is Lahore, not anywhere".
 */
function DistantSkyline() {
  const minarets = useMemo(() => {
    const rand = mulberry32(555);
    return Array.from({ length: 7 }, (_, i) => ({
      x: -46 + i * 15 + (rand() - 0.5) * 7,
      z: -92 - rand() * 30,
      height: 13 + rand() * 9,
      radius: 0.75 + rand() * 0.4,
    }));
  }, []);

  const stone = '#B8A48C';

  return (
    <group>
      {minarets.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]}>
          {/* Shaft */}
          <mesh position={[0, m.height / 2 - 1, 0]}>
            <cylinderGeometry args={[m.radius * 0.8, m.radius, m.height, 10]} />
            <meshStandardMaterial color={stone} roughness={0.95} />
          </mesh>
          {/* Balcony */}
          <mesh position={[0, m.height - 1.4, 0]}>
            <cylinderGeometry args={[m.radius * 1.35, m.radius * 1.35, 0.45, 10]} />
            <meshStandardMaterial color={stone} roughness={0.95} />
          </mesh>
          {/* Cupola */}
          <mesh position={[0, m.height - 0.5, 0]}>
            <sphereGeometry args={[m.radius * 1.05, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#9E8B72" roughness={0.9} />
          </mesh>
          {/* Finial */}
          <mesh position={[0, m.height + 0.35, 0]}>
            <coneGeometry args={[m.radius * 0.3, 0.8, 8]} />
            <meshStandardMaterial color={palette.basant} roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Two large domes between the minarets. */}
      {[
        { x: -18, z: -100, r: 6.5 },
        { x: 24, z: -106, r: 5 },
      ].map((dome, i) => (
        <group key={i} position={[dome.x, 0, dome.z]}>
          <mesh position={[0, dome.r * 0.35, 0]}>
            <boxGeometry args={[dome.r * 2.4, dome.r * 0.8, dome.r * 2.4]} />
            <meshStandardMaterial color={stone} roughness={0.95} />
          </mesh>
          <mesh position={[0, dome.r * 0.75, 0]}>
            <sphereGeometry args={[dome.r, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#AD9478" roughness={0.88} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export interface RooftopsProps {
  /** Y position of the roof surface the character stands on. */
  roofY?: number;
}

export function Rooftops({ roofY = 0 }: RooftopsProps) {
  const { settings, tier } = useQuality();
  const midgroundCount = tier === 'low' ? 10 : tier === 'medium' ? 20 : 34;

  const plaster = '#D8C3A5';
  const parapet = '#C2A98C';

  return (
    <group position={[0, roofY, 0]}>
      {/* ── The roof underfoot ──
          Deep enough (z -7..9) that it runs under the camera's start position
          and fills the lower frame. A shallower slab left a band of empty sky
          across the bottom of the hero. */}
      <mesh position={[0, -0.5, 1]} receiveShadow={settings.shadows}>
        <boxGeometry args={[17, 1, 16]} />
        <meshStandardMaterial color={plaster} roughness={0.95} />
      </mesh>

      {/* Parapet walls. The front edge is left open so the camera can look
          over it into the street and the scroll journey has somewhere to go. */}
      <mesh position={[0, 0.35, -7]} castShadow={settings.shadows}>
        <boxGeometry args={[17, 0.7, 0.35]} />
        <meshStandardMaterial color={parapet} roughness={0.92} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[8.5 * side, 0.35, 1]} castShadow={settings.shadows}>
          <boxGeometry args={[0.35, 0.7, 16]} />
          <meshStandardMaterial color={parapet} roughness={0.92} />
        </mesh>
      ))}

      {/* ── Rooftop water tank on a stand ── */}
      <group position={[-4.6, 0, -4.2]}>
        <mesh position={[0, 1.5, 0]} castShadow={settings.shadows}>
          <cylinderGeometry args={[0.72, 0.72, 1.1, 14]} />
          <meshStandardMaterial color="#2F6F8F" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.08, 0]}>
          <cylinderGeometry args={[0.76, 0.76, 0.08, 14]} />
          <meshStandardMaterial color="#24596F" roughness={0.6} />
        </mesh>
        {[
          [-0.45, -0.45],
          [0.45, -0.45],
          [-0.45, 0.45],
          [0.45, 0.45],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.48, z]}>
            <boxGeometry args={[0.08, 0.95, 0.08]} />
            <meshStandardMaterial color="#5A4433" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* ── Satellite dish, the real signature of a Lahore rooftop ── */}
      <group position={[4.8, 0.55, -5]} rotation={[0, -0.6, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.07, 1, 0.07]} />
          <meshStandardMaterial color="#6E6E6E" roughness={0.7} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1, 0.1]} rotation={[-0.9, 0, 0]}>
          <sphereGeometry args={[0.46, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
          <meshStandardMaterial color="#DDD6CA" roughness={0.6} side={DoubleSide} />
        </mesh>
      </group>

      {/* ── Bunting across the roof ── */}
      <Bunting from={[-6.6, 2.4, -5.6]} to={[6.6, 2.9, -2.2]} count={13} sag={0.75} />
      <Bunting from={[-6.6, 1.9, 1.5]} to={[2, 2.6, -5.6]} count={9} sag={0.55} />

      {/* ── A few clay pots, for lived-in scale ── */}
      {/* Kept away from z > 3: anything nearer than that clips through the
          camera's start position and fills a corner of the hero. */}
      {[
        [6.6, -3.2],
        [7.2, -1.4],
        [-7.0, -4.4],
        [-6.4, 0.5],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.18, 0]} castShadow={settings.shadows}>
            <cylinderGeometry args={[0.2, 0.14, 0.36, 10]} />
            <meshStandardMaterial color="#A5593C" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.48, 0]}>
            <sphereGeometry args={[0.24, 8, 6]} />
            <meshStandardMaterial color="#3F6B35" roughness={0.9} />
          </mesh>
        </group>
      ))}

      <MidgroundRooftops count={midgroundCount} />
      {tier !== 'low' && <DistantSkyline />}
    </group>
  );
}
