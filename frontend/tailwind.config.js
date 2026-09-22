/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          light: "rgba(255, 255, 255, 0.65)",
          card: "rgba(255, 255, 255, 0.78)",
          border: "rgba(0, 0, 0, 0.08)",
          hover: "rgba(255, 255, 255, 0.9)",
          dock: "rgba(255, 255, 255, 0.8)",
          darkText: "#18181b",
          subText: "#71717a",
        }
      },
      boxShadow: {
        'glass-sm': '0 2px 8px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'glass-md': '0 8px 30px 0 rgba(0, 0, 0, 0.06), 0 2px 6px 0 rgba(0, 0, 0, 0.03)',
        'glass-lg': '0 20px 50px 0 rgba(0, 0, 0, 0.08), 0 4px 12px 0 rgba(0, 0, 0, 0.04)',
        'dock': '0 12px 40px -10px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
