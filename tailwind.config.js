export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#141521",
        night: "#20243a",
        pop: "#ffcc4d",
        coral: "#ff6f61",
        mint: "#2fd6a2",
        pool: "#1b9aaa",
        plum: "#6d4aff"
      },
      boxShadow: {
        lift: "0 18px 40px rgba(20, 21, 33, 0.18)"
      }
    }
  },
  plugins: []
};
