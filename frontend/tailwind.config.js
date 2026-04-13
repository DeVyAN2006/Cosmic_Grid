/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#02050f',
          900: '#060b18',
          800: '#0d1524',
          700: '#121f35',
          600: '#1a2d4a',
          500: '#243d5e',
          400: '#2e5080',
        },
        cyan: {
          DEFAULT: '#00d4ff',
          dim: '#0099bb',
        },
        storm: {
          none: '#10b981',
          g1: '#84cc16',
          g2: '#f59e0b',
          g3: '#f97316',
          g4: '#ef4444',
          g5: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        pulse_slow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};