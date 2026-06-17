/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          50: '#eef2f7',
          100: '#d4dde9',
          200: '#a9bbd3',
          300: '#7e99bd',
          400: '#5377a7',
          500: '#2e568f',
          600: '#1e3a5f',
          700: '#172d4a',
          800: '#102035',
          900: '#091320',
        },
        amber: {
          400: '#e8c36a',
          500: '#d4a853',
          600: '#c0933e',
        },
        warm: {
          50: '#faf8f5',
          100: '#f5f3ef',
          200: '#ebe7df',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
