/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        verde: {
          primario:    "#004632",
          secundario:  "#006347",
          claro:       "#E8F4EE",
          borda:       "#C2DDD2",
          fundo:       "#F2F8F5",
        },
        texto: {
          principal:    "#1C2B25",
          secundario:   "#3D6B55",
          desabilitado: "#8AA89A",
        },
      },
    },
  },
  plugins: [],
};


