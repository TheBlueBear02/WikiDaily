/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: ['bg-secondary', 'bg-secondary-hover', 'text-secondary'],
  theme: {
    extend: {
      colors: {
        /** Brand surfaces, headings, and CTAs. */
        primary: {
          DEFAULT: '#1E2952',
          hover: '#151d3c',
        },
        secondary: {
          DEFAULT: '#dc143c',
          hover: '#b01030',
        },
      },
      keyframes: {
        'wd-milestone-twinkle': {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)', filter: 'brightness(1)' },
          '50%': {
            transform: 'scale(1.12) rotate(-8deg)',
            filter: 'brightness(1.2)',
          },
        },
      },
      animation: {
        'wd-milestone-twinkle': 'wd-milestone-twinkle 0.65s ease-out 1',
      },
    },
  },
  plugins: [],
}

