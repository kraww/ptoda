/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Structural backgrounds (dark → light)
        bg:      '#0e0e10',   // outermost page background
        sidebar: '#141416',   // left sidebar
        surface: '#1c1c1f',   // content panels
        card:    '#242428',   // cards, inputs
        hover:   '#2e2e33',   // hover states
        border:  '#2e2e33',   // dividers and borders

        // Text
        'text-primary':   '#f2f3f5',
        'text-secondary': '#a1a1aa',
        'text-muted':     '#52525b',

        // Accent — T'poda purple
        accent: {
          DEFAULT: '#7c3aed',
          hover:   '#6d28d9',
          light:   '#a78bfa',
          subtle:  '#1e1730',
        },

        // Status
        danger:  '#e5484d',
        warn:    '#f59e0b',
        success: '#22c55e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.65rem',
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.22s ease-out',
      },
    },
  },
  plugins: [],
}
