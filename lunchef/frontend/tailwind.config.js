/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'shimmer-slide': {
          to: { transform: 'translate(calc(100cqw - 100%), 0)' },
        },
        'spin-around': {
          '0%': { transform: 'translateZ(0) rotate(0)' },
          '15%, 35%': { transform: 'translateZ(0) rotate(90deg)' },
          '65%, 85%': { transform: 'translateZ(0) rotate(270deg)' },
          '100%': { transform: 'translateZ(0) rotate(360deg)' },
        },
        'shiny-text': {
          '0%, 90%, 100%': { 'background-position': 'calc(-100% - var(--shiny-width)) 0' },
          '30%, 60%': { 'background-position': 'calc(100% + var(--shiny-width)) 0' },
        },
        rippling: {
          '0%': { opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        shine: {
          '0%': { 'background-position': '0% 0%' },
          '50%': { 'background-position': '100% 100%' },
          '100%': { 'background-position': '0% 0%' },
        },
        'badge-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'shimmer-slide': 'shimmer-slide var(--speed,3s) ease-in-out infinite alternate',
        'spin-around': 'spin-around calc(var(--speed,3s)*2) infinite linear',
        'shiny-text': 'shiny-text 8s infinite',
        rippling: 'rippling var(--duration,600ms) ease-out',
        shine: 'shine var(--duration,14s) infinite linear',
        'badge-pop': 'badge-pop 0.3s ease-out forwards',
        'slide-down': 'slide-down 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
