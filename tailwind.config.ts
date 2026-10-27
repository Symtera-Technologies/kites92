import type { Config } from 'tailwindcss';

/**
 * Kites92 design system.
 * Brand hues live here as the single source of truth; `src/lib/design/tokens.ts`
 * re-exports the same hex values for the WebGL layer, which cannot read CSS.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        basant: {
          DEFAULT: '#FFC928',
          50: '#FFF8E0',
          100: '#FFEFB8',
          200: '#FFE488',
          300: '#FFD858',
          400: '#FFC928',
          500: '#F0B300',
          600: '#C28F00',
          700: '#8F6900',
        },
        festival: {
          DEFAULT: '#FF8A00',
          300: '#FFB457',
          400: '#FF9D2B',
          500: '#FF8A00',
          600: '#D97100',
        },
        vibrant: {
          DEFAULT: '#FF3D85',
          300: '#FF85B0',
          400: '#FF5F99',
          500: '#FF3D85',
          600: '#DB2366',
        },
        royal: {
          DEFAULT: '#673AB7',
          300: '#A383DB',
          400: '#8459CA',
          500: '#673AB7',
          600: '#512C94',
        },
        sky: {
          DEFAULT: '#39BDF8',
          300: '#86D9FB',
          400: '#5CCBF9',
          500: '#39BDF8',
          600: '#1898D4',
        },
        navy: {
          DEFAULT: '#101B35',
          700: '#1C2A4D',
          800: '#152140',
          900: '#101B35',
          950: '#0A1226',
        },
        cream: {
          DEFAULT: '#FFF9EF',
          100: '#FFFDF8',
          200: '#FFF9EF',
          300: '#F7EEDF',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        urdu: ['var(--font-urdu)', 'serif'],
      },
      fontSize: {
        // Fluid display sizes: readable on a 360px phone, cinematic on desktop.
        'display-sm': ['clamp(1.75rem, 1.2rem + 2.6vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(2.25rem, 1.3rem + 4.2vw, 4.5rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        'display-lg': ['clamp(2.75rem, 1.2rem + 6.6vw, 7rem)', { lineHeight: '0.98', letterSpacing: '-0.03em' }],
        'display-xl': ['clamp(3.25rem, 1rem + 9.5vw, 10rem)', { lineHeight: '0.94', letterSpacing: '-0.04em' }],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.75rem' },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,201,40,0.35), 0 12px 40px -12px rgba(255,138,0,0.45)',
        lift: '0 24px 60px -24px rgba(16,27,53,0.45)',
        card: '0 2px 4px -2px rgba(16,27,53,0.12), 0 12px 32px -16px rgba(16,27,53,0.28)',
      },
      backgroundImage: {
        'basant-sweep': 'linear-gradient(100deg,#FFC928 0%,#FF8A00 38%,#FF3D85 72%,#673AB7 100%)',
        'sky-dusk': 'linear-gradient(180deg,#39BDF8 0%,#FFC928 58%,#FF8A00 100%)',
      },
      keyframes: {
        'kite-sway': {
          '0%,100%': { transform: 'translate3d(0,0,0) rotate(-3deg)' },
          '50%': { transform: 'translate3d(6px,-10px,0) rotate(3deg)' },
        },
        'drift-up': { from: { opacity: '0', transform: 'translate3d(0,18px,0)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'kite-sway': 'kite-sway 6s ease-in-out infinite',
        'drift-up': 'drift-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
