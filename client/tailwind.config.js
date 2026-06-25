/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC", surface: "#FFFFFF", card: "#FFFFFF",
        primary: { DEFAULT: "#16A34A", hover: "#15803D" },
        secondary: { DEFAULT: "#22C55E", hover: "#16A34A" },
        accent: { DEFAULT: "#10B981", hover: "#059669" },
        charcoal: { DEFAULT: "#0F172A", surface: "#1E293B" },
        text: { primary: "#0F172A", secondary: "#475569", DEFAULT: "#0F172A" },
        muted: "#64748B", border: "#E2E8F0", danger: "#EF4444", warning: "#F59E0B"
      },
      fontFamily: { sans: ["Inter", "sans-serif"], display: ["Space Grotesk", "Inter", "sans-serif"] },
      borderRadius: { clay: '24px', 'clay-sm': '16px', 'clay-lg': '32px' },
      boxShadow: {
        'clay-card': '0 20px 45px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.92)',
        'clay-card-hover': '0 28px 70px rgba(22,163,74,0.16), inset 0 1px 0 rgba(255,255,255,0.95)',
        'clay-primary': '0 16px 32px rgba(22,163,74,0.24), inset 0 1px 0 rgba(255,255,255,0.24)',
        'clay-primary-hover': '0 18px 42px rgba(22,163,74,0.34), inset 0 1px 0 rgba(255,255,255,0.28)',
        'clay-secondary': '0 14px 30px rgba(34,197,94,0.18), inset 0 1px 0 rgba(255,255,255,0.24)',
        'clay-accent': '0 14px 30px rgba(16,185,129,0.18), inset 0 1px 0 rgba(255,255,255,0.24)',
        'clay-input': '0 1px 2px rgba(15,23,42,0.04), inset 0 1px 2px rgba(15,23,42,0.04)',
        'clay-input-focus': '0 0 0 4px rgba(22,163,74,0.10), 0 1px 2px rgba(15,23,42,0.04)'
      }
    }
  },
  plugins: []
};
