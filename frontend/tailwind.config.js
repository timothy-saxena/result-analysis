/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c0d2ff',
          300: '#93b0ff',
          400: '#6088f7',
          500: '#3d62ee',
          600: '#2444e3',
          700: '#1c35c9',
          800: '#1c2ea3',
          900: '#1a2b81',
          950: '#141c54',
        }
      }
    },
  },
  plugins: [],
}
