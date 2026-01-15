/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4472C4',
        'primary-dark': '#3461B0',
        success: '#27AE60',
        danger: '#E74C3C',
        warning: '#F39C12',
      },
    },
  },
  plugins: [],
}
