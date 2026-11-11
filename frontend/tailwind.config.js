/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3efe7",
        card: "#fbf9f4",
        ink: "#1b1a17",
        muted: "#6f6b61",
        line: "#e2dccf",
        ok: "#3f7d58",
        warn: "#b9791a",
        alert: "#bf3b2b",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
