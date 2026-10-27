import { qualityTiers, type QualityTier } from '@/lib/design/tokens';

export type { QualityTier };
export { qualityTiers };

export interface QualityState {
  tier: QualityTier;
  settings: (typeof qualityTiers)[QualityTier];
  /** True when the OS asks for reduced motion, or WebGL is unavailable. */
  reducedMotion: boolean;
  webgl: boolean;
  /** False until detection has run on the client. */
  resolved: boolean;
}

/**
 * Conservative pre-detection default.
 *
 * Server render and first client render must agree, so both start at `medium`
 * with motion disabled. Detection then upgrades on the client. Starting low
 * and upgrading avoids both a hydration mismatch and a janky first frame on
 * weak devices.
 */
export const defaultQuality: QualityState = {
  tier: 'medium',
  settings: qualityTiers.medium,
  reducedMotion: true,
  webgl: true,
  resolved: false,
};

/**
 * Probe for a usable WebGL context.
 *
 * Creates a throwaway canvas and explicitly loses the context afterwards —
 * browsers cap simultaneous contexts (often ~16) and a leaked probe context
 * can starve the real scene later in the page.
 */
export function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Classify the device into a render tier.
 *
 * There is no reliable GPU-strength API on the web, so this scores the signals
 * that are available: core count, advertised memory, coarse pointer and
 * viewport width. It is intentionally pessimistic about phones — a mid-range
 * Android is the realistic target for a Pakistani kite shop at Basant, and
 * dropping to `low` there costs some background kites but protects frame rate.
 */
export function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium';

  const cores = navigator.hardwareConcurrency ?? 4;
  // Chromium-only; absent elsewhere, so it can only add confidence.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const narrow = window.innerWidth < 768;
  const isHandheld = coarsePointer && narrow;

  if (isHandheld) {
    // Even a capable phone stays at `medium`: thermal throttling on a long
    // scroll hurts more than the extra kites help.
    return cores >= 6 && (memory ?? 4) >= 4 ? 'medium' : 'low';
  }

  if (cores <= 2 || (memory != null && memory <= 2)) return 'low';
  if (cores >= 8 && (memory ?? 8) >= 8) return 'high';
  return 'medium';
}

/** Resolve the full quality state. Client-only; call from an effect. */
export function resolveQuality(): QualityState {
  const webgl = detectWebGL();
  const reduced = prefersReducedMotion();
  const tier = webgl ? detectTier() : 'low';
  return {
    tier,
    settings: qualityTiers[tier],
    reducedMotion: reduced || !webgl,
    webgl,
    resolved: true,
  };
}
