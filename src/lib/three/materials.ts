import { Color, DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace } from 'three';

/**
 * Two-tone sail textures.
 *
 * Real guddas are built from sheets of coloured paper pasted into blocks, not
 * printed gradients, so the sail wants a hard colour split across the spine
 * rather than a blend.
 *
 * This is a 2x2 texture read through the sail's existing UVs. The alternative,
 * patching the standard material's shader with `onBeforeCompile`, breaks
 * whenever three's shader chunks are reorganised; a texture is boring,
 * version-proof, and costs 16 bytes.
 *
 * `NearestFilter` keeps the boundary crisp — linear filtering would smear the
 * split into a muddy gradient at glancing angles.
 */

const cache = new Map<string, DataTexture>();

/**
 * Build (or reuse) a sail texture.
 *
 * @param top    Colour of the upper sail, above the cross-spar.
 * @param bottom Colour of the lower sail.
 */
export function getSailTexture(top: string, bottom: string): DataTexture {
  const key = `${top}|${bottom}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // Raw sRGB bytes. The texture declares SRGBColorSpace below, so three
  // converts to linear when sampling — converting here as well would apply
  // the transform twice and visibly wash the colours out.
  const a = new Color(top);
  const b = new Color(bottom);

  // Rows are bottom-up in texture space, so row 0 is the lower sail.
  const data = new Uint8Array(16);
  const write = (offset: number, c: Color) => {
    data[offset] = Math.round(c.r * 255);
    data[offset + 1] = Math.round(c.g * 255);
    data[offset + 2] = Math.round(c.b * 255);
    data[offset + 3] = 255;
  };
  write(0, b);
  write(4, b);
  write(8, a);
  write(12, a);

  const texture = new DataTexture(data, 2, 2, RGBAFormat);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  cache.set(key, texture);
  return texture;
}

/** Release every cached texture. For hot-reload and teardown only. */
export function disposeSailTextures() {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
