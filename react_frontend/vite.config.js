import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  test:{
    environment:"jsdom",
    setupFiles:"./src/test/setup.js",
    css:false,
    restoreMocks:true,
  },
});
