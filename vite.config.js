import { defineConfig } from "vite";

export default defineConfig({
  base: "/alphabet-games/",
  build: {
    rollupOptions: {
      input: ["index.html", "greek-game/index.html", "cyrillic-game/index.html", "english-game/index.html"],
    },
  },
});
