const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "trinidad": "#e3530d",
        "jungle-green": "#295d42",
        "cream": "#f7f5ec",
        "dark-text": "#222222",
        "muted-text": "#707070",
        "gold": "#fbd784",
        "outline-gray": "#d8d6d6"
      },
      fontFamily: {
        "headline": ["Familjen Grotesk", "sans-serif"],
        "body": ["Familjen Grotesk", "sans-serif"],
        "label": ["Familjen Grotesk", "sans-serif"],
        "button": ["'Asap Condensed'", "sans-serif"]
      },
      borderRadius: { "DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px" },
    },
  },
  plugins: [],
};
