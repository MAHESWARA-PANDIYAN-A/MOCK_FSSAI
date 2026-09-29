/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          500: '#0066cc',
          700: '#004c99',
          800: '#0a3663',
          900: '#072444',
          950: '#04172c',
        },
        saffron: {
          50: '#fff9eb',
          100: '#ffefc6',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        fssai: {
          navy: '#0f2b48',
          blue: '#1e40af',
          lightBlue: '#eff6ff',
          accent: '#f97316',
          green: '#15803d',
        }
      }
    },
  },
  plugins: [],
}
