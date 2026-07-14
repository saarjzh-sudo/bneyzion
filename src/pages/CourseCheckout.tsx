/**
 * /course/:slug/checkout — דף רכישת קורס מסודר (סער 14.7, במקום הפופאפ).
 *
 * עמוד מלא בשפת החנות: סיכום הקורס מצד אחד, טופס פרטים ותשלום Grow מצד שני.
 * מייל = חובה (בלעדיו אין גישה): אחרי התשלום ה-webhook מעניק tag לפי המייל,
 * והתחברות Google עם אותו מייל פותחת את הקורס (linkPendingAccessTags).
 * המחיר נקרא מ-community_courses.price (payment_products סגור RLS לקליינט);
 * החיוב עצמו עובר דרך create-payment בשרת עם payment_products.id === slug.
 */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Loader2, Lock, Shield } from "lucide-react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { Seo } from "@/components/seo/Seo";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useWeeklyBookBySlug } from "@/hooks/useCommunity";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useToast } from "@/hooks/use-toast";

const field: React.CSSProperties = {
  width: "100%", height: 46, borderRadius: radii.md, border: "1.5px solid rgba(139,111,71,0.3)",
  background: "white", padding: "0 0.9rem", fontFamily: fonts.body, fontSize: "0.95rem", color: colors.textDark,
};
const label: React.CSSProperties = {
  display: "block", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.82rem",
  color: colors.textMid, marginBottom: 6,
};

