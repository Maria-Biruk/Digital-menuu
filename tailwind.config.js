/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brown: {
          DEFAULT: "#2B1810",
          primary: "#2B1810",
          hover: "#3D2415",
          pressed: "#1F110A",
          darkBg: "#120B07",
          darkBg2: "#100906",
          modal: "#150D09",
          surface: "#1C1109",
          footer: "#0D0705",
          hero1: "#1A0E06",
          hero2: "#150A05",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
      },
    },
  },
  plugins: [],
};

