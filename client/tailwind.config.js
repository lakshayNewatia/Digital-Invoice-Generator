/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
        display: [
          'Space Grotesk',
          'Plus Jakarta Sans',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          950: '#070A12',
          900: '#0A0F1C',
          800: '#0F1629',
        },
        glow: {
          emerald: '#22c55e',
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          rose: '#fb7185',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.35)',
        lift: '0 18px 60px rgba(0,0,0,0.55)',
        ring: '0 0 0 1px rgba(255,255,255,0.08) inset',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

