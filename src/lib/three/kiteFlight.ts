import { Matrix4, Quaternion, Vector3 } from 'three';

/**
 * Kite flight simulation.
 *
 * Two deliberately different models, because they have different jobs:
 *
 *  - `TetheredKite` is the hero kite. It is a real force integrator with an
 *    inextensible-string constraint, so the line visibly goes taut, the kite
 *    arcs around the flyer's hand, and steering actually changes the path.
 *    One instance per scene.
 *
 *  - `DriftingKite` is background scenery. It evaluates a closed-form path at
 *    time t with no state and no integration, so dozens cost almost nothing
 *    and they can be paused or resumed freely when a scene leaves the viewport.
 *
 * Simulating all of them properly would be the obvious mistake: it buys detail
 * nobody can see at distance and spends the frame budget that makes the hero
 * kite feel good.
 *
 * Units are metres and seconds. The flyer stands near the origin; the kite
 * flies roughly 8-20m out.
 */

/** Deterministic PRNG. Art direction should be repeatable, not random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Layered-sine pseudo-noise in [-1, 1].
 *
 * Cheaper than simplex noise and, for wind gusting, indistinguishable: what
 * sells wind is several periods beating against each other, not spectral
 * correctness. Three octaves at non-harmonic ratios avoid a perceptible loop.
 */
export function gustNoise(t: number, seed = 0): number {
  return (
    Math.sin(t * 0.37 + seed) * 0.6 +
    Math.sin(t * 0.91 + seed * 1.7) * 0.28 +
    Math.sin(t * 2.31 + seed * 0.43) * 0.12
  );
}

export interface WindParams {
  /** Horizontal direction; normalise before use. */
  direction: Vector3;
  /** Mean speed in m/s. Good Basant flying weather is roughly 4-8. */
  baseSpeed: number;
  /** How far gusts swing the speed, as a fraction of baseSpeed. */
  gustiness: number;
  seed: number;
}

export const defaultWind: WindParams = {
  direction: new Vector3(1, 0.12, -0.35).normalize(),
  baseSpeed: 6,
  gustiness: 0.35,
  seed: 11,
};

/**
 * Wind velocity at a height and time, written into `out`.
 *
 * Includes a crude boundary layer: air near the rooftops is slower and more
 * turbulent than air aloft, which is why a kite steadies as it climbs.
 */
export function windAt(
  out: Vector3,
  params: WindParams,
  height: number,
  t: number,
): Vector3 {
  const shear = 0.65 + 0.35 * Math.min(Math.max(height / 18, 0), 1);
  const speed =
    params.baseSpeed * shear * (1 + params.gustiness * gustNoise(t, params.seed));

  out.copy(params.direction).multiplyScalar(speed);
  // Cross-gusts: without lateral variation the kite tracks a dull straight line.
  out.x += gustNoise(t * 0.8, params.seed + 3) * params.baseSpeed * 0.18;
  out.y += gustNoise(t * 1.3, params.seed + 7) * params.baseSpeed * 0.1;
  out.z += gustNoise(t * 0.6, params.seed + 13) * params.baseSpeed * 0.22;
  return out;
}

export interface TetheredKiteOptions {
  /** String length in metres. Also the hard radius of the flight sphere. */
  stringLength?: number;
  /** Kite mass in kg. A paper gudda is very light. */
  mass?: number;
  /** Lift coefficient: how eagerly the sail turns airflow into climb. */
  lift?: number;
  /** Aerodynamic drag against relative airflow. */
  drag?: number;
  /** Rooftop height the kite may never sink below. */
  floorY?: number;
  seed?: number;
}

/**
 * The hero kite: a point mass on an inextensible line.
 *
 * Integration is semi-implicit Euler with a clamped timestep, then the string
 * is enforced as a position constraint (position-based dynamics) rather than a
 * stiff spring. A spring stiff enough to look inextensible would need a
 * timestep far below one browser frame and would explode whenever a frame was
 * dropped; the constraint is unconditionally stable instead.
 */
export class TetheredKite {
  readonly position = new Vector3(6, 11, -4);
  readonly velocity = new Vector3();
  readonly quaternion = new Quaternion();

