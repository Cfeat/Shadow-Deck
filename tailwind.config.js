/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      animation: {
        "float-up": "float-up 2s ease-out forwards",
        "damage-number": "damage-pop 1.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards",
        shake: "shake 0.4s cubic-bezier(.36,.07,.19,.97) both",
        float: "float-gentle 4s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
