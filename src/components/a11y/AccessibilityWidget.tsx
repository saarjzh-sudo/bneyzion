/**
 * AccessibilityWidget — כפתור נגישות צף (תקן ישראלי 5568).
 *
 * נותן למשתמש שליטה מעשית: הגדלת/הקטנת טקסט, ניגודיות גבוהה, הדגשת קישורים,
 * גופן קריא, ואיפוס. הבחירות נשמרות ב-localStorage ומוחלות על <html> דרך
 * מחלקות + משתנה CSS. עצמאי לגמרי (בלי תלות חיצונית), נגיש למקלדת, RTL.
 *
 * עיצוב (8.7.2026, בקשת סער): לא כפתור צף שמסתיר תוכן — אלא לשונית דקה
 * צמודת-קצה בצד ימין, במרכז-גובה. שקופה-למחצה עד ריחוף, נפתחת בלחיצה.
 * לא תופסת שטח תוכן בנייד ובדסקטופ (בנצי בפינה השמאלית — לא מתנגשים).
 */
import { useEffect, useState, useCallback } from "react";
import { Accessibility, X, Plus, Minus, Contrast, Link2, Type, RotateCcw } from "lucide-react";

const KEY = "bz_a11y_prefs_v1";

interface Prefs {
  fontScale: number; // 1 = 100%
  contrast: boolean;
  links: boolean;
  readable: boolean;
}
const DEFAULTS: Prefs = { fontScale: 1, contrast: false, links: false, readable: false };

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function apply(p: Prefs) {
  const el = document.documentElement;
  el.style.setProperty("--a11y-font-scale", String(p.fontScale));
  el.classList.toggle("a11y-font-scaled", p.fontScale !== 1);
  el.classList.toggle("a11y-contrast", p.contrast);
  el.classList.toggle("a11y-links", p.links);
  el.classList.toggle("a11y-readable", p.readable);
}

const GOLD = "#8B6F47";
const GOLD_LIGHT = "#C4A265";

