import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
