import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      colors: {
        marine: "#3B4F86",
        nuit: { DEFAULT: "#1F2857", soft: "#2A3570" },
        orbite: { DEFAULT: "#F5923F", soft: "rgba(245,146,63,0.28)" },
        braise: "#D9601F",
        papier: "#FDFCF3",
        brume: "#E8ECF6",
        sauge: "#2E9E7A",
      },
    },
  },
} satisfies Config;