export default function CourseCheckout() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: course, isLoading: courseLoading } = useWeeklyBookBySlug(slug);
  const { startPayment, isLoading: paying, isReady, lastOrderIdRef } = useGrowPayment();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);

  const price = Number((course as any)?.price ?? 0);
  const purchasable = !!course && course.status === "active" && price > 0 && slug.startsWith("book-");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      toast({ title: "יש למלא שם, טלפון ואימייל", variant: "destructive" });
      return;
    }
    if (!tosAccepted) {
      toast({ title: "יש לאשר את התקנון לפני התשלום", variant: "destructive" });
      return;
    }
    if (!isReady) {
      toast({ title: "מערכת התשלומים נטענת — נסו שוב בעוד רגע", variant: "destructive" });
      return;
    }
    try {
      await startPayment({
        sum: price,
        description: `קורס ${course!.title}`,
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        email: email.trim(),
        type: "product",
        thankYouType: "store",
        meta: {
          product: slug, // payment_products.id (book-*) — מסלול הקורסים, נפרד מהחנות
          tos_accepted: true,
          tos_accepted_at: new Date().toISOString(),
        } as any,
      });
      const orderId = lastOrderIdRef.current;
      navigate(`/thank-you?type=store${orderId ? `&orders=${orderId}` : ""}`);
    } catch (err: any) {
      toast({ title: "התשלום נכשל", description: err?.message || "נסו שוב או כתבו לנו", variant: "destructive" });
    }
  }

  if (courseLoading) {
    return (
      <DesignLayout sidebar={false}>
        <div style={{ padding: "8rem 0", display: "flex", justifyContent: "center" }}>
          <Loader2 style={{ width: 30, height: 30, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  if (!purchasable) {
    return (
      <DesignLayout sidebar={false}>
        <div dir="rtl" style={{ padding: "5rem 1.5rem", textAlign: "center", background: colors.parchment, minHeight: "60vh" }}>
          <h1 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.4rem", color: colors.textDark, marginBottom: 10 }}>
            הקורס אינו זמין לרכישה כרגע
          </h1>
          <Link to={`/course/${slug}`} style={{ color: colors.goldDark, fontFamily: fonts.body, fontWeight: 700 }}>
            חזרה לעמוד הקורס
          </Link>
        </div>
      </DesignLayout>
    );
  }

  return (
    <DesignLayout sidebar={false}>
      <Seo title={`רכישת קורס ${course!.title}`} noindex />
      <div dir="rtl" style={{ background: colors.parchment, minHeight: "100vh", padding: "2.5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>

          <Link to={`/course/${slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, textDecoration: "none", marginBottom: "1.25rem" }}>
            <ArrowRight size={15} /> חזרה לעמוד הקורס
          </Link>

          <h1 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", color: colors.textDark, margin: "0 0 1.5rem" }}>
            רכישת קורס {course!.title}
          </h1>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", alignItems: "start" }}>

            {/* ── סיכום הזמנה ── */}
            <section style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.14)", boxShadow: shadows.cardSoft, overflow: "hidden" }}>
              {course!.image_url && (
                <img src={course!.image_url} alt={course!.title} style={{ width: "100%", aspectRatio: "16/8", objectFit: "cover" }} />
              )}
              <div style={{ padding: "1.4rem 1.6rem" }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark }}>
                  קורס {course!.title}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, margin: "2px 0 10px" }}>
                  מאת הרב יואב אוריאל · קורס מוקלט
                </div>
                {course!.description && (
                  <p style={{ fontFamily: fonts.body, fontSize: "0.86rem", color: colors.textMid, lineHeight: 1.7, margin: "0 0 12px" }}>
                    {course!.description}
                  </p>
                )}
                <ul style={{ margin: "0 0 14px", paddingInlineStart: "1.1rem", fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMid, lineHeight: 1.9 }}>
                  <li>כל השיעורים, הסיכומים וההרחבות</li>
                  <li>גישה מלאה לתמיד, בקצב שלכם</li>
                  <li>נפתח אוטומטית אחרי התשלום</li>
                </ul>
                <div style={{ borderTop: "1px solid rgba(139,111,71,0.14)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: fonts.body, fontWeight: 700, color: colors.textMid }}>סה״כ לתשלום</span>
                  <span style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.4rem", color: colors.goldDeep }}>₪{price.toLocaleString()}</span>
                </div>
              </div>
            </section>

            {/* ── טופס תשלום ── */}
            <form onSubmit={handleSubmit} style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.14)", boxShadow: shadows.cardSoft, padding: "1.6rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", marginBottom: "0.9rem" }}>
                <div>
                  <label style={label} htmlFor="cc-first">שם פרטי *</label>
                  <input id="cc-first" style={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label style={label} htmlFor="cc-last">שם משפחה *</label>
                  <input id="cc-last" style={field} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div style={{ marginBottom: "0.9rem" }}>
                <label style={label} htmlFor="cc-phone">טלפון *</label>
                <input id="cc-phone" style={{ ...field, direction: "ltr", textAlign: "right" }} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" required />
              </div>
              <div style={{ marginBottom: "0.9rem" }}>
                <label style={label} htmlFor="cc-email">אימייל *</label>
                <input id="cc-email" style={{ ...field, direction: "ltr", textAlign: "right" }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
                <p style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle, margin: "5px 0 0" }}>
                  הקורס נפתח לפי המייל הזה — איתו מתחברים אחרי הרכישה.
                </p>
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMid, marginBottom: "1.1rem", cursor: "pointer" }}>
                <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} style={{ marginTop: 3 }} />
                <span>
                  קראתי ואני מאשר/ת את <Link to="/terms" target="_blank" style={{ color: colors.goldDark, textDecoration: "underline" }}>תקנון האתר ומדיניות הפרטיות</Link>, ומלאו לי 18 שנים.
                </span>
              </label>
              <button
                type="submit"
                disabled={paying}
                style={{ width: "100%", padding: "1rem", borderRadius: radii.lg, border: "none", cursor: paying ? "wait" : "pointer", background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1.05rem", boxShadow: shadows.goldGlow, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: paying ? 0.75 : 1 }}
              >
                {paying ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Lock size={16} />}
                {paying ? "מעבירים לתשלום..." : `לתשלום מאובטח — ₪${price.toLocaleString()}`}
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textSubtle }}>
                <Shield size={13} /> תשלום מאובטח דרך Grow / Meshulam · קבלה נשלחת אוטומטית
              </div>
            </form>
          </div>
        </div>
      </div>
    </DesignLayout>
  );
}
