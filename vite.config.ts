import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
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
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
