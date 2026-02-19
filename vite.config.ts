import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        name: "PowerFlow — Smart Energy Wallet",
        short_name: "PowerFlow",
        description: "Manage your Tuya smart meter and energy wallet on the go",
        theme_color: "#00D4FF",
        background_color: "#0A0F1E",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
          {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='40' fill='%230A0F1E'/%3E%3Cpolygon points='110,20 60,100 96,100 82,172 148,80 108,80' fill='%2300D4FF'/%3E%3C/svg%3E",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='80' fill='%230A0F1E'/%3E%3Cpolygon points='300,50 160,260 256,260 220,462 390,210 288,210' fill='%2300D4FF'/%3E%3C/svg%3E",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
}));
