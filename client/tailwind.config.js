/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#6D5DFC",
          hover: "#5A4CE8"
        },
        secondary: {
          DEFAULT: "#00C2FF",
          hover: "#00AEE0"
        },
        accent: {
          DEFAULT: "#00D084",
          hover: "#00B873"
        },
        text: {
          primary: "#0F172A",
          secondary: "#475569",
          DEFAULT: "#0F172A"
        },
        muted: "#64748B",
        border: "#E2E8F0"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"]
      },
      borderRadius: {
        'clay': '24px',
        'clay-sm': '16px',
        'clay-lg': '32px'
      },
      boxShadow: {
        // High quality Light Theme Claymorphism shadows (soft grey shadows + white highlights)
        'clay-card': '0 20px 40px rgba(15, 23, 42, 0.06), inset 0 3px 6px rgba(255, 255, 255, 0.9), inset 0 -10px 20px rgba(15, 23, 42, 0.03), inset 10px 0 20px rgba(255, 255, 255, 0.5)',
        'clay-card-hover': '0 30px 60px rgba(109, 93, 252, 0.12), inset 0 3px 8px rgba(255, 255, 255, 0.95), inset 0 -12px 24px rgba(15, 23, 42, 0.04), inset 12px 0 24px rgba(255, 255, 255, 0.6)',
        'clay-primary': '0 12px 24px rgba(109, 93, 252, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -6px 12px rgba(0, 0, 0, 0.25), inset 6px 0 12px rgba(255, 255, 255, 0.2)',
        'clay-primary-hover': '0 16px 32px rgba(109, 93, 252, 0.35), inset 0 3px 6px rgba(255, 255, 255, 0.5), inset 0 -8px 16px rgba(0, 0, 0, 0.3), inset 8px 0 16px rgba(255, 255, 255, 0.25)',
        'clay-secondary': '0 12px 24px rgba(0, 194, 255, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -6px 12px rgba(0, 0, 0, 0.2), inset 6px 0 12px rgba(255, 255, 255, 0.2)',
        'clay-accent': '0 12px 24px rgba(0, 208, 132, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -6px 12px rgba(0, 0, 0, 0.2), inset 6px 0 12px rgba(255, 255, 255, 0.2)',
        'clay-input': 'inset 0 2px 4px rgba(15, 23, 42, 0.05), inset 0 -1px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(15, 23, 42, 0.02)',
        'clay-input-focus': 'inset 0 2px 4px rgba(15, 23, 42, 0.08), inset 0 -1px 2px rgba(255, 255, 255, 0.8), 0 0 12px rgba(109, 93, 252, 0.3)'
      }
    },
  },
  plugins: [],
}
