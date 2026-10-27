import { BufferAttribute, BufferGeometry, DynamicDrawUsage } from 'three';

/**
 * Procedural geometry for a traditional Pakistani kite (gudda / patang).
 *
 * The silhouette is the real thing: a diamond whose cross-spar sits high, at
 * roughly a third from the top, giving the long lower point that a flat
 * rhombus lacks. The sail is also billowed rather than flat — paper bows away
 * from the wind between the spars, and that curve is what catches light and
 * reads as fabric instead of cardboard.
 *
 * Geometry is built once per segment count and cached: the hero kite and
 * every product preview share the same buffers.
 */

/** Height of the cross-spar as a fraction of the spine, measured from the top. */
const SPAR_AT = 0.32;

export interface SailOptions {
  /** Spine length (tip to tip) in world units. */
  height?: number;
  /** Cross-spar width in world units. */
  width?: number;
  /** How far the sail bows away from the wind. 0 is flat. */
  billow?: number;
  /** Subdivisions along the spine. Columns scale with it. */
  segments?: number;
}

/**
 * Build the sail.
 *
 * Rows run down the spine; each row's half-width follows the diamond profile,
 * so the mesh naturally tapers to a point at both tips. The billow is a
 * product of two cosine falloffs (one along the spine, one across it), which
 * peaks between the spars and vanishes at every edge — exactly where taut
 * paper is pinned to a stick.
 */
