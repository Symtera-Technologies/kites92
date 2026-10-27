import { cn } from '@/lib/utils';

interface KiteMotifProps {
  /** Upper sail colour. Comes from the variant's real swatch. */
  topColor?: string;
  bottomColor?: string;
  className?: string;
  /** Rendered into the SVG title for assistive tech. */
  label?: string;
}

/**
 * A kite drawn as SVG, used wherever a product has no photograph yet.
 *
 * This is deliberately a *motif*, not a fake photo. Inventing product imagery
 * would misrepresent what a customer receives, so this shows the product's
 * actual colour swatch in the shape of a kite and reads unmistakably as an
 * illustration. Replace it by uploading real photography in the admin.
 */
export function KiteMotif({
  topColor = '#FFC928',
  bottomColor = '#FF3D85',
  className,
  label,
}: KiteMotifProps) {
  const gradientId = `kite-sheen-${topColor.replace('#', '')}-${bottomColor.replace('#', '')}`;

  return (
    <svg
      viewBox="0 0 160 200"
      className={cn('h-full w-full', className)}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {label && <title>{label}</title>}

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Tail, drawn first so the sail overlaps its knot. */}
      <path
        d="M80 150 C 72 164, 92 174, 82 188 C 76 196, 86 200, 84 200"
        fill="none"
        stroke={bottomColor}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Upper sail: apex down to the cross-spar. */}
      <path d="M80 12 L142 72 L80 72 Z" fill={topColor} />
      <path d="M80 12 L18 72 L80 72 Z" fill={topColor} opacity="0.86" />

      {/* Lower sail: cross-spar down to the long point. */}
      <path d="M18 72 L80 150 L80 72 Z" fill={bottomColor} opacity="0.92" />
      <path d="M142 72 L80 150 L80 72 Z" fill={bottomColor} />

      {/* Spars */}
      <path d="M80 12 L80 150" stroke="#6B4A2A" strokeWidth="2.2" opacity="0.5" />
      <path d="M18 72 L142 72" stroke="#6B4A2A" strokeWidth="2.2" opacity="0.5" />

      {/* Paper sheen across the top-left, so it reads as a lit surface. */}
      <path d="M80 12 L142 72 L80 150 L18 72 Z" fill={`url(#${gradientId})`} />

      {/* Flying line */}
      <path
        d="M80 72 C 56 96, 40 128, 26 168"
        fill="none"
        stroke="#101B35"
        strokeWidth="1.2"
        opacity="0.3"
      />
    </svg>
  );
}
