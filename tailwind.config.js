/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        "cool-blue": "#1C3A66",
        "dark-blue": "#0F1D3C",
        "electric-blue": "#00A3E6",
        gray: "#A0A0A0",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      fontFamily: {
        cool: ["Roboto", "sans-serif"],
      },
      textColor: {
        "cool-blue": "#1C3A66",
        "dark-blue": "#0F1D3C",
        "electric-blue": "#00A3E6",
        gray: "#A0A0A0",
      },
      borderColor: {
        "cool-blue": "#1C3A66",
        "dark-blue": "#0F1D3C",
        "electric-blue": "#00A3E6",
        gray: "#A0A0A0",
      },
    },
  },
  plugins: [],
};
