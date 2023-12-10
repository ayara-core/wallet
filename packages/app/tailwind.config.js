/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#FF825B",
          secondary: "#B6E2F4",
          accent: "#FFFFFF",
          "base-100": "#000000",
        },
      },
    ],
  },
  theme: {
    extend: {
      width: {
        'extension': '32rem',
      },
      height: {
        'extension': '56rem',
      },
    },
  },
};
