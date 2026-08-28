/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ec', 100: '#dcf0d2', 200: '#bce1a9', 300: '#8fc972',
          400: '#5fab4a', 500: '#3e8f30', 600: '#2d7222', 700: '#25591d',
          800: '#1f481c', 900: '#1b3c1a', 950: '#0c2110',
        },
        secondary: {
          50: '#fefbec', 100: '#fdf5c8', 200: '#fbe98d', 300: '#f9d94e',
          400: '#f5c524', 500: '#e9a90c', 600: '#cd8206', 700: '#a85d0a',
          800: '#884710', 900: '#703b13', 950: '#411d06',
        },
        accent: {
          50: '#eef6ff', 100: '#d9ecff', 200: '#bcddff', 300: '#8ec8ff',
          400: '#58a8ff', 500: '#3186fc', 600: '#1c66f4', 700: '#1651e0',
          800: '#1942b6', 900: '#1a3c8f', 950: '#142656',
        },
        success: {
          50: '#edfdf3', 100: '#d3fadb', 200: '#aaf4b9', 300: '#72e890',
          400: '#3ed16a', 500: '#1fb550', 600: '#149142', 700: '#127437',
          800: '#115b30', 900: '#0f4b2a', 950: '#052a16',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f', 950: '#451a03',
        },
        error: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
        },
        neutral: {
          50: '#f7f8f6', 100: '#eef0ea', 200: '#dadde2', 300: '#b9bfc4',
          400: '#8e969d', 500: '#6a737a', 600: '#525b61', 700: '#40474c',
          800: '#2c3236', 900: '#1a1f22', 950: '#0e1213',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,16,0.04), 0 4px 16px rgba(16,24,16,0.06)',
        'card-lg': '0 2px 4px rgba(16,24,16,0.05), 0 12px 32px rgba(16,24,16,0.10)',
        glow: '0 0 0 4px rgba(62,143,48,0.18)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        'pulse-soft': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.22,1,0.36,1)',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.22,1,0.36,1)',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
