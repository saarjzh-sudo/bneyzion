import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { resolve } from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "lovable-uploads/logo-bney-zion.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,otf}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // skipWaiting + clientsClaim: new SW activates immediately on all tabs
        // without waiting for user to close tabs. Critical for production deploys.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Supabase requests must NEVER be cached — donation counts and dynamic
        // data must always reflect live DB state. NetworkOnly = bypass SW entirely.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "בני ציון",
        short_name: "בני ציון",
        description: "פורטל מרכזי ללימוד תנ״ך – שיעורים, סדרות, רבנים ועוד",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        dir: "rtl",
        lang: "he",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/lovable-uploads/logo-bney-zion.png", sizes: "192x192", type: "image/png" },
          { src: "/lovable-uploads/logo-bney-zion.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  build: {
    // esnext target required for @hebcal/core which uses top-level await for
    // Temporal polyfill. Audience is iOS 16+ / Chrome 90+ — no real-world risk.
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        checkout: resolve(__dirname, "checkout.html"),
        terms: resolve(__dirname, "terms.html"),
        donate: resolve(__dirname, "donate.html"),
        "megilat-esther": resolve(__dirname, "megilat-esther.html"),
        "store-product": resolve(__dirname, "store-product.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
