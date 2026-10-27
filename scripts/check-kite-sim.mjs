// Numerical acceptance checks for the kite simulation (npm run test:sim).
//
// This exists because the flight model is the one piece of this codebase whose
// bugs are invisible in code review: a left-handed basis or an energy-injecting
// lift term still *looks* like plausible vector maths. Both of those shipped
// here once and were caught only by these assertions.
import { Vector3, Quaternion } from 'three';
import {
  TetheredKite,
  createDriftingFlock,
  defaultWind,
  windAt,
} from '../src/lib/three/kiteFlight.ts';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
};

// ── Hero kite: 60s at 60fps ────────────────────────────────────────────────
const kite = new TetheredKite({ stringLength: 15, floorY: 2.2 });
kite.anchor.set(0, 1.35, 0);

let maxDist = 0;
let minY = Infinity;
let maxY = -Infinity;
let nan = false;
let maxSpeed = 0;
let maxQuatErr = 0;

for (let i = 0; i < 3600; i++) {
  const t = i / 60;
  // Exercise steering across its full range, including the extremes.
  kite.setSteer(Math.sin(t * 0.5), Math.cos(t * 0.33));
  kite.step(1 / 60, t);

  const d = kite.position.distanceTo(kite.anchor);
  maxDist = Math.max(maxDist, d);
  minY = Math.min(minY, kite.position.y);
  maxY = Math.max(maxY, kite.position.y);
  maxSpeed = Math.max(maxSpeed, kite.velocity.length());
  maxQuatErr = Math.max(maxQuatErr, Math.abs(kite.quaternion.length() - 1));

  if (
    !Number.isFinite(kite.position.x + kite.position.y + kite.position.z) ||
    !Number.isFinite(kite.velocity.length()) ||
    !Number.isFinite(kite.tension)
  ) {
    nan = true;
    break;
  }
}

check('hero: no NaN/Infinity over 60s', !nan);
check(
  'hero: string is inextensible (dist <= 15 + 1e-6)',
  maxDist <= 15 + 1e-6,
  `maxDist=${maxDist.toFixed(6)}`,
);
check('hero: never sinks below floor 2.2', minY >= 2.2 - 1e-9, `minY=${minY.toFixed(3)}`);
check('hero: actually climbs and flies', maxY > 8, `maxY=${maxY.toFixed(2)}`);
check('hero: velocity stays bounded (no blow-up)', maxSpeed < 40, `maxSpeed=${maxSpeed.toFixed(2)}`);
check('hero: quaternion stays unit-length', maxQuatErr < 1e-5, `err=${maxQuatErr.toExponential(2)}`);
check('hero: taut in [0,1]', kite.taut >= 0 && kite.taut <= 1, `taut=${kite.taut.toFixed(3)}`);

// ── Stability under pathological timesteps (tab backgrounding) ─────────────
const rough = new TetheredKite({ stringLength: 12 });
rough.anchor.set(0, 1.35, 0);
let roughOk = true;
for (let i = 0; i < 600; i++) {
  // 2-second stalls, zero dt, and negative dt all arrive in the wild.
  const dt = [1 / 60, 2.0, 0, -0.1, 0.4][i % 5];
  rough.step(dt, i * 0.1);
  const d = rough.position.distanceTo(rough.anchor);
  if (!Number.isFinite(d) || d > 12 + 1e-6) {
    roughOk = false;
    break;
  }
}
check('hero: survives huge/zero/negative dt', roughOk);

// ── Wind field ─────────────────────────────────────────────────────────────
const w = new Vector3();
windAt(w, defaultWind, 2, 0);
const lowSpeed = w.length();
windAt(w, defaultWind, 30, 0);
const highSpeed = w.length();
check('wind: boundary layer — faster aloft than at rooftop', highSpeed > lowSpeed,
  `${lowSpeed.toFixed(2)} -> ${highSpeed.toFixed(2)} m/s`);

// ── Background flock: determinism + statelessness ──────────────────────────
const flockA = createDriftingFlock(24, 1337);
const flockB = createDriftingFlock(24, 1337);
const pA = new Vector3(), pB = new Vector3();
const qA = new Quaternion(), qB = new Quaternion();

flockA[7].sample(12.5, pA, qA);
flockB[7].sample(12.5, pB, qB);
check('flock: same seed gives identical layout', pA.distanceTo(pB) < 1e-12);

// Sampling out of order must match sampling in order (true statelessness).
flockA[3].sample(99.0, pA, qA);
flockA[3].sample(4.0, pB, qB);
flockA[3].sample(99.0, pB, qB);
check('flock: stateless — out-of-order sampling matches', pA.distanceTo(pB) < 1e-12);

let flockFinite = true;
let qErr = 0;
for (const k of flockA) {
  for (let t = 0; t < 40; t += 0.37) {
    k.sample(t, pA, qA);
    qErr = Math.max(qErr, Math.abs(qA.length() - 1));
    if (!Number.isFinite(pA.x + pA.y + pA.z)) flockFinite = false;
  }
}
check('flock: all positions finite', flockFinite);
check('flock: quaternions unit-length', qErr < 1e-5, `err=${qErr.toExponential(2)}`);

const depths = flockA.map((k) => k.spec.center.z);
check('flock: layered depth bands for parallax',
  Math.max(...depths) - Math.min(...depths) > 40,
  `z range ${Math.min(...depths).toFixed(0)}..${Math.max(...depths).toFixed(0)}`);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
