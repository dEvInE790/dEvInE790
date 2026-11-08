/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF6EF',
        blush: '#F9D7DD',
        petal: '#F2AFC0',
        rose: '#E07A93',
        berry: '#B23A5E',
        burgundy: '#7A1F3D',
        wine: '#4E0E26',
        gold: '#D9A86C',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 30px 80px -20px rgba(78, 14, 38, 0.45), 0 10px 30px -10px rgba(122, 31, 61, 0.25)',
        glow: '0 10px 40px -8px rgba(178, 58, 94, 0.65)',
      },
    },
  },
  plugins: [],
}
