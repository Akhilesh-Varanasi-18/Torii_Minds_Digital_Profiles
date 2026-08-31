import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // All colors resolve to CSS variables set per-theme in globals.css,
        // so every utility (bg-surface, text-ink, border-line...) reacts to
        // the active org + light/dark mode automatically.
        bg: "var(--bg)",
        "bg-soft": "var(--bg-soft)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        body: "var(--body)",
        muted: "var(--muted)",
        line: "var(--line)",
        primary: {
          DEFAULT: "var(--primary)",
          600: "var(--primary-600)",
          fg: "var(--on-primary)",
        },
        accent: "var(--accent)",
        brand: "var(--brand)",
        tint: "var(--tint)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        info: "var(--info)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "calc(var(--radius-lg) + 6px)",
      },
      boxShadow: {
        card: "0 4px 20px -6px rgb(var(--shadow-color) / 0.16)",
        "card-lg": "0 18px 48px -12px rgb(var(--shadow-color) / 0.22)",
        glow: "0 16px 50px -12px rgb(var(--glow-color) / 0.5)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.23,1,0.32,1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
