/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        santa: {
          red: '#BE123C',
          redDark: '#9F1230',
          green: '#15803D',
          greenDark: '#166534',
          white: '#FFFFFF',
          gold: '#D97706',
          goldDark: '#B45309',
          dark: '#1F2937',
          light: '#F3F4F6',
        },
      },
      animation: {
        snow: 'snow 10s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        snow: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(110vh)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
