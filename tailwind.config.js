/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fa',
          100: '#e1ebf4',
          200: '#c5d8ea',
          300: '#99bcdd',
          400: '#649bca',
          500: '#3e7eb5',
          600: '#2d6396',
          700: '#244e78',
          800: '#1e3f61',
          900: '#0f2744', // Dark sober navy blue
          950: '#0a1a2e',
        },
      },
    },
  },
  plugins: [],
}
