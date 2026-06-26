import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' makes the build work on GitHub Pages from any sub-path.
export default defineConfig({
  plugins: [react()],
  base: "./",
  // Standalone HTML is a pre-built offline artifact, not a Vite entry.
  optimizeDeps: {
    entries: ["index.html"],
  },
  build: {
    rollupOptions: {
      input: "index.html",
    },
  },
});
