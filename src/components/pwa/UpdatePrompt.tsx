/**
 * UpdatePrompt — visible "a new version is available" banner.
 *
 * Every production deploy ships a new service worker. With registerType:"prompt"
 * (vite.config.ts) that SW installs in the background and WAITS. This component
 * detects the waiting SW (needRefresh) and shows a small banner so the user taps
 * to update, instead of the tab silently reloading mid-read.
 *
 * "עדכן עכשיו" → updateServiceWorker(true): activates the waiting SW (SKIP_WAITING)
 * and reloads once it takes control. Checks for a new deploy every 60s on an open tab.
 */
import { useRegisterSW } from "virtual:pwa-register/react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

const CHECK_INTERVAL_MS = 60_000;

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Poll so an already-open tab notices a fresh deploy without a manual refresh.
      setInterval(() => registration.update().catch(() => {}), CHECK_INTERVAL_MS);
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          dir="rtl"
          role="status"
          aria-live="polite"
          data-print-hide
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          style={{
            position: "fixed",
            insetInline: 0,
            bottom: "calc(4rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
            zIndex: 2100,
            display: "flex",
            justifyContent: "center",
            padding: "0 1rem",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              maxWidth: 440,
              width: "100%",
              background: "#FAF6F0",
              border: "1px solid rgba(196,162,101,0.45)",
              borderRadius: 16,
              boxShadow: "0 12px 40px rgba(45,31,14,0.22)",
              padding: "0.85rem 1rem",
              fontFamily: '"Ploni", "Ploni DL 1.1", system-ui, sans-serif',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 38,
                height: 38,
                flexShrink: 0,
                borderRadius: 10,
                background: "rgba(196,162,101,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8B6F47",
              }}
            >
              <RefreshCw style={{ width: 20, height: 20 }} />
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#1A2744" }}>
                עדכון חדש זמין
              </p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#8B6F47" }}>
                גרסה מעודכנת של האתר מוכנה
              </p>
            </div>

            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              style={{
                flexShrink: 0,
                border: "none",
                cursor: "pointer",
                background: "#204F49",
                color: "#FAF6F0",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: "0.85rem",
                borderRadius: 10,
                padding: "0.55rem 0.95rem",
              }}
            >
              עדכן עכשיו
            </button>

            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              aria-label="סגירה"
              style={{
                flexShrink: 0,
                border: "none",
                cursor: "pointer",
                background: "transparent",
                color: "#8B6F47",
                display: "flex",
                alignItems: "center",
                padding: 4,
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
