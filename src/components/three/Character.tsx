'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Euler, Group, Mesh, Quaternion, Vector3 } from 'three';
import { boneQuaternion, createIKResult, solveTwoBoneIK } from '@/lib/three/ik';
import { gustNoise, type TetheredKite } from '@/lib/three/kiteFlight';
import { palette } from '@/lib/design/tokens';
import { clamp } from '@/lib/utils';
import { useQuality } from './QualityProvider';

/**
 * The kite flyer.
 *
 * Built from primitives in code rather than loaded as a rigged GLB, so the
 * site has no external asset dependency and the figure can be recoloured per
 * scene. The trade-off is deliberate: a stylised low-poly figure that moves
 * correctly reads far better than a detailed model that moves wrongly, and
 * every joint here is driven by the same simulation the kite uses.
 *
 * What makes it feel alive is that nothing is a canned loop:
 *
 *  - The right hand IK-tracks the kite's actual position, so the arm follows
 *    the kite rather than miming at it.
 *  - Torso lean and the pulling motion come from the simulation's line
 *    tension, so the flyer visibly braces when the kite pulls hard.
 *  - The head turns to watch the kite, clamped to a human range.
 *  - Breathing, weight shift and gust response run on noise, not a cycle, so
 *    the pose never visibly repeats.
 *
 * Proportions are in metres for a roughly 1.7m-tall figure standing at y = 0.
 */

// Skeleton dimensions, shared by the geometry and the IK.
const HIP_Y = 0.85;
const SHOULDER_Y = 1.4;
const SHOULDER_X = 0.18;
const HEAD_Y = 1.58;
const UPPER_ARM = 0.28;
const FOREARM = 0.26;
const ARM_REACH = UPPER_ARM + FOREARM;

export interface CharacterProps {
  sim: TetheredKite;
  /** Position of the flyer's feet. */
  position?: [number, number, number];
  /** Facing direction in radians about Y. */
  rotationY?: number;
  kameezColor?: string;
  shalwarColor?: string;
  skinColor?: string;
  /** Scales the whole figure. */
  scale?: number;
}

