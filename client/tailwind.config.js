/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lime: { DEFAULT: '#C9F227', dark: '#9FBF12' },
        cream: '#FFFDF4',
        orange: { DEFAULT: '#F28B45' },
        pink: { DEFAULT: '#F4A3C7' },
        sky: { DEFAULT: '#83CFF0' },
        ink: '#242424',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        anton: ['Anton', 'Impact', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: { pop: '0 4px 0 #242424' },
    },
  },
  plugins: [],
}
