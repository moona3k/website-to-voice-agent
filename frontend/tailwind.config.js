/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'mutual-blue': '#003a5d',
        'mutual-green': '#00a651',
        'mutual-orange': '#ff6b35',
      }
    },
  },
  plugins: [],
}