export function Character({
  sim,
  position = [0, 0, 0],
  rotationY = 0,
  kameezColor = palette.cream,
  shalwarColor = '#E8DCC8',
  skinColor = '#C68642',
  scale = 1,
}: CharacterProps) {
  const { settings, reducedMotion } = useQuality();

  const root = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const hips = useRef<Group>(null);
  const charkhi = useRef<Group>(null);

  // Arm bone meshes, posed directly from the IK result each frame.
  const rUpper = useRef<Mesh>(null);
  const rFore = useRef<Mesh>(null);
  const rHand = useRef<Mesh>(null);
  const lUpper = useRef<Mesh>(null);
  const lFore = useRef<Mesh>(null);
  const lHand = useRef<Mesh>(null);

  // Scratch state. Allocating per frame would dominate the character's cost.
  const scratch = useMemo(
    () => ({
      rightIK: createIKResult(),
      leftIK: createIKResult(),
      shoulder: new Vector3(),
      target: new Vector3(),
      toKite: new Vector3(),
      handWorld: new Vector3(),
      headOrigin: new Vector3(0, HEAD_Y, 0),
      pole: new Vector3(),
      quat: new Quaternion(),
      euler: new Euler(0, 0, 0, 'YXZ'),
      smoothedTaut: 0,
      headYaw: 0,
      headPitch: 0,
    }),
    [],
  );

  /** Pose one arm from a world-space hand target. Returns the hand position. */
  const poseArm = (
    side: 'left' | 'right',
    target: Vector3,
    pole: Vector3,
    upperRef: React.RefObject<Mesh | null>,
    foreRef: React.RefObject<Mesh | null>,
    handRef: React.RefObject<Mesh | null>,
  ) => {
    const sign = side === 'right' ? 1 : -1;
    const shoulder = scratch.shoulder.set(SHOULDER_X * sign, SHOULDER_Y, 0);
    const ik = side === 'right' ? scratch.rightIK : scratch.leftIK;

    solveTwoBoneIK(shoulder, target, UPPER_ARM, FOREARM, pole, ik);

    const upper = upperRef.current;
    const fore = foreRef.current;
    const hand = handRef.current;

    if (upper) {
      // Capsules are centred on their own origin with the long axis on +Y, so
      // each bone sits at its midpoint and is rotated onto the joint-to-joint
      // direction.
      upper.position.copy(shoulder).add(ik.elbow).multiplyScalar(0.5);
      upper.quaternion.copy(boneQuaternion(shoulder, ik.elbow, scratch.quat));
    }
    if (fore) {
      fore.position.copy(ik.elbow).add(ik.effector).multiplyScalar(0.5);
      fore.quaternion.copy(boneQuaternion(ik.elbow, ik.effector, scratch.quat));
    }
    if (hand) hand.position.copy(ik.effector);

    return ik.effector;
  };

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    // Frame-rate independent smoothing factor.
    const k = reducedMotion ? 1 : 1 - Math.pow(0.0001, Math.min(delta, 0.05));

    // ── Line tension drives the whole upper body ────────────────────────────
    scratch.smoothedTaut += (sim.taut - scratch.smoothedTaut) * k;
    const pull = clamp(scratch.smoothedTaut, 0, 1);

    const breath = reducedMotion ? 0 : Math.sin(t * 1.6) * 0.012;
    const sway = reducedMotion ? 0 : gustNoise(t * 0.45, 31) * 0.035;

    if (hips.current) {
      // Weight shifts from foot to foot, and the stance braces as the kite pulls.
      hips.current.position.y = breath * 0.5 - pull * 0.025;
      hips.current.rotation.z = sway * 0.4;
    }

    if (torso.current) {
      // Lean back against the pull; this is the single clearest cue that the
      // kite is actually tugging on the line.
      torso.current.rotation.x = -pull * 0.17 - breath;
      torso.current.rotation.y = sway * 0.6;
      torso.current.position.y = breath;
    }

    // ── Where is the kite, relative to the flyer? ──────────────────────────
    //
    // Converted into TORSO space, not root space. The arms, head and charkhi
    // are all children of the torso group, so a target expressed in root
    // space would have the torso's lean and sway applied to it a second time —
    // the arms would drift away from the shoulders as the figure leaned.
    //
    // `updateWorldMatrix` is called first because the torso's transform was
    // just reassigned above and its cached world matrix is still last frame's.
    const node = torso.current;
    scratch.toKite.copy(sim.position);
    if (node) {
      node.updateWorldMatrix(true, false);
      node.worldToLocal(scratch.toKite);
    }

    // ── Right arm: holds the line, tracks the kite ──────────────────────────
    const shoulderR = scratch.shoulder.set(SHOULDER_X, SHOULDER_Y, 0);
    scratch.target.copy(scratch.toKite).sub(shoulderR);
    const kiteDistance = scratch.target.length() || 1;
    scratch.target.divideScalar(kiteDistance);

    // The hand reaches further along the line as tension rises — a slack line
    // is held comfortably in, a taut one is held out and braced.
    const extension = ARM_REACH * (0.62 + 0.3 * pull);
    scratch.target.multiplyScalar(extension).add(shoulderR);
    // Keep the hand out of the chest and above the hip no matter where the
    // kite goes, including directly overhead or behind.
    scratch.target.y = Math.max(scratch.target.y, HIP_Y + 0.08);

    // Elbow points down and back, as a human arm does when flying a kite.
    scratch.pole.set(0.4, -1, -0.65).normalize();
    const rightHand = poseArm('right', scratch.target, scratch.pole, rUpper, rFore, rHand);

    // The string must start exactly where the hand is, so the anchor is read
    // back from the posed skeleton rather than guessed at.
    //
    // This is one frame behind the simulation, which stepped before this
    // callback ran. At 60fps that is a sub-millimetre offset on a 15m line and
    // is not perceivable; the alternative, forcing an ordering with
    // `renderPriority`, would disable R3F's automatic rendering entirely.
    scratch.handWorld.copy(rightHand);
    if (node) node.localToWorld(scratch.handWorld);
    sim.anchor.copy(scratch.handWorld);

    // ── Left arm: holds the charkhi against the chest ───────────────────────
    const charkhiLocal = scratch.target.set(
      -SHOULDER_X - 0.08,
      HIP_Y + 0.3 + breath * 2,
      0.26 + pull * 0.04,
    );
    scratch.pole.set(-0.5, -1, -0.5).normalize();
    poseArm('left', charkhiLocal, scratch.pole, lUpper, lFore, lHand);

    if (charkhi.current) {
      charkhi.current.position.copy(charkhiLocal);
      // The spool pays out line when the kite pulls and rests when it does not.
      if (!reducedMotion) charkhi.current.rotation.z -= delta * (0.4 + pull * 5.5);
    }

    // ── Head watches the kite ──────────────────────────────────────────────
    if (head.current) {
      scratch.target.copy(scratch.toKite).sub(scratch.headOrigin).normalize();
      // Exact with 'YXZ' order: yaw about Y, then pitch about X, maps local +Z
      // (the face) onto the direction vector.
      const yaw = clamp(Math.atan2(scratch.target.x, scratch.target.z), -1.2, 1.2);
      const pitch = clamp(-Math.asin(clamp(scratch.target.y, -1, 1)), -0.85, 0.5);

      scratch.headYaw += (yaw - scratch.headYaw) * k * 0.6;
      scratch.headPitch += (pitch - scratch.headPitch) * k * 0.6;

      scratch.euler.set(scratch.headPitch, scratch.headYaw, 0);
      head.current.rotation.copy(scratch.euler);
    }
  });

  const capsuleSegments = Math.max(4, Math.round(settings.segments / 3));

  return (
    <group ref={root} position={position} rotation-y={rotationY} scale={scale}>
      <group ref={hips}>
        {/* ── Shalwar: loose trousers, gathered at the ankle ── */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[0.09 * side, 0.46, 0]} castShadow={settings.shadows}>
              <cylinderGeometry args={[0.1, 0.14, 0.78, capsuleSegments * 2]} />
              <meshStandardMaterial color={shalwarColor} roughness={0.85} />
            </mesh>
            {/* Ankle cuff */}
            <mesh position={[0.09 * side, 0.07, 0]}>
              <cylinderGeometry args={[0.055, 0.05, 0.1, capsuleSegments * 2]} />
              <meshStandardMaterial color={shalwarColor} roughness={0.85} />
            </mesh>
            {/* Foot */}
            <mesh position={[0.09 * side, 0.025, 0.04]} castShadow={settings.shadows}>
              <boxGeometry args={[0.095, 0.05, 0.22]} />
              <meshStandardMaterial color="#4A3728" roughness={0.7} />
            </mesh>
          </group>
        ))}

        <group ref={torso}>
          {/* ── Kameez: long tunic flaring over the hips ── */}
          <mesh position={[0, 1.08, 0]} castShadow={settings.shadows}>
            <cylinderGeometry args={[0.17, 0.25, 0.74, capsuleSegments * 3]} />
            <meshStandardMaterial color={kameezColor} roughness={0.78} />
          </mesh>
          {/* Shoulders / chest */}
          <mesh position={[0, 1.37, 0]} castShadow={settings.shadows}>
            <capsuleGeometry args={[0.165, 0.12, 2, capsuleSegments * 3]} />
            <meshStandardMaterial color={kameezColor} roughness={0.78} />
          </mesh>

          {/* ── Sash: the one saturated accent on the figure ── */}
          <mesh position={[0, 1.18, 0.02]} rotation={[0, 0, 0.32]}>
            <torusGeometry args={[0.2, 0.028, 8, capsuleSegments * 4]} />
            <meshStandardMaterial
              color={palette.vibrant}
              roughness={0.5}
              emissive={palette.vibrant}
              emissiveIntensity={0.12}
            />
          </mesh>

          {/* ── Head ── */}
          <group ref={head} position={[0, HEAD_Y, 0]}>
            <mesh castShadow={settings.shadows}>
              <sphereGeometry args={[0.112, capsuleSegments * 4, capsuleSegments * 3]} />
              <meshStandardMaterial color={skinColor} roughness={0.62} />
            </mesh>
            {/* Hair, swept back. The cap stops near the equator and is nudged
                backward so it does not close over the brow — a deeper sphere
                swallowed the face at the distance the hero frames him. */}
            <mesh position={[0, 0.028, -0.022]} scale={[1.04, 0.95, 1.02]}>
              <sphereGeometry
                args={[0.112, capsuleSegments * 4, capsuleSegments * 3, 0, Math.PI * 2, 0, Math.PI * 0.46]}
              />
              <meshStandardMaterial color="#17120F" roughness={0.55} />
            </mesh>
            {/* Nose: tiny, but it is what makes the head read as facing a
                direction at all once the figure is small on screen. */}
            <mesh position={[0, -0.012, 0.104]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.016, 0.034, 6]} />
              <meshStandardMaterial color={skinColor} roughness={0.62} />
            </mesh>
            {/* Eyes, on +Z — the face direction the look-at maths assumes */}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[0.036 * side, 0.012, 0.098]}>
                <sphereGeometry args={[0.014, 8, 8]} />
                <meshStandardMaterial color="#1A1410" roughness={0.3} />
              </mesh>
            ))}
            {/* Neck */}
            <mesh position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.042, 0.05, 0.07, capsuleSegments * 2]} />
              <meshStandardMaterial color={skinColor} roughness={0.62} />
            </mesh>
          </group>

          {/* ── Arms: posed by IK every frame ── */}
          {(['right', 'left'] as const).map((side) => {
            const upperRef = side === 'right' ? rUpper : lUpper;
            const foreRef = side === 'right' ? rFore : lFore;
            const handRef = side === 'right' ? rHand : lHand;
            return (
              <group key={side}>
                <mesh ref={upperRef} castShadow={settings.shadows}>
                  <capsuleGeometry args={[0.046, UPPER_ARM - 0.092, 2, capsuleSegments * 2]} />
                  <meshStandardMaterial color={kameezColor} roughness={0.78} />
                </mesh>
                <mesh ref={foreRef} castShadow={settings.shadows}>
                  <capsuleGeometry args={[0.039, FOREARM - 0.078, 2, capsuleSegments * 2]} />
                  <meshStandardMaterial color={skinColor} roughness={0.62} />
                </mesh>
                <mesh ref={handRef}>
                  <sphereGeometry args={[0.046, capsuleSegments * 2, capsuleSegments * 2]} />
                  <meshStandardMaterial color={skinColor} roughness={0.62} />
                </mesh>
              </group>
            );
          })}

          {/* ── Charkhi: the string spool, held in the left hand ── */}
          <group ref={charkhi}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.072, 0.072, 0.15, capsuleSegments * 3]} />
              <meshStandardMaterial color={palette.basant} roughness={0.6} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[0.082 * side, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.105, 0.105, 0.016, capsuleSegments * 3]} />
                <meshStandardMaterial color="#8B5E34" roughness={0.8} />
              </mesh>
            ))}
            {/* Handle shaft, so the spool reads as a real charkhi */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.26, 6]} />
              <meshStandardMaterial color="#6B4A2A" roughness={0.9} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
