// Numerical acceptance checks for the two-bone IK solver (npm run test:ik).
//
// IK shares the kite simulation's hazard: a wrong solution still looks like
// reasonable trigonometry. These assertions pin the properties that actually
// matter on screen — bone lengths never stretch, the hand reaches the target
// when it can, and no input produces NaN.
import { Vector3 } from 'three';
import { solveTwoBoneIK, createIKResult, boneQuaternion } from '../src/lib/three/ik.ts';
import { Quaternion } from 'three';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
};

const UPPER = 0.28;
const LOWER = 0.26;
const out = createIKResult();
const root = new Vector3(0.18, 1.45, 0);
const pole = new Vector3(-0.3, -0.2, -1).normalize();

// ── Bone lengths must be preserved exactly, at every reachable target ──────
let maxUpperErr = 0;
let maxLowerErr = 0;
let maxTargetErr = 0;
let anyNaN = false;

for (let i = 0; i < 4000; i++) {
  // Deterministic sweep over a box around the shoulder, including targets
  // well inside and well outside reach.
  const a = i * 0.61803398875;
  const target = new Vector3(
    root.x + Math.sin(a * 2.3) * 0.75,
    root.y + Math.sin(a * 1.7) * 0.75,
    root.z + Math.cos(a * 3.1) * 0.75,
  );

  solveTwoBoneIK(root, target, UPPER, LOWER, pole, out);

  if (
    !Number.isFinite(out.elbow.x + out.elbow.y + out.elbow.z) ||
    !Number.isFinite(out.effector.x + out.effector.y + out.effector.z)
  ) {
    anyNaN = true;
    break;
  }

  maxUpperErr = Math.max(maxUpperErr, Math.abs(out.elbow.distanceTo(root) - UPPER));
  maxLowerErr = Math.max(
    maxLowerErr,
    Math.abs(out.effector.distanceTo(out.elbow) - LOWER),
  );

  // Only targets inside the reachable annulus are expected to be hit exactly.
  if (!out.clampedToReach) {
    maxTargetErr = Math.max(maxTargetErr, out.effector.distanceTo(target));
  }
}

check('no NaN across 4000 targets', !anyNaN);
check('upper bone length preserved', maxUpperErr < 1e-6, `err=${maxUpperErr.toExponential(2)}`);
check('lower bone length preserved', maxLowerErr < 1e-6, `err=${maxLowerErr.toExponential(2)}`);
check('reachable targets are hit exactly', maxTargetErr < 1e-9, `err=${maxTargetErr.toExponential(2)}`);

// ── Overextension behaves ─────────────────────────────────────────────────
const far = new Vector3(root.x + 5, root.y, root.z);
solveTwoBoneIK(root, far, UPPER, LOWER, pole, out);
check('far target flags overextended', out.overextended === true);
// The solver deliberately stops a hair short of full extension (reach - 1e-5)
// to keep the law-of-cosines argument inside acos's domain, so the tolerance
// here is that epsilon rather than float noise.
check(
  'overextended arm is straight and at full reach',
  Math.abs(out.effector.distanceTo(root) - (UPPER + LOWER)) < 2e-5,
  `reach=${out.effector.distanceTo(root).toFixed(6)}`,
);

// ── Degenerate inputs must not produce NaN ────────────────────────────────
const degenerates = [
  ['target on the shoulder', root.clone()],
  ['target 1e-9 away', root.clone().add(new Vector3(1e-9, 0, 0))],
  ['target closer than |upper-lower|', root.clone().add(new Vector3(0.001, 0, 0))],
];
let degenerateOk = true;
for (const [, target] of degenerates) {
  solveTwoBoneIK(root, target, UPPER, LOWER, pole, out);
  if (!Number.isFinite(out.elbow.x + out.elbow.y + out.elbow.z)) degenerateOk = false;
  if (Math.abs(out.elbow.distanceTo(root) - UPPER) > 1e-6) degenerateOk = false;
}
check('degenerate targets stay finite with intact bones', degenerateOk);

// Pole parallel to the target direction is the classic IK singularity.
const dir = new Vector3(1, 0, 0);
solveTwoBoneIK(root, root.clone().add(dir.clone().multiplyScalar(0.3)), UPPER, LOWER, dir, out);
check(
  'pole parallel to target axis is handled',
  Number.isFinite(out.elbow.x + out.elbow.y + out.elbow.z) &&
    Math.abs(out.elbow.distanceTo(root) - UPPER) < 1e-6,
);

// Equal-length bones with a very close target: minReach is ~0, so this must
// not divide by zero.
solveTwoBoneIK(root, root.clone().add(new Vector3(0, -1e-7, 0)), 0.3, 0.3, pole, out);
check('equal bones, near-zero distance', Number.isFinite(out.elbow.y));

// ── Elbow stability: small target moves must not flip the elbow ───────────
const q = new Quaternion();
let maxJump = 0;
let prev = null;
for (let i = 0; i < 400; i++) {
  const a = (i / 400) * Math.PI * 2;
  const target = new Vector3(root.x + Math.cos(a) * 0.4, root.y + Math.sin(a) * 0.4, root.z - 0.1);
  solveTwoBoneIK(root, target, UPPER, LOWER, pole, out);
  if (prev) maxJump = Math.max(maxJump, out.elbow.distanceTo(prev));
  prev = out.elbow.clone();
}
check('elbow moves continuously (no inside-out flip)', maxJump < 0.05, `maxJump=${maxJump.toFixed(4)}`);

// ── boneQuaternion maps +Y onto the bone direction ────────────────────────
const from = new Vector3(0, 0, 0);
const to = new Vector3(0.3, -0.4, 0.2);
boneQuaternion(from, to, q);
const mapped = new Vector3(0, 1, 0).applyQuaternion(q);
check(
  'boneQuaternion rotates +Y onto the bone',
  mapped.distanceTo(to.clone().normalize()) < 1e-6,
);
boneQuaternion(from, from, q);
check('boneQuaternion on zero-length bone is identity', Math.abs(q.w - 1) < 1e-12);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
