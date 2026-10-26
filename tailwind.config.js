/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#fbfaf7',
          100: '#f6f4ee',
          200: '#ece8dd',
          300: '#ded8c8',
        },
        ink: {
          900: '#0b1437',
          800: '#13205a',
          700: '#1d2d6b',
          600: '#2b3d83',
          500: '#3c4f97',
          400: '#5a6aae',
          300: '#8a95c4',
        },
        indigo: {
          50: '#eef0ff',
          100: '#e0e4ff',
          200: '#c5ccff',
          300: '#9fa9ff',
          400: '#7684ff',
          500: '#4f5ef5',
          600: '#3848e0',
          700: '#2c39b8',
          800: '#253094',
          900: '#1f2a78',
        },
        teal: {
          50: '#eafaf6',
          100: '#cef3e9',
          200: '#9ce6d4',
          300: '#5fd3ba',
          400: '#2bba9d',
          500: '#139e83',
          600: '#0c7e69',
          700: '#0b6455',
          800: '#0c5045',
          900: '#0c4239',
        },
        amber: {
          50: '#fff7e6',
          100: '#ffedc2',
          200: '#fdd88a',
          300: '#fbbf4f',
          400: '#f7a11f',
          500: '#e2830a',
          600: '#bb6305',
          700: '#934a08',
          800: '#773a0c',
          900: '#62310e',
        },
        rose: {
          50: '#fff1f1',
          100: '#ffdfe0',
          200: '#ffc4c6',
          300: '#fb9da0',
          400: '#f2696e',
          500: '#e2454b',
          600: '#c52e34',
          700: '#a32228',
          800: '#861f24',
          900: '#701e23',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.03em',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11,20,55,0.04), 0 1px 3px rgba(11,20,55,0.06)',
        card: '0 1px 2px rgba(11,20,55,0.05), 0 8px 24px -12px rgba(11,20,55,0.18)',
        lift: '0 2px 4px rgba(11,20,55,0.06), 0 20px 40px -18px rgba(31,42,120,0.30)',
        glow: '0 0 0 1px rgba(79,94,245,0.18), 0 18px 40px -16px rgba(79,94,245,0.45)',
      },
      backgroundImage: {
        'paper-grain':
          "radial-gradient(circle at 1px 1px, rgba(11,20,55,0.035) 1px, transparent 0)",
        'hero-radial':
          'radial-gradient(1200px 600px at 75% -10%, rgba(79,94,245,0.12), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(19,158,131,0.10), transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.5s ease both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
