/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Brand surfaces, headings, and CTAs. */
        primary: {
          DEFAULT: '#1E2952',
          hover: '#151d3c',
        },
      },
    },
  },
  plugins: [],
}

