/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Portfolio "or noir / or pale" palette - identical to /cv-3d
        bg:        '#050309',
        surface:   '#0a0612',
        surface2:  '#120a1c',
        goldPale:  '#d4c19a',
        goldDeep:  '#8a6f3f',
        goldGlow:  '#ffd97a',
        whiteHex:  '#f5efe0',
        muted:     '#8a7e66',
        danger:    '#ff6b6b',
        success:   '#7ad48a',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-sm':  '0 0 8px rgba(255, 217, 122, 0.15)',
        'gold':     '0 0 24px rgba(255, 217, 122, 0.18)',
        'gold-lg':  '0 0 48px rgba(255, 217, 122, 0.25)',
        'inset-gold': 'inset 0 0 0 1px rgba(212, 193, 154, 0.2)',
      },
      animation: {
        'twinkle':  'twinkle 3s ease-in-out infinite',
        'fade-in':  'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 2.5s ease-in-out infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%':      { opacity: '1' },
        },
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' },
                   '100%': { transform: 'translateY(0)',  opacity: '1' } },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(255,217,122,0.2)' },
          '50%':      { boxShadow: '0 0 32px rgba(255,217,122,0.4)' },
        },
      },
    },
  },
  plugins: [],
};
