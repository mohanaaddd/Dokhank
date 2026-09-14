export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05040F',
          900: '#0A0819',
          800: '#110D26',
          700: '#191334',
          600: '#241C48',
          500: '#332764',
        },
        neon: {
          lime: '#B8FF3C',
          cyan: '#22E4F5',
          magenta: '#FF3DCB',
          amber: '#FFC93C',
          violet: '#9B6BFF',
        },
        accent: 'var(--accent)',
        'accent-deep': 'var(--accent-deep)',
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Bungee', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        chunk: '1.25rem',
        blob: '2rem',
      },
      boxShadow: {
        glow: '0 0 24px -4px var(--accent)',
        'glow-soft': '0 0 40px -12px var(--accent)',
      },
      transitionTimingFunction: {
        pop: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      keyframes: {
        'grid-pan': {
          '0%': { backgroundPosition: '0px 0px' },
          '100%': { backgroundPosition: '0px 44px' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'grid-pan': 'grid-pan 6s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.23, 1, 0.32, 1) infinite',
      },
    },
  },
}