  /** Where the flyer's hand holds the line. Update before each `step`. */
  readonly anchor = new Vector3(0, 1.3, 0);

  /** Line tension in newtons; drives string sag and the hand pose. */
  tension = 0;
  /** 0 = slack, 1 = fully taut. Drives the character's pull animation. */
  taut = 0;
  /** Current bank angle in radians; the kite rolls into its turns. */
  bank = 0;

  readonly stringLength: number;
  private readonly mass: number;
  private readonly liftCoef: number;
  private readonly dragCoef: number;
  private readonly floorY: number;
  private readonly seed: number;

  private readonly steer = new Vector3();
  private readonly steerTarget = new Vector3();

  // Scratch vectors. Allocating inside the loop would make garbage collection
  // the dominant cost of the entire scene.
  private readonly _wind = new Vector3();
  private readonly _rel = new Vector3();
  private readonly _force = new Vector3();
  private readonly _radial = new Vector3();
  private readonly _liftDir = new Vector3();
  private readonly _spine = new Vector3();
  private readonly _normal = new Vector3();
  private readonly _side = new Vector3();
  private readonly _basis = new Matrix4();
  private readonly _roll = new Quaternion();

  constructor(options: TetheredKiteOptions = {}) {
    this.stringLength = options.stringLength ?? 15;
    this.mass = options.mass ?? 0.09;
    this.liftCoef = options.lift ?? 0.07;
    this.dragCoef = options.drag ?? 0.022;
    this.floorY = options.floorY ?? 2.2;
    this.seed = options.seed ?? 5;

    // Start on the flight sphere so frame one does not snap.
    this.position
      .sub(this.anchor)
      .setLength(this.stringLength * 0.92)
      .add(this.anchor);
  }

  /**
   * Nudge the kite with pointer or touch input, each component in [-1, 1].
   *
   * The input biases aerodynamic force rather than setting position, so the
   * kite still obeys wind and tether. It stays believable under the cursor
   * instead of becoming a dragged sprite.
   */
  setSteer(x: number, y: number) {
    this.steerTarget.set(
      Math.min(Math.max(x, -1), 1),
      Math.min(Math.max(y, -1), 1),
      0,
    );
  }

  /**
   * Advance the simulation.
   *
   * @param dt   Seconds since the previous frame.
   * @param t    Absolute scene time, so every kite shares one wind field.
   * @param wind Shared wind parameters.
   */
  step(dt: number, t: number, wind: WindParams = defaultWind) {
    // A backgrounded tab resumes with a huge dt. Clamp to ~3 frames at 60Hz:
    // the kite lags for an instant instead of being flung off the string.
    const h = Math.min(Math.max(dt, 1 / 240), 0.05);

    this.steer.lerp(this.steerTarget, 1 - Math.pow(0.001, h));

    windAt(this._wind, wind, this.position.y, t);

    // Airflow the kite actually feels.
    this._rel.copy(this._wind).sub(this.velocity);
    const relSpeed = this._rel.length();

    this._force.set(0, 0, 0);

    if (relSpeed > 1e-4) {
      // Clamp the airspeed that feeds the quadratic terms. A rare gust spike
      // squared is enough to launch the kite, and the visual difference above
      // this ceiling is nil.
      const q = Math.min(relSpeed, wind.baseSpeed * 3);

      // Drag, along relative airflow. Self-limiting: it vanishes as the kite
      // approaches wind speed, so it can never add energy indefinitely.
      this._force.addScaledVector(this._rel, (this.dragCoef * q * q) / relSpeed);

      // Lift, strictly perpendicular to the airflow.
      //
      // This perpendicularity is not a detail — it is what makes the model
      // stable. Lift does no work along the airflow, so it cannot feed the
      // runaway loop (faster kite -> more airspeed -> more forward force)
      // that an upward-biased approximation produces. The tether then turns
      // this perpendicular force into the arcing sweep that reads as flight.
      // Unit airflow direction.
      const fx = this._rel.x / relSpeed;
      const fy = this._rel.y / relSpeed;
      const fz = this._rel.z / relSpeed;

      // The part of world-up that is perpendicular to the airflow:
      //   up - flow * (up . flow),  where (up . flow) == fy.
      this._liftDir.set(-fx * fy, 1 - fy * fy, -fz * fy);

      if (this._liftDir.lengthSq() > 1e-6) {
        this._liftDir.normalize();
        this._force.addScaledVector(this._liftDir, this.liftCoef * q * q);
      }
    }

    this._force.y -= 9.81 * this.mass;

    // Steering authority scales with airspeed, so a slack kite in still air
    // cannot be flown by the cursor.
    const authority = Math.min(relSpeed / wind.baseSpeed, 1.5) * this.mass * 7;
    this._force.x += this.steer.x * authority;
    this._force.y += this.steer.y * authority * 0.8;

    // Idle wander, so a kite nobody is touching never looks frozen.
    this._force.x += gustNoise(t * 1.1, this.seed) * this.mass * 1.2;
    this._force.z += gustNoise(t * 0.9, this.seed + 21) * this.mass * 1.2;

    this.velocity.addScaledVector(this._force, h / this.mass);
    // Light global damping stops the integrator accumulating energy.
    this.velocity.multiplyScalar(1 - 0.9 * h);
    this.position.addScaledVector(this.velocity, h);

    this.applyStringConstraint(h);

    if (this.position.y < this.floorY) {
      this.position.y = this.floorY;
      if (this.velocity.y < 0) this.velocity.y *= -0.25;
    }

    this.updateOrientation(h);
  }

