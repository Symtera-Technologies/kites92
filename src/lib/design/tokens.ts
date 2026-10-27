/**
 * Shared design tokens.
 *
 * The WebGL layer cannot read Tailwind classes or CSS custom properties, so the
 * brand hues are mirrored here as plain hex strings. Keep this file and
 * `tailwind.config.ts` in sync — they describe the same palette for two consumers.
 */

export const palette = {
  basant: '#FFC928',
  festival: '#FF8A00',
  vibrant: '#FF3D85',
  royal: '#673AB7',
  sky: '#39BDF8',
  navy: '#101B35',
  cream: '#FFF9EF',
} as const;

/** Hues the kite fabric shader picks from, ordered for pleasing adjacency. */
export const kiteFabric = [
  palette.basant,
  palette.vibrant,
  palette.sky,
  palette.festival,
  palette.royal,
  '#2BD9A8',
  '#FF5F57',
  '#FFFFFF',
] as const;

/** Sky gradient stops keyed by time of day; drives the hero and the closing CTA. */
export const skyStops = {
  noon: { top: '#1E8BD6', mid: '#6FCBF7', bottom: '#DCF2FF', sun: '#FFF4D6' },
  afternoon: { top: '#2A86C9', mid: '#7FC9F0', bottom: '#FFE9B8', sun: '#FFD98A' },
  sunset: { top: '#3B2B6B', mid: '#FF7A4D', bottom: '#FFC928', sun: '#FFB347' },
} as const;

export type SkyPreset = keyof typeof skyStops;

/** Easing curves reused by GSAP timelines and CSS transitions alike. */
export const easing = {
  /** Decelerating; default for reveals. */
  out: [0.22, 1, 0.36, 1] as const,
  /** Gentle both ways; camera moves. */
  inOut: [0.76, 0, 0.24, 1] as const,
  cssOut: 'cubic-bezier(0.22,1,0.36,1)',
  cssInOut: 'cubic-bezier(0.76,0,0.24,1)',
} as const;

/**
 * Quality tiers. Resolved once at runtime from device capability and the user's
 * reduced-motion preference, then read by every 3D scene so one decision
 * governs the whole world. See `src/lib/three/quality.ts`.
 */
export const qualityTiers = {
  high:   { backgroundKites: 36, shadows: true,  dpr: [1, 2]    as [number, number], segments: 24, particles: 220 },
  medium: { backgroundKites: 18, shadows: true,  dpr: [1, 1.5]  as [number, number], segments: 16, particles: 110 },
  low:    { backgroundKites: 8,  shadows: false, dpr: [0.75, 1] as [number, number], segments: 10, particles: 0 },
} as const;

export type QualityTier = keyof typeof qualityTiers;
