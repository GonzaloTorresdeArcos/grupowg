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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // Núcleo React + router + query → un único vendor compartido.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("react-router") ||
            id.includes("@tanstack/")
          ) {
            return "vendor-react";
          }

          // Radix UI (todos los @radix-ui/*) en su propio chunk.
          if (id.includes("@radix-ui/")) return "vendor-radix";

          // i18n
          if (id.includes("i18next") || id.includes("react-i18next")) {
            return "vendor-i18n";
          }

          // Supabase
          if (id.includes("@supabase/")) return "vendor-supabase";

          // Animaciones
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
            return "vendor-motion";
          }

          // PDF / canvas (pesados, sólo en exportaciones)
          if (id.includes("html2canvas") || id.includes("jspdf") || id.includes("dompurify")) {
            return "vendor-pdf";
          }

          // Iconos
          if (id.includes("lucide-react")) return "vendor-icons";

          // Resto de dependencias → vendor genérico.
          return "vendor";
        },
      },
    },
  },
}));