  /**
   * Enforce |position - anchor| <= stringLength.
   *
   * On violation the kite is projected back onto the sphere and the outward
   * radial component of its velocity is removed: an inextensible line can pull
   * inward but never push, and does no work along its own length.
   */
  private applyStringConstraint(h: number) {
    this._radial.copy(this.position).sub(this.anchor);
    const dist = this._radial.length();
    if (dist <= 1e-5) {
      this.tension = 0;
      this.taut = 0;
      return;
    }

    this._radial.divideScalar(dist); // unit outward normal

    if (dist > this.stringLength) {
      const overshoot = dist - this.stringLength;
      this.position.copy(this.anchor).addScaledVector(this._radial, this.stringLength);

      const outward = this.velocity.dot(this._radial);
      if (outward > 0) this.velocity.addScaledVector(this._radial, -outward);

      // Impulse implied by the correction, surfaced as a readable force.
      this.tension = (overshoot / Math.max(h, 1e-4)) * this.mass * 12;
    } else {
      this.tension *= 0.86; // decay so the hand pose relaxes smoothly
    }

    this.taut = Math.min(Math.max(dist / this.stringLength, 0), 1);
  }

  /**
   * Build the kite's orientation.
   *
   * A flying kite aligns its spine with the line and presents its belly to the
   * wind, so the basis is constructed from those two directions rather than
   * from a lookAt, then rolled by lateral velocity to bank into turns.
   */
  private updateOrientation(h: number) {
    this._spine.copy(this.position).sub(this.anchor);
    if (this._spine.lengthSq() < 1e-6) return;
    this._spine.normalize(); // kite local +Y, nose away from the flyer

    this._normal.copy(this._wind).negate(); // belly into the wind
    if (this._normal.lengthSq() < 1e-6) this._normal.set(0, 0, 1);
    this._normal.normalize();

    // Gram-Schmidt against the spine.
    this._normal.addScaledVector(this._spine, -this._normal.dot(this._spine));
    if (this._normal.lengthSq() < 1e-4) {
      // Wind runs parallel to the line; pick any stable perpendicular.
      this._normal.set(0, 0, 1).addScaledVector(this._spine, -this._spine.z);
      if (this._normal.lengthSq() < 1e-4) this._normal.set(1, 0, 0);
    }
    this._normal.normalize();

    // makeBasis(x, y, z) is a rotation only if x cross y == z. With the spine
    // as +Y and the sail normal as +Z, that forces side = spine x normal. The
    // other order yields a left-handed basis (det = -1), and
    // setFromRotationMatrix then returns a non-unit, unusable quaternion.
    this._side.crossVectors(this._spine, this._normal).normalize();
    this._basis.makeBasis(this._side, this._spine, this._normal);

    const targetBank = Math.min(
      Math.max(this.velocity.dot(this._side) * 0.16, -0.7),
      0.7,
    );
    this.bank += (targetBank - this.bank) * (1 - Math.pow(0.004, h));

    this._roll.setFromAxisAngle(this._spine, this.bank);
    this.quaternion.setFromRotationMatrix(this._basis).premultiply(this._roll);
  }
}

