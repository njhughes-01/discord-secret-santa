/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/index.html",
    "./src/client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        holiday: {
          red: '#D42426',
          darkred: '#9B1B1C',
          green: '#165B33',
          darkgreen: '#14452F',
          gold: '#F8B229',
          cream: '#F8F5EE'
        }
      }
    },
  },
  plugins: [],
}
