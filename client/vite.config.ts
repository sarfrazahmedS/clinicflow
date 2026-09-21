import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to the backend so the browser talks to one origin
// (no CORS in dev, and httpOnly refresh cookies just work).
//
// `base` is "/" for normal builds; the static demo sets VITE_BASE (e.g.
// "/clinicflow/") so assets resolve under the GitHub Pages sub-path.
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
