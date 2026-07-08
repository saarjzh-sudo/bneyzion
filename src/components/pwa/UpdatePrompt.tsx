/**
 * UpdatePrompt — "גרסה חדשה זמינה".
 *
 * 8.7.2026 (סער): החלונית הצפה הסתירה תוכן, ובדפדפן-מחשב "מה קשור עדכון".
 * העיצוב החדש:
 *   • באפליקציה המותקנת (PWA standalone) — שם אין למשתמש כפתור רענון — מוצגת
 *     חלונית ברורה מעל שורת הניווט (כמו קודם). זה הקהל שחייב את זה.
 *   • בדפדפן רגיל — לשונית-צד קטנה ושקטה בקצה הימני (מעל לשונית הנגישות),
 *     לא מסתירה כלום; ריחוף מרחיב, לחיצה מעדכנת.
 *   • מוצג רק כשבאמת יש service worker חדש ממתין (registration.waiting) —
 *     בדיקה כפולה שהגולש אינו כבר על הגרסה האחרונה.
 */
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

const CHECK_INTERVAL_MS = 60_000;

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as any).standalone === true
  );
}

export default function UpdatePrompt() {
  const [updating, setUpdating] = useState(false);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);
  const [hasWaiting, setHasWaiting] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setReg(registration);
      setInterval(() => registration.update().catch(() => {}), CHECK_INTERVAL_MS);
    },
  });

  // בדיקה כפולה: מציגים רק כשקיים SW ממתין בפועל — לא מקפיצים למי שכבר מעודכן.
  useEffect(() => {
    if (!needRefresh) { setHasWaiting(false); return; }
    setHasWaiting(!!reg?.waiting);
  }, [needRefresh, reg]);

  const applyUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch {
      /* נופל לרילוד למטה */
    }
    setTimeout(() => window.location.reload(), 1000);
  };

  const show = needRefresh && hasWaiting;
  const standalone = isStandalone();

  return (
    <AnimatePresence>
      {show && standalone && (
        // ── אפליקציה מותקנת: חלונית מלאה (אין דרך אחרת לרענן) ──
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
            <span aria-hidden style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: "rgba(196,162,101,0.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B6F47" }}>
              <RefreshCw style={{ width: 20, height: 20 }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#1A2744" }}>גרסה חדשה זמינה</p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#8B6F47" }}>לחצו לעדכון האפליקציה</p>
            </div>
            <button
              type="button"
              onClick={applyUpdate}
              disabled={updating}
              style={{ flexShrink: 0, border: "none", cursor: updating ? "wait" : "pointer", background: "#204F49", color: "#FAF6F0", fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem", borderRadius: 10, padding: "0.55rem 0.95rem", opacity: updating ? 0.7 : 1 }}
            >
              {updating ? "מעדכן..." : "עדכן עכשיו"}
            </button>
            <button type="button" onClick={() => setNeedRefresh(false)} aria-label="סגירה"
              style={{ flexShrink: 0, border: "none", cursor: "pointer", background: "transparent", color: "#8B6F47", display: "flex", alignItems: "center", padding: 4 }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </motion.div>
      )}

      {show && !standalone && (
        // ── דפדפן: לשונית-צד קטנה ושקטה — לא מסתירה תוכן ──
        <motion.button
          dir="rtl"
          type="button"
          onClick={applyUpdate}
          title="גרסה חדשה זמינה — לחצו לעדכון"
          aria-label="גרסה חדשה זמינה — לחצו לעדכון"
          className="bz-update-tab"
          data-print-hide
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 0.85 }}
          exit={{ x: 60, opacity: 0 }}
          style={{
            position: "fixed",
            top: "44%",
            right: 0,
            transform: "translateY(-50%)",
            zIndex: 2100,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            border: "none",
            borderRadius: "12px 0 0 12px",
            background: "#204F49",
            color: "#FAF6F0",
            fontFamily: '"Ploni", system-ui, sans-serif',
            fontSize: "0.78rem",
            fontWeight: 700,
            padding: "0.5rem 0.7rem",
            cursor: updating ? "wait" : "pointer",
            boxShadow: "-2px 2px 10px rgba(45,31,14,0.2)",
          }}
        >
          <RefreshCw style={{ width: 15, height: 15 }} className={updating ? "animate-spin" : ""} />
          {updating ? "מעדכן…" : "גרסה חדשה"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
