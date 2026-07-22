/**
 * /admin/sliders — ניהול סליידרי-תוכן (רמה 26ד, 22.7.2026).
 *
 * יואב 13:25: "ממש אשמח אם תהיה לי אפשרות ליצור לבד סליידרים לסידרה/קטגוריה
 * בדף הבית ובאגפים (כרגע אגף המורים)."
 *
 * כל סליידר = צומת בעץ הסדרות (סדרה או קטגוריה) + כותרת + מיקום. הרנדור:
 * CustomSlidersSlot בדף הבית ובאגף המורים. שלושת סליידרי-הבסיס של אגף
 * המורים (חדש/דפי עבודה/חידות) קבועים בקוד ואינם מנוהלים כאן.
 */
import { useState } from "react";
import { Loader2, Plus, Trash2, Eye, EyeOff, Search } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  useContentSliders, useCreateSlider, useUpdateSlider, useDeleteSlider, useSeriesSearch,
} from "@/hooks/useContentSliders";

const PLACEMENTS: Record<string, string> = { home: "דף הבית", teachers: "אגף המורים" };
// עיצובים קבועים (הכרעת סער 22.7): לא עיצוב חופשי — בחירה בין תבניות מוכנות.
const VARIANTS: Record<string, string> = { cards: "כרטיסים עם תמונה (כמו דף הבית)", compact: "קומפקטי — טקסט בלבד" };

const box: React.CSSProperties = { background: "white", border: "1px solid rgba(139,111,71,0.16)", borderRadius: 14, padding: 18 };
const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#6B5C4A", marginBottom: 5 };
const input: React.CSSProperties = { width: "100%", border: "1.5px solid rgba(139,111,71,0.25)", borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", background: "white" };

export default function AdminSliders() {
  const { data: sliders = [], isLoading } = useContentSliders();
  const createSlider = useCreateSlider();
  const updateSlider = useUpdateSlider();
  const deleteSlider = useDeleteSlider();

  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [placement, setPlacement] = useState("home");
  const [variant, setVariant] = useState("cards");
  const [term, setTerm] = useState("");
  const [source, setSource] = useState<{ id: string; title: string } | null>(null);
  const { data: results = [], isFetching } = useSeriesSearch(term);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = () => {
    if (!title.trim() || !source) {
      setMsg("צריך כותרת + סדרה/קטגוריה");
      return;
    }
    createSlider.mutate(
      {
        title: title.trim(),
        eyebrow: eyebrow.trim() || null,
        placement,
        variant,
        source_id: source.id,
        sort_order: sliders.filter((s) => s.placement === placement).length,
      },
      {
        onSuccess: () => {
          setMsg("הסליידר נוצר ✓ — כבר חי בעמוד");
          setTitle(""); setEyebrow(""); setTerm(""); setSource(null);
        },
        onError: (e: Error) => setMsg(`שגיאה: ${e.message}`),
      }
    );
  };

  return (
    <AdminLayout>
      <div dir="rtl" style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>סליידרים</h1>
          <p style={{ fontSize: 13.5, color: "#6B5C4A", margin: "6px 0 0" }}>
            סליידר תוכן לכל סדרה או קטגוריה — בדף הבית או באגף המורים. השיעורים מתעדכנים אוטומטית (החדשים קודם, עד 12).
          </p>
        </div>

        {/* יצירה */}
        <div style={box}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> סליידר חדש
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={label}>כותרת הסליידר</label>
              <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder='למשל: "מסע אל ירושלים"' />
            </div>
            <div>
              <label style={label}>שורת-על (רשות)</label>
              <input style={input} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder='למשל: "מומלץ החודש"' />
            </div>
            <div>
              <label style={label}>מיקום</label>
              <select style={input} value={placement} onChange={(e) => setPlacement(e.target.value)}>
                {Object.entries(PLACEMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>עיצוב</label>
              <select style={input} value={variant} onChange={(e) => setVariant(e.target.value)}>
                {Object.entries(VARIANTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>סדרה / קטגוריה</label>
              {source ? (
                <div style={{ ...input, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{source.title}</span>
                  <button onClick={() => setSource(null)} style={{ border: "none", background: "none", color: "#A33", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>החלף</button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", top: 12, insetInlineEnd: 12, color: "#A69882" }} />
                  <input style={input} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="חיפוש לפי שם…" />
                  {term.trim().length >= 2 && (
                    <div style={{ position: "absolute", top: "100%", insetInline: 0, zIndex: 5, background: "white", border: "1px solid rgba(139,111,71,0.25)", borderRadius: 10, marginTop: 4, maxHeight: 240, overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}>
                      {isFetching && <div style={{ padding: 10, fontSize: 13, color: "#A69882" }}>מחפש…</div>}
                      {!isFetching && results.length === 0 && <div style={{ padding: 10, fontSize: 13, color: "#A69882" }}>לא נמצאו סדרות</div>}
                      {results.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { setSource({ id: r.id, title: r.title }); setTerm(""); }}
                          style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "right" }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                          <span style={{ fontSize: 11.5, color: "#A69882", flexShrink: 0 }}>
                            {r.status === "category" ? "קטגוריה · " : ""}{r.lesson_count ?? 0} שיעורים
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <button
              onClick={submit}
              disabled={createSlider.isPending}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 10, border: "none", background: "#1A2744", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
            >
              {createSlider.isPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
              צור סליידר
            </button>
            {msg && <span style={{ fontSize: 13, color: msg.startsWith("שגיאה") ? "#A33" : "#3C6E47", fontWeight: 600 }}>{msg}</span>}
          </div>
        </div>

        {/* רשימה */}
        <div style={box}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>הסליידרים הקיימים</div>
          {isLoading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
          {!isLoading && sliders.length === 0 && (
            <div style={{ fontSize: 13.5, color: "#A69882" }}>אין עדיין סליידרים — צרו את הראשון למעלה.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sliders.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(139,111,71,0.14)", borderRadius: 10, padding: "10px 14px", opacity: s.is_active ? 1 : 0.55 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {s.title}
                    {s.eyebrow && <span style={{ fontWeight: 400, color: "#6B5C4A", fontSize: 12.5 }}> · {s.eyebrow}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#A69882" }}>
                    {PLACEMENTS[s.placement] ?? s.placement} · מקור: {s.sourceTitle ?? s.source_id}
                    {!s.is_active && " · מוסתר"}
                  </div>
                </div>
                <select
                  title="עיצוב הסליידר"
                  value={s.variant ?? "cards"}
                  onChange={(e) => updateSlider.mutate({ id: s.id, variant: e.target.value as "cards" | "compact" })}
                  style={{ border: "1px solid rgba(139,111,71,0.2)", background: "white", borderRadius: 8, padding: "5px 8px", fontSize: 12, fontFamily: "inherit", color: "#6B5C4A", maxWidth: 170 }}
                >
                  {Object.entries(VARIANTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button
                  title={s.is_active ? "הסתר" : "הצג"}
                  onClick={() => updateSlider.mutate({ id: s.id, is_active: !s.is_active })}
                  style={{ border: "1px solid rgba(139,111,71,0.2)", background: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#6B5C4A" }}
                >
                  {s.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  title="מחיקה"
                  onClick={() => { if (window.confirm(`למחוק את הסליידר "${s.title}"?`)) deleteSlider.mutate(s.id); }}
                  style={{ border: "1px solid rgba(163,51,51,0.25)", background: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#A33" }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AdminLayout>
  );
}
