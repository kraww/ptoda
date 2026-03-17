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
        'float-z': {
          '0%':   { opacity: 0,   transform: 'translateY(0)    scale(0.8)' },
          '40%':  { opacity: 0.7, transform: 'translateY(-10px) scale(1)'   },
          '100%': { opacity: 0,   transform: 'translateY(-28px) scale(1.1)' },
        },
      },
      animation: {
        'slide-up':    'slide-up 0.22s ease-out',
        'float-z1':    'float-z 2.4s ease-in-out infinite',
        'float-z2':    'float-z 2.4s ease-in-out infinite 0.8s',
        'float-z3':    'float-z 2.4s ease-in-out infinite 1.6s',
      },
    },
  },
  plugins: [],
}
