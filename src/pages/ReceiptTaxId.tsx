/**
 * /receipt — "קבלה עם תעודת זהות": תורם שכבר תרם דרך האתר מוסר ת"ז כדי שנפיק
 * לו קבלה מתוקנת המוכרת לזיכוי מס (סעיף 46). תיקון קבלות 6.9.2026 — ראו
 * api/donations/tax-id.ts. מעוצב בשפת הקמפיין (parchment/navy/gold), RTL, mobile-first.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { CheckCircle2, Receipt } from "lucide-react";
import { normalizeIsraeliId } from "@/lib/israeliId";

const C = { navy: "#1A2744", gold: "#8B6F47", parchment: "#FAF6F0", text: "#2D1F0E", muted: "#6B5C4A" };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid hsl(38 30% 82%)",
  background: "#fff", fontSize: 16, color: C.text, outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBlockEnd: 6 };

type Result = { matched: number; donations: { date: string; amount: number }[] };

export default function ReceiptTaxId() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim() && !email.trim()) return setError("יש להזין טלפון או כתובת מייל, כפי שמילאתם בתרומה.");
    if (!normalizeIsraeliId(taxId)) return setError("מספר תעודת הזהות לא תקין. בדקו את הספרות.");
    setBusy(true);
    try {
      const res = await fetch("/api/donations/tax-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), email: email.trim(), taxId: taxId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "שגיאה זמנית, נסו שוב.");
      setResult(data as Result);
    } catch (err: any) {
      setError(err?.message || "שגיאה זמנית, נסו שוב.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DesignLayout sidebar={false}>
      <div dir="rtl" style={{ background: C.parchment, minHeight: "70vh", padding: "40px 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: "#fff", borderRadius: 18, border: "1px solid hsl(38 30% 88%)", padding: "28px 24px", boxShadow: "0 10px 30px rgba(26,39,68,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBlockEnd: 10 }}>
            <Receipt size={26} color={C.gold} aria-hidden />
            <h1 style={{ margin: 0, fontSize: 24, color: C.navy, fontWeight: 800 }}>קבלה עם תעודת זהות</h1>
          </div>
          <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6, marginBlockStart: 0 }}>
            תרמתם לבני ציון דרך האתר? כדי שהקבלה תוכר לזיכוי מס (סעיף 46) היא צריכה לכלול מספר תעודת זהות.
            מלאו כאן את הפרטים, ונפיק לכם קבלה מתוקנת. לא חובה, רק למי שרוצה זיכוי מס.
          </p>

          {result ? (
            <div style={{ marginBlockStart: 18, padding: 16, borderRadius: 12, background: "hsl(150 40% 96%)", border: "1px solid hsl(150 40% 85%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#065f46", fontWeight: 700 }}>
                <CheckCircle2 size={20} aria-hidden /> תודה! קיבלנו את הפרטים.
              </div>
              <p style={{ margin: "8px 0 0", color: C.text, fontSize: 15, lineHeight: 1.6 }}>
                מצאנו {result.matched === 1 ? "תרומה אחת" : `${result.matched} תרומות`} על שמכם. הקבלה המתוקנת תישלח למייל שמסרתם בתרומה בימים הקרובים.
              </p>
              <ul style={{ margin: "10px 0 0", paddingInlineStart: 18, color: C.muted, fontSize: 14 }}>
                {result.donations.map((d, i) => (
                  <li key={i}>{new Date(d.date).toLocaleDateString("he-IL")} · ₪{d.amount.toLocaleString("he-IL")}</li>
                ))}
              </ul>
              <div style={{ marginBlockStart: 16 }}>
                <Link to="/" style={{ color: C.gold, fontWeight: 700 }}>חזרה לאתר התנ"ך</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, marginBlockStart: 18 }}>
              <div>
                <label style={labelStyle} htmlFor="r-phone">טלפון (כפי שמילאתם בתרומה)</label>
                <input id="r-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" inputMode="tel" style={{ ...inputStyle, textAlign: "right" }} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="r-email">או כתובת מייל</label>
                <input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." dir="ltr" style={{ ...inputStyle, textAlign: "right" }} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="r-tz">מספר תעודת זהות *</label>
                <input id="r-tz" type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="9 ספרות" dir="ltr" inputMode="numeric" maxLength={11} required style={{ ...inputStyle, textAlign: "right" }} />
              </div>
              {error && (
                <div role="alert" style={{ padding: "10px 14px", background: "hsl(0 65% 96%)", border: "1px solid hsl(0 60% 85%)", borderRadius: 10, fontSize: 14, color: "hsl(0 65% 42%)" }}>{error}</div>
              )}
              <button type="submit" disabled={busy} style={{ marginBlockStart: 4, padding: "13px 18px", borderRadius: 12, border: "none", background: C.navy, color: "#fff", fontSize: 16, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "שולח..." : "שלחו לי קבלה מתוקנת"}
              </button>
              <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                הפרטים משמשים רק להפקת הקבלה. מעכשיו אפשר למלא תעודת זהות כבר בטופס התרומה, והקבלה תצא נכונה מיד.
              </p>
            </form>
          )}
        </div>
      </div>
    </DesignLayout>
  );
}
