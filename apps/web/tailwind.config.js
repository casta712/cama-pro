/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bone: "#FAF7F2",
        cream: "#F2EDE3",
        ink: "#1A1815",
        ash: "#6B655C",
        line: "#E3DCCC",
        terra: {
          DEFAULT: "#C2410C",
          deep: "#9A3309",
          soft: "#F4E0D2",
        },
        sage: "#5B6B4D",
        wine: "#7C2D2A",
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        editorial: "-0.02em",
        wider2: "0.18em",
      },
      borderRadius: {
        card: "2px",
      },
      boxShadow: {
        soft: "0 1px 0 rgba(26, 24, 21, 0.06), 0 8px 24px -12px rgba(26, 24, 21, 0.12)",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        riseIn: "riseIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        fadeIn: "fadeIn 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
