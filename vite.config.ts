import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    // Páginas con assets pesados (network.jpg) elevan el umbral; lo subimos para
    // evitar warnings ruidosos sin perder visibilidad de regresiones reales.
    chunkSizeWarningLimit: 1500,
    // NOTA: NO usar `manualChunks` para separar React de las librerías que lo
    // consumen (Radix, i18n, etc.). Rollup no garantiza el orden de carga
    // entre chunks "hermanos" y produce el clásico
    // `Cannot read properties of undefined (reading 'createContext')`
    // en producción (pantalla negra). Dejamos que Vite haga el splitting
    // natural a partir de los `lazy()` por ruta en App.tsx.
  },
}));
