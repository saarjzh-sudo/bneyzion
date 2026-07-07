import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/global-print.css";

// ── Self-heal stale tabs after a deploy ────────────────────────────────────────
// Each deploy gives every JS chunk a new content-hash, and only THAT deployment
// serves those filenames. A tab still running an OLDER deployment (loaded before
// the deploy) that navigates to a lazy route requests a chunk hash the new
// production deployment doesn't have → 404 → the lazy import fails and the page
// (e.g. the Yehoshua payment campaign) silently breaks. This caused the
// "סליקה חסומה" incident on 10.6.2026.
// Fix: when a chunk fails to load, reload ONCE to fetch the current index.html +
// chunks. Guarded against reload loops (won't reload more than once per 30s).
function reloadOnceForStaleChunk() {
  const KEY = "stale-chunk-reload-ts";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 30000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
}
// Vite's dedicated event for failed dynamic-import preloads.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  reloadOnceForStaleChunk();
});
// Belt-and-suspenders: chunk-load errors that surface as promise rejections.
window.addEventListener("unhandledrejection", (e) => {
  const msg = String((e as PromiseRejectionEvent)?.reason?.message || (e as PromiseRejectionEvent)?.reason || "");
  if (
    /dynamically imported module|Loading chunk|Importing a module script failed|Failed to fetch dynamically/i.test(msg)
  ) {
    reloadOnceForStaleChunk();
  }
});

// ── Live code updates ─────────────────────────────────────────────────────────
// SW registration + the "new version available" prompt now live in
// components/pwa/UpdatePrompt.tsx (registerType:"prompt"). Instead of silently
// reloading an open tab on deploy, the user gets a visible "עדכן עכשיו" banner.
// The stale-chunk self-heal above stays — it handles lazy-import 404s, a
// different failure mode from a waiting SW.

createRoot(document.getElementById("root")!).render(<App />);
