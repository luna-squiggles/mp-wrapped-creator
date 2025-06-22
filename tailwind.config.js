/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontWeight: {
        'ultrabold': '800',
      },
    },
  },
  plugins: [],
};
