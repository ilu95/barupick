import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FEFBF8', 100: '#FFF5F0', 200: '#F7F5F2', 300: '#EFECEA',
          400: '#E7E5E4', 500: '#D6D3D1', 600: '#A8A29E', 700: '#78716C',
          800: '#57534E', 900: '#1C1917',
        },
        terra: {
          50: '#FEFBF8', 100: '#FFF5F0', 200: '#FEEADD', 300: '#F5C9AF',
          400: '#D9956F', 500: '#C2785C', 600: '#A8613F', 700: '#8B4D30',
        },
        sage: { DEFAULT: '#6B9E76', light: '#F0F7F1' },
      },
      fontFamily: {
        display: ['Outfit', 'Pretendard', 'sans-serif'],
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(28,25,23,0.04), 0 4px 12px rgba(28,25,23,0.03)',
        'warm': '0 2px 8px rgba(28,25,23,0.06), 0 8px 24px rgba(28,25,23,0.04)',
        'warm-lg': '0 4px 16px rgba(28,25,23,0.08), 0 12px 40px rgba(28,25,23,0.06)',
        'terra': '0 4px 16px rgba(194,120,92,0.25)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      keyframes: {
        'screen-enter': {
          from: { opacity: '0', transform: 'translateX(30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'screen-back': {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'screen-fade': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'like-bounce': {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'screen-enter': 'screen-enter 0.25s cubic-bezier(0.32,0.72,0,1)',
        'screen-back': 'screen-back 0.2s cubic-bezier(0.32,0.72,0,1)',
        'screen-fade': 'screen-fade 0.18s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'like-bounce': 'like-bounce 0.2s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