const AccessibilityWidget = () => {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  // Load + apply saved prefs on mount.
  useEffect(() => {
    const p = read();
    setPrefs(p);
    apply(p);
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      apply(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* מצב-פרטי — מתעלמים */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => update(DEFAULTS), [update]);

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.6rem",
    padding: "0.55rem 0.7rem",
    borderRadius: 10,
    background: "rgba(139,111,71,0.06)",
    marginBottom: "0.4rem",
  };
  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.35rem 0.7rem",
    borderRadius: 8,
    border: `1px solid ${active ? GOLD : "rgba(139,111,71,0.25)"}`,
    background: active ? GOLD : "#fff",
    color: active ? "#fff" : "#3D2A14",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="תפריט נגישות"
        className="bz-a11y-tab"
        style={{
          position: "fixed",
          top: "58%",
          right: 0,
          transform: "translateY(-50%)",
          zIndex: 100,
          width: 28,
          height: 58,
          borderRadius: "12px 0 0 12px",
          border: "none",
          borderInlineEnd: "none",
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "-2px 2px 10px rgba(45,31,14,0.18)",
          cursor: "pointer",
          opacity: open ? 1 : 0.72,
          transition: "opacity 0.2s, width 0.2s",
          padding: 0,
        }}
      >
        <Accessibility size={17} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="הגדרות נגישות"
          dir="rtl"
          style={{
            position: "fixed",
            top: "58%",
            right: 34,
            transform: "translateY(-50%)",
            zIndex: 100,
            width: 260,
            maxWidth: "calc(100vw - 3.2rem)",
            maxHeight: "min(70vh, 430px)",
            overflowY: "auto",
            background: "#FAF6F0",
            borderRadius: 16,
            border: `1px solid ${GOLD_LIGHT}`,
            boxShadow: "0 10px 34px rgba(45,31,14,0.28)",
            padding: "0.9rem",
            fontFamily: "Ploni, system-ui, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <strong style={{ fontSize: "0.95rem", color: "#2D1F0E" }}>נגישות</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="סגירה"
              style={{ background: "none", border: "none", cursor: "pointer", color: GOLD, padding: 2 }}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* גודל טקסט */}
          <div style={rowStyle}>
            <span style={{ fontSize: "0.82rem", color: "#3D2A14", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <Type size={15} aria-hidden="true" /> גודל טקסט
            </span>
            <span style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center" }}>
              <button type="button" aria-label="הקטנת טקסט" onClick={() => update({ fontScale: Math.max(0.9, +(prefs.fontScale - 0.1).toFixed(2)) })}
                style={{ ...btnStyle(false), padding: "0.3rem" }}>
                <Minus size={14} aria-hidden="true" />
              </button>
              <span style={{ fontSize: "0.75rem", minWidth: 34, textAlign: "center", color: GOLD }}>{Math.round(prefs.fontScale * 100)}%</span>
              <button type="button" aria-label="הגדלת טקסט" onClick={() => update({ fontScale: Math.min(1.5, +(prefs.fontScale + 0.1).toFixed(2)) })}
                style={{ ...btnStyle(false), padding: "0.3rem" }}>
                <Plus size={14} aria-hidden="true" />
              </button>
            </span>
          </div>

          <button type="button" onClick={() => update({ contrast: !prefs.contrast })} aria-pressed={prefs.contrast}
            style={{ ...rowStyle, width: "100%", border: "none", cursor: "pointer", background: prefs.contrast ? "rgba(196,162,101,0.18)" : "rgba(139,111,71,0.06)" }}>
            <span style={{ fontSize: "0.82rem", color: "#3D2A14", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <Contrast size={15} aria-hidden="true" /> ניגודיות גבוהה
            </span>
            <span style={btnStyle(prefs.contrast)}>{prefs.contrast ? "פעיל" : "כבוי"}</span>
          </button>

          <button type="button" onClick={() => update({ links: !prefs.links })} aria-pressed={prefs.links}
            style={{ ...rowStyle, width: "100%", border: "none", cursor: "pointer", background: prefs.links ? "rgba(196,162,101,0.18)" : "rgba(139,111,71,0.06)" }}>
            <span style={{ fontSize: "0.82rem", color: "#3D2A14", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <Link2 size={15} aria-hidden="true" /> הדגשת קישורים
            </span>
            <span style={btnStyle(prefs.links)}>{prefs.links ? "פעיל" : "כבוי"}</span>
          </button>

          <button type="button" onClick={() => update({ readable: !prefs.readable })} aria-pressed={prefs.readable}
            style={{ ...rowStyle, width: "100%", border: "none", cursor: "pointer", background: prefs.readable ? "rgba(196,162,101,0.18)" : "rgba(139,111,71,0.06)" }}>
            <span style={{ fontSize: "0.82rem", color: "#3D2A14", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <Type size={15} aria-hidden="true" /> גופן קריא
            </span>
            <span style={btnStyle(prefs.readable)}>{prefs.readable ? "פעיל" : "כבוי"}</span>
          </button>

          <button type="button" onClick={reset}
            style={{ width: "100%", marginTop: "0.4rem", padding: "0.5rem", borderRadius: 10, border: `1px solid ${GOLD}`, background: "#fff", color: GOLD, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontFamily: "inherit" }}>
            <RotateCcw size={14} aria-hidden="true" /> איפוס
          </button>

          <a href="/accessibility" style={{ display: "block", textAlign: "center", marginTop: "0.5rem", fontSize: "0.75rem", color: GOLD, textDecoration: "underline" }}>
            הצהרת הנגישות המלאה
          </a>
        </div>
      )}

      {/* מחלקות ההחלה — גלובלי */}
      <style>{`
        .bz-a11y-tab:hover, .bz-a11y-tab:focus-visible { opacity: 1 !important; width: 34px !important; }
        @media print { .bz-a11y-tab { display: none !important; } }
        html.a11y-font-scaled body { font-size: calc(1rem * var(--a11y-font-scale, 1)); }
        html.a11y-contrast body { filter: contrast(1.35) saturate(1.1); }
        html.a11y-links a { text-decoration: underline !important; text-underline-offset: 2px; }
        html.a11y-readable body, html.a11y-readable body * { font-family: Arial, "Helvetica Neue", sans-serif !important; letter-spacing: 0.01em; }
      `}</style>
    </>
  );
};

export default AccessibilityWidget;
