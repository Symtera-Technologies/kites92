import { Quaternion, Vector3 } from 'three';

/**
 * Analytic two-bone inverse kinematics, for the character's arms.
 *
 * Closed-form rather than iterative (FABRIK/CCD): a two-bone chain has an
 * exact solution from the law of cosines, so iterating would be slower, less
 * stable, and no more accurate.
 *
 * The ambiguity in a two-bone chain is which way the elbow points — the
 * solution space is a circle around the shoulder-to-target axis. A pole vector
 * picks one point on that circle, which is what stops the arm flipping its
 * elbow inside-out between frames.
 */

export interface TwoBoneResult {
  /** World position of the middle joint (elbow or knee). */
  elbow: Vector3;
  /**
   * Where the chain's end actually landed.
   *
   * Equals the target when it lies in the reachable annulus, and otherwise the
   * nearest reachable point along the same direction — clamped at BOTH bounds.
   * A target nearer than |upper - lower| is as unreachable as one beyond
   * upper + lower; the arm is fully folded rather than fully extended.
   */
  effector: Vector3;
  /** True when the target was beyond reach and the chain is fully extended. */
  overextended: boolean;
  /** True when the target was unreachable in either direction. */
  clampedToReach: boolean;
}

const _toTarget = new Vector3();
const _axis = new Vector3();
const _pole = new Vector3();
const _rot = new Quaternion();

/**
 * Solve a two-bone chain.
 *
 * @param root       Shoulder position.
 * @param target     Desired hand position.
 * @param upperLen   Shoulder-to-elbow length.
 * @param lowerLen   Elbow-to-hand length.
 * @param poleVector Hint for the elbow direction, in world space. For a human
 *                   arm this usually points backward and outward.
 * @param out        Result object, reused across frames to avoid allocation.
 */
export function solveTwoBoneIK(
  root: Vector3,
  target: Vector3,
  upperLen: number,
  lowerLen: number,
  poleVector: Vector3,
  out: TwoBoneResult,
): TwoBoneResult {
  _toTarget.copy(target).sub(root);
  const reach = upperLen + lowerLen;
  let distance = _toTarget.length();

  if (distance < 1e-6) {
    // Target sits on the shoulder, so it carries no direction information.
    // Point the arm down and treat the distance as zero, which the clamp below
    // turns into a fully folded arm.
    //
    // Note the ordering: the fallback is already a unit vector, so it must NOT
    // then be divided by `distance`. Doing that scaled it to 1e6 and sent the
    // elbow to infinity.
    _toTarget.set(0, -1, 0);
    distance = 0;
  } else {
    _toTarget.divideScalar(distance);
  }

  const dirToTarget = _toTarget; // unit

  // Clamp into the annulus the chain can actually reach. The inner bound
  // matters for very unequal bones: a target closer than |upper - lower|
  // cannot be reached either, and without the clamp the cosine below leaves
  // [-1, 1] and `acos` returns NaN.
  const minReach = Math.abs(upperLen - lowerLen) + 1e-5;
  const maxReach = reach - 1e-5;
  const clamped = Math.min(Math.max(distance, minReach), maxReach);
  const overextended = distance > maxReach;

  // Interior angle at the shoulder, between the upper bone and the target
  // direction, by the law of cosines.
  const cosShoulder =
    (upperLen * upperLen + clamped * clamped - lowerLen * lowerLen) /
    (2 * upperLen * clamped);
  const shoulderAngle = Math.acos(Math.min(Math.max(cosShoulder, -1), 1));

  // Build the bend plane. The elbow is rotated off the target axis by
  // `shoulderAngle` about an axis perpendicular to both that axis and the pole.
  _pole.copy(poleVector);
  _axis.crossVectors(dirToTarget, _pole);

  if (_axis.lengthSq() < 1e-8) {
    // Pole is parallel to the target direction, so it cannot disambiguate.
    // Fall back to any perpendicular axis; the arm bends in *some* valid
    // plane instead of snapping to a NaN orientation.
    _pole.set(0, 0, 1);
    _axis.crossVectors(dirToTarget, _pole);
    if (_axis.lengthSq() < 1e-8) {
      _pole.set(1, 0, 0);
      _axis.crossVectors(dirToTarget, _pole);
    }
  }
  _axis.normalize();

  _rot.setFromAxisAngle(_axis, shoulderAngle);
  out.elbow.copy(dirToTarget).applyQuaternion(_rot).multiplyScalar(upperLen).add(root);

  // Report where the hand truly ends up, not where it was asked to go.
  //
  // This must use `clamped`, the distance the angle solution was actually
  // built from. Placing the effector at the raw target whenever it was merely
  // *inside* the annulus silently stretches the lower bone — the arm visibly
  // grows as the hand comes in toward the chest.
  const unreachable = clamped !== distance;
  if (unreachable) {
    out.effector.copy(root).addScaledVector(dirToTarget, clamped);
  } else {
    out.effector.copy(target);
  }

  out.overextended = overextended;
  out.clampedToReach = unreachable;
  return out;
}

/** Allocate a reusable result object. */
export function createIKResult(): TwoBoneResult {
  return {
    elbow: new Vector3(),
    effector: new Vector3(),
    overextended: false,
    clampedToReach: false,
  };
}

const _boneDir = new Vector3();
const _up = new Vector3(0, 1, 0);

/**
 * Orientation for a bone mesh spanning `from` to `to`.
 *
 * Assumes the mesh's own long axis is +Y, which is how three's cylinder and
 * capsule geometries are built, so bone meshes need no corrective rotation.
 */
export function boneQuaternion(from: Vector3, to: Vector3, out: Quaternion): Quaternion {
  _boneDir.copy(to).sub(from);
  if (_boneDir.lengthSq() < 1e-10) return out.identity();
  _boneDir.normalize();
  return out.setFromUnitVectors(_up, _boneDir);
}
