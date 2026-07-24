/**
 * TrialStrip — רצועת "האתר בהרצה": דיווח תקלות + הצעת תוכן (רמה 27→28).
 *
 * רצועה דקה מתחת להדר. שני כפתורים (יואב 24.7 11:30):
 *   1. "דיווח על תקלה" — וואטסאפ מהיר לסער או טופס קצר (kind='bug').
 *   2. "הצעת תוכן לאתר" — טופס לקהל/רבנים/מורים להציע תכנים (kind='content').
 * שניהם נשמרים ב-site_feedback ונקראים ב-/admin/feedback.
 *
 * כיבוי בעת העלייה לאוויר: מרכז השליטה → "רצועת הרצה" → מרוקנים את הטקסט.
 */
import { useState, type ReactNode } from "react";
import { MessageCircle, X, Send, Megaphone, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteCopy } from "@/hooks/useSiteSettings";
import { colors, fonts, radii } from "@/lib/designTokens";

const REPORT_WA = "972526018772"; // סער — "בתקופה הראשונה ממש פשוט וואטסאפ אליי" (22.7 17:49)

type FormKind = "bug" | "content";

const KIND_COPY: Record<FormKind, { title: string; placeholder: string; wa: string; thanks: string }> = {
  bug: {
    title: "נתקלתם בתקלה? יש הערה?",
    placeholder: "מה ראיתם? באיזה עמוד? כל פרט עוזר",
    wa: "דיווח מאתר בני ציון 🛠️",
    thanks: "תודה רבה! הדיווח התקבל 🙏",
  },
  content: {
    title: "יש לכם תוכן שמתאים לאתר?",
    placeholder: "איזה תוכן תרצו להציע? שיעור, סדרה, מאמר — של מי ועל מה",
    wa: "הצעת תוכן לאתר בני ציון 💡",
    thanks: "תודה רבה! ההצעה התקבלה ונעבור עליה 🙏",
  },
};

export default function TrialStrip() {
  const copy = useSiteCopy();
  const [open, setOpen] = useState<FormKind | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const text = (copy("copy.trial.strip_text", "האתר בגרסת הרצה — נשמח לכל הערה או דיווח על תקלה") || "").trim();
  // כיבוי בעת העלייה לאוויר: כותבים "כבוי" במרכז השליטה (ערך ריק חוזר לברירת-המחדל)
  if (!text || text === "כבוי" || text.toLowerCase() === "off") return null;

  const kind: FormKind = open ?? "bug";
  const kc = KIND_COPY[kind];

  const waHref = `https://wa.me/${REPORT_WA}?text=${encodeURIComponent(
    `${kc.wa}\nעמוד: ${typeof window !== "undefined" ? window.location.href : ""}\n\n`
  )}`;

  const openForm = (k: FormKind) => {
    setOpen(k);
    setState("idle");
  };

  const submit = async () => {
    if (message.trim().length < 3) return;
    setState("sending");
    const { error } = await (supabase as any).from("site_feedback").insert([{
      message: message.trim(),
      name: name.trim() || null,
      phone: phone.trim() || null,
      page: window.location.pathname + window.location.search,
      kind,
    }]);
    if (error) setState("error");
    else {
      setState("sent");
      setMessage(""); setName(""); setPhone("");
    }
  };

  const stripBtn = (label: string, icon: ReactNode, k: FormKind) => (
    <button
      onClick={() => openForm(k)}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "rgba(232,213,160,0.16)", border: "1px solid rgba(232,213,160,0.4)", color: "#E8D5A0", borderRadius: 999, padding: "0.15rem 0.85rem", fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <>
      <div
        dir="rtl"
        style={{
          background: "linear-gradient(90deg, #2D3A26, #3d4a33)",
          color: "rgba(255,255,255,0.92)",
          padding: "0.4rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          flexWrap: "wrap",
          fontFamily: fonts.body,
          fontSize: "0.8rem",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <Megaphone size={13} style={{ color: colors.goldShimmer }} />
          {text}
        </span>
        {stripBtn("דיווח על תקלה", null, "bug")}
        {stripBtn("הצעת תוכן לאתר", <Lightbulb size={12} />, "content")}
      </div>

      {open && (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label={kc.title}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,15,8,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}
        >
          <div style={{ background: "white", borderRadius: radii.xl, width: "min(440px, 96vw)", padding: "1.5rem", boxShadow: "0 24px 70px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.1rem", color: colors.textDark, margin: 0 }}>
                {kc.title}
              </h2>
              <button onClick={() => setOpen(null)} aria-label="סגירה" style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}>
                <X size={18} />
              </button>
            </div>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#25D366", color: "white", borderRadius: radii.lg, padding: "0.7rem 1rem", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", marginBottom: "1rem" }}
            >
              <MessageCircle size={16} /> {kind === "bug" ? "דיווח מהיר בוואטסאפ" : "שליחה מהירה בוואטסאפ"}
            </a>

            <div style={{ textAlign: "center", fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle, margin: "0 0 0.75rem" }}>
              או השאירו הודעה כאן:
            </div>

            {state === "sent" ? (
              <div style={{ textAlign: "center", fontFamily: fonts.body, color: "#3C6E47", fontWeight: 700, padding: "0.75rem 0" }}>
                {kc.thanks}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={kc.placeholder}
                  rows={3}
                  style={{ width: "100%", border: "1.5px solid rgba(139,111,71,0.25)", borderRadius: radii.md, padding: "0.6rem 0.8rem", fontFamily: fonts.body, fontSize: "0.88rem", resize: "vertical" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם (רשות)" style={{ border: "1.5px solid rgba(139,111,71,0.25)", borderRadius: radii.md, padding: "0.5rem 0.8rem", fontFamily: fonts.body, fontSize: "0.85rem" }} />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="טלפון (רשות)" style={{ border: "1.5px solid rgba(139,111,71,0.25)", borderRadius: radii.md, padding: "0.5rem 0.8rem", fontFamily: fonts.body, fontSize: "0.85rem" }} />
                </div>
                <button
                  onClick={submit}
                  disabled={state === "sending" || message.trim().length < 3}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: colors.navyDeep, color: "white", border: "none", borderRadius: radii.lg, padding: "0.65rem 1rem", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", opacity: state === "sending" ? 0.7 : 1 }}
                >
                  <Send size={14} /> {state === "sending" ? "שולח…" : kind === "bug" ? "שליחת הדיווח" : "שליחת ההצעה"}
                </button>
                {state === "error" && (
                  <div style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "#A33", textAlign: "center" }}>
                    השליחה נכשלה — אפשר לשלוח בוואטסאפ למעלה
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