export interface DriftingKiteSpec {
  /** Centre of the drift path. */
  center: Vector3;
  /** Path half-extents on each axis. */
  radius: Vector3;
  /** Path period in seconds. */
  period: number;
  phase: number;
  /** World scale; distant kites are smaller. */
  scale: number;
  /** Index into the fabric palette. */
  colorIndex: number;
  seed: number;
}

/**
 * A background kite. Stateless: `sample` is a pure function of time, so these
 * can be paused, skipped, or evaluated out of order with no drift.
 */
export class DriftingKite {
  readonly spec: DriftingKiteSpec;

  // Written out rather than a TS parameter property so the module still runs
  // under plain type-stripping (Node's --experimental-strip-types, esbuild
  // transform-only), which rejects that syntax.
  constructor(spec: DriftingKiteSpec) {
    this.spec = spec;
  }

  /**
   * Position and orientation at time t.
   *
   * The path is a Lissajous figure at a 2:3 frequency ratio, which traces the
   * lazy figure-eight a real kite carves on a steady breeze without repeating
   * tightly enough for the eye to catch the loop.
   */
  sample(t: number, outPos: Vector3, outQuat: Quaternion): void {
    const { center, radius, period, phase, seed } = this.spec;
    const w = (Math.PI * 2) / period;
    const a = t * w + phase;

    outPos.set(
      center.x + Math.sin(a * 2) * radius.x,
      center.y + Math.sin(a * 3 + 1.1) * radius.y + gustNoise(t * 0.5, seed) * 0.4,
      center.z + Math.cos(a) * radius.z,
    );

    // Orientation from the analytic tangent — no finite differencing, so it
    // stays correct even when frames are skipped.
    const tangent = _tmpTangent
      .set(
        Math.cos(a * 2) * radius.x * 2,
        Math.cos(a * 3 + 1.1) * radius.y * 3,
        -Math.sin(a) * radius.z,
      )
      .normalize();

    _tmpSide.crossVectors(_worldUp, tangent);
    if (_tmpSide.lengthSq() < 1e-5) _tmpSide.set(1, 0, 0);
    _tmpSide.normalize();
    // Right-handed, for the same reason as the hero basis above.
    _tmpNormal.crossVectors(_tmpSide, tangent).normalize();
    _tmpBasis.makeBasis(_tmpSide, tangent, _tmpNormal);
    outQuat.setFromRotationMatrix(_tmpBasis);
  }
}

const _tmpTangent = new Vector3();
const _tmpSide = new Vector3();
const _tmpNormal = new Vector3();
const _tmpBasis = new Matrix4();
const _worldUp = new Vector3(0, 1, 0);

/**
 * Lay out a flock of background kites across depth bands.
 *
 * Depth is assigned in bands rather than uniformly at random so the sky always
 * reads as foreground / midground / distance. Uniform scatter tends to clump,
 * which flattens the parallax that gives the scroll journey its sense of space.
 */
export function createDriftingFlock(count: number, seed = 1337): DriftingKite[] {
  const rand = mulberry32(seed);
  const kites: DriftingKite[] = [];

  for (let i = 0; i < count; i++) {
    const band = i % 3; // 0 near, 1 mid, 2 far
    const depth = -14 - band * 26 - rand() * 18;
    const scale =
      (band === 0 ? 0.85 : band === 1 ? 0.6 : 0.4) * (0.75 + rand() * 0.5);

    kites.push(
      new DriftingKite({
        center: new Vector3(
          (rand() - 0.5) * (34 + band * 30),
          9 + rand() * 20 + band * 3,
          depth,
        ),
        radius: new Vector3(2.2 + rand() * 4.5, 1.4 + rand() * 3, 1.6 + rand() * 3.4),
        period: 13 + rand() * 20,
        phase: rand() * Math.PI * 2,
        scale,
        colorIndex: Math.floor(rand() * 8),
        seed: Math.floor(rand() * 1000),
      }),
    );
  }

  return kites;
}
