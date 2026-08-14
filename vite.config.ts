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
      // "prompt" (was "autoUpdate"): a freshly-deployed SW WAITS instead of
      // silently reloading the open tab. UpdatePrompt.tsx surfaces a visible
      // "עדכון חדש זמין → עדכן עכשיו" banner; the user taps to activate + reload.
      registerType: "prompt",
      includeAssets: ["favicon.ico", "lovable-uploads/logo-bney-zion.png"],
      workbox: {
        // דפי כנס/קמפיין הם יעדי-שיגור: קליינט עם SW ישן שמגיש index ישן מקבל
        // עליהם 404 (לקח /campaign רמה 30 ודף הקלטת כנס אלול 14.8). ה-denylist
        // מוציא אותם מ-navigateFallback כך שגרסאות SW מכאן והלאה תמיד יביאו
        // אותם מהרשת. לא רטרואקטיבי — לקישורי שיגור משתמשים ב-alias נקי-SW
        // (bneyzion-kenes.vercel.app).
        navigateFallbackDenylist: [/^\/~oauth/, /^\/kenes/, /^\/campaign\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,otf}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // T08: pull Web Push handlers (push + notificationclick) into the
        // generated SW. generateSW alone can't host custom event listeners,
        // so the handlers live in public/push-sw.js and are imported here.
        importScripts: ["/push-sw.js"],
        // No skipWaiting/clientsClaim: with the "prompt" flow the new SW must
        // WAIT in the background until the user taps "עדכן עכשיו" (UpdatePrompt
        // calls updateServiceWorker(true) → SKIP_WAITING → activate → reload).
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
        theme_color: "#d4a85a",
        background_color: "#faf8f3",
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
  // Same esnext requirement applies to dev prebundling (@hebcal top-level await);
  // without this `vite dev` fails while `vite build` succeeds.
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
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
