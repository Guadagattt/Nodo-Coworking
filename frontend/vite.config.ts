import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, los pedidos a /api se reenvían al backend Express.
// Local: http://localhost:3000 · Docker: http://api:3000 (variable API_URL)
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: { "/api": process.env.API_URL ?? "http://localhost:3000" },
  },
});