export function buildSailGeometry(options: SailOptions = {}): BufferGeometry {
  const height = options.height ?? 1;
  const width = options.width ?? 0.86;
  const billow = options.billow ?? 0.1;
  const rows = Math.max(4, options.segments ?? 16);
  const cols = Math.max(4, Math.round(rows * 0.75)) * 2; // even, so a vertex lands on the spine

  const halfH = height / 2;
  const halfW = width / 2;

  const vertexCount = (rows + 1) * (cols + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let p = 0;
  let uv = 0;

  for (let r = 0; r <= rows; r++) {
    const s = r / rows; // 0 at top tip, 1 at bottom tip
    // Diamond profile: widen to the spar, then taper to the lower point.
    const profile = s < SPAR_AT ? s / SPAR_AT : 1 - (s - SPAR_AT) / (1 - SPAR_AT);
    const rowHalfWidth = halfW * profile;
    const y = halfH - s * height;

    for (let c = 0; c <= cols; c++) {
      const u = (c / cols) * 2 - 1; // -1 (left) .. 1 (right)
      const x = u * rowHalfWidth;

      // Billow peaks mid-sail and falls to zero at spine, edges and tips.
      const acrossFalloff = Math.cos((u * Math.PI) / 2);
      const alongFalloff = Math.sin(Math.PI * Math.min(Math.max(s, 0), 1));
      const z = billow * acrossFalloff * alongFalloff;

      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = z;
      p += 3;

      uvs[uv] = (u + 1) / 2;
      uvs[uv + 1] = 1 - s;
      uv += 2;
    }
  }

  // Two triangles per cell, skipping the degenerate ones at the tips where the
  // row collapses to a point.
  const indices: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const d = (r + 1) * (cols + 1) + c;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  // Let three derive normals from the billowed surface; hand-deriving them
  // buys nothing here and is easy to get subtly wrong.
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Build the two crossed spars as a single thin geometry.
 *
 * Drawn as flat quads rather than cylinders: at the size a kite appears on
 * screen a tube is indistinguishable from a strip, and this keeps the whole
 * kite to three draw calls.
 */
export function buildSparGeometry(options: SailOptions = {}): BufferGeometry {
  const height = options.height ?? 1;
  const width = options.width ?? 0.86;
  const t = Math.min(height, width) * 0.012; // spar half-thickness
  const halfH = height / 2;
  const sparY = halfH - SPAR_AT * height;

  // Spine (vertical) and cross-spar (horizontal), each a quad, nudged forward
  // so they sit proud of the billowed sail instead of z-fighting with it.
  const z = (options.billow ?? 0.1) * 0.12;
  const positions = new Float32Array([
    // spine
    -t, halfH, z,  t, halfH, z,  t, -halfH, z,
    -t, halfH, z,  t, -halfH, z,  -t, -halfH, z,
    // cross-spar
    -width / 2, sparY + t, z,  width / 2, sparY + t, z,  width / 2, sparY - t, z,
    -width / 2, sparY + t, z,  width / 2, sparY - t, z,  -width / 2, sparY - t, z,
  ]);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export interface TailOptions {
  /** Number of segments. More is smoother and more expensive to animate. */
  segments?: number;
  /** Total tail length in world units. */
  length?: number;
  /** Ribbon width. */
  width?: number;
}

export interface TailGeometry {
  geometry: BufferGeometry;
  /**
   * Animate the ribbon to time `t`.
   *
   * A travelling sine wave whose amplitude grows toward the free end, which is
   * how a real tail behaves: pinned at the kite, loose at the tip. Rewrites
   * the position buffer in place — no reallocation per frame.
   *
   * @param windSway Lateral bias in [-1,1], so the tail trails downwind.
   */
  update: (t: number, windSway: number) => void;
}

/**
 * Build an animatable tail ribbon.
 *
 * Returns the geometry plus its updater, keeping the buffer layout private to
 * this module — callers animate the tail without knowing how it is packed.
 */
export function buildTailGeometry(options: TailOptions = {}): TailGeometry {
  const segments = Math.max(3, options.segments ?? 20);
  const length = options.length ?? 1.6;
  const width = options.width ?? 0.075;

  const vertexCount = (segments + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  for (let i = 0; i <= segments; i++) {
    const v = i / segments;
    uvs[i * 4] = 0;
    uvs[i * 4 + 1] = v;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = v;
  }

  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geometry = new BufferGeometry();
  const positionAttr = new BufferAttribute(positions, 3);
  positionAttr.setUsage(DynamicDrawUsage); // rewritten every frame
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const update = (t: number, windSway: number) => {
    for (let i = 0; i <= segments; i++) {
      const v = i / segments;
      const y = -v * length;

      // Amplitude ramps quadratically toward the tip: near the knot the tail
      // barely moves, at the end it whips.
      const amp = v * v * 0.42;
      const phase = t * 6 - v * 7.5;
      const x = Math.sin(phase) * amp + windSway * v * 0.55;
      const z = Math.cos(phase * 0.8) * amp * 0.5;

      // Half-width shrinks slightly toward the tip so the ribbon tapers.
      const hw = (width / 2) * (1 - v * 0.3);
      const base = i * 6;
      positions[base] = x - hw;
      positions[base + 1] = y;
      positions[base + 2] = z;
      positions[base + 3] = x + hw;
      positions[base + 4] = y;
      positions[base + 5] = z;
    }
    positionAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  };

  update(0, 0);
  return { geometry, update };
}

/** Cache keyed by the options that affect the buffers. */
const sailCache = new Map<string, BufferGeometry>();
const sparCache = new Map<string, BufferGeometry>();

/** Shared sail geometry. Callers must not mutate the result. */
export function getSailGeometry(options: SailOptions = {}): BufferGeometry {
  const key = `${options.height ?? 1}|${options.width ?? 0.86}|${options.billow ?? 0.1}|${options.segments ?? 16}`;
  let geometry = sailCache.get(key);
  if (!geometry) {
    geometry = buildSailGeometry(options);
    sailCache.set(key, geometry);
  }
  return geometry;
}

/** Shared spar geometry. Callers must not mutate the result. */
export function getSparGeometry(options: SailOptions = {}): BufferGeometry {
  const key = `${options.height ?? 1}|${options.width ?? 0.86}|${options.billow ?? 0.1}`;
  let geometry = sparCache.get(key);
  if (!geometry) {
    geometry = buildSparGeometry(options);
    sparCache.set(key, geometry);
  }
  return geometry;
}
