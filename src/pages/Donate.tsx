/**
 * /donate — Donation page, production v3.
 *
 * Layout: destination page — no sidebar, full canvas.
 * Desktop: 2-column. Story + impact left (RTL: right), sticky form card right (RTL: left).
 * Mobile:  single column, form first.
 *
 * Grow integration: useGrowPayment hook → /api/grow/create-payment
 *   - type="donation" → GROW_PAGECODE_DONATIONS + GROW_USER_ID_DONATIONS
 *   - type="directDebit" → horaatKeva flow (same merchant)
 *
 * Bugs fixed vs original:
 *   1. checkbox tosAccepted dep array — useCallback includes tosAccepted ✓
 *   2. layout — sidebar={false}, wide container, sticky form ✓
 */
import { useState, useCallback } from "react";
import {
  Heart, Flame, Shield, Award, CheckCircle2,
  Users, BookOpen, Mic, Loader2, ShieldCheck,
  Star, Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useRecentDonations } from "@/hooks/useDonations";
import { useAuth } from "@/contexts/AuthContext";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useSEO } from "@/hooks/useSEO";

import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PRESETS = [50, 100, 180, 360, 540, 1000];

const typeLabels: Record<string, string> = {
  iluy_neshama: "לעילוי נשמת",
  refua: "לרפואת",
  regular: "",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "לפני דקות";
  if (hours < 24) return `לפני ${hours} שעות`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

const Donate = () => {
  useSEO({
    title: "תרומות — בני ציון",
    description:
      "תרמו לעמותת בני ציון ותסייעו בהפצת תנ\"ך בישראל. כל תרומה מקרבת עוד יהודי ללימוד התנ\"ך.",
    url: "https://bneyzion.co.il/donate",
  });

  // ── Form state ────────────────────────────────
  const [amount, setAmount] = useState<number>(180);
  const [recurring, setRecurring] = useState(false);
  const [dedication, setDedication] = useState("");
  const [donationType, setDonationType] = useState<"regular" | "iluy_neshama" | "refua">("regular");
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);

  // ── Hooks ─────────────────────────────────────
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: recentDonations } = useRecentDonations();
  const {
    startPayment,
    isLoading: paymentLoading,
    isReady: paymentReady,
    error: paymentError,
  } = useGrowPayment();

  const isProcessing = paymentLoading;

  // ── Submit handler ────────────────────────────
  const handleDonate = useCallback(async () => {
    if (!amount || amount < 1) {
      toast({ title: "נא לבחור סכום תרומה", variant: "destructive" });
      return;
    }
    if (!donorName || !donorName.trim().includes(" ")) {
      toast({ title: "נא להזין שם מלא (שם פרטי ומשפחה)", variant: "destructive" });
      return;
    }
    if (!donorPhone || !/^05\d{8}$/.test(donorPhone.replace(/[-\s]/g, ""))) {
      toast({ title: "נא להזין מספר טלפון תקין (05XXXXXXXX)", variant: "destructive" });
      return;
    }
    if (!tosAccepted) {
      toast({ title: "יש לאשר את התקנון לפני המשך לתשלום", variant: "destructive" });
      return;
    }

    try {
      const dedicationText =
        donationType !== "regular" && dedication
          ? ` - ${donationType === "iluy_neshama" ? "לעילוי נשמת" : "לרפואת"} ${dedication}`
          : "";

      await startPayment({
        sum: amount,
        description: `תרומה לבני ציון${dedicationText}`,
        fullName: donorName,
        phone: donorPhone,
        email: donorEmail,
        type: recurring ? "directDebit" : "donation",
        thankYouType: "donation",
        donationMeta: {
          is_monthly: recurring,
          dedication_type: donationType,
          dedication_name: dedication || undefined,
          donor_email: donorEmail || undefined,
          user_id: user?.id,
        },
      });

      toast({
        title: "חלון תשלום נפתח!",
        description: "השלימו את התשלום בחלון שנפתח. תודה רבה!",
      });

      // Reset form
      setAmount(180);
      setRecurring(false);
      setDedication("");
      setDonorName("");
      setDonorPhone("");
      setDonorEmail("");
      setDonationType("regular");
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  }, [amount, recurring, donationType, dedication, donorName, donorPhone, donorEmail, tosAccepted, user, startPayment, toast]);

  return (
    <Layout sidebar={false}>
      {/* ── Hero ──────────────────────────────────── */}
      <section
        style={{
          background: `linear-gradient(160deg, ${colors.navyDeep} 0%, #0F1A30 55%, ${colors.mahogany} 100%)`,
          padding: "5rem 2rem 4.5rem",
          textAlign: "center",
          color: "white",
        }}
        dir="rtl"
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.3rem 1rem",
              borderRadius: radii.pill,
              border: `1px solid rgba(196,162,101,0.4)`,
              color: colors.goldShimmer,
              fontFamily: fonts.body,
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              marginBottom: "1.5rem",
            }}
          >
            תורמים מאמינים
          </span>

          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "clamp(2rem, 4.5vw, 3rem)",
              lineHeight: 1.25,
              margin: "0 0 1.25rem",
              color: "white",
            }}
          >
            כל שיעור באתר נבנה
            <br />
            <span style={{ color: colors.goldShimmer }}>בידי מי שאיכפת לו</span>
          </h1>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.72)",
              margin: "0 auto",
              maxWidth: 560,
            }}
          >
            האתר פועל בזכות תרומות של אנשים פרטיים שמאמינים שתורה צריכה
            להיות נגישה לכולם — ללא פרסומות, ללא מנויים.
          </p>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────── */}
      <div
        style={{
          background: "white",
          borderBottom: `1px solid ${colors.parchmentDeep}`,
          padding: "1.25rem 2rem",
        }}
        dir="rtl"
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            gap: "clamp(2rem, 6vw, 5rem)",
            flexWrap: "wrap" as const,
          }}
        >
          <StatChip icon={<BookOpen size={18} />} value="11,800+" label="שיעורים באתר" />
          <StatChip icon={<Users size={18} />} value="200+" label="רבנים ומרצים" />
          <StatChip icon={<Mic size={18} />} value="שנות" label="הקלטה ועריכה" />
        </div>
      </div>

      {/* ── Main 2-column section ─────────────────── */}
      <section
        style={{
          background: colors.parchment,
          padding: "4.5rem 2rem 5rem",
        }}
        dir="rtl"
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr minmax(360px, 420px)",
            gap: "3.5rem",
            alignItems: "start",
          }}
          className="donate-grid"
        >
          {/* ─── Story + impact column ─────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>

            {/* Why donate */}
            <div>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "clamp(1.5rem, 2.8vw, 2rem)",
                  color: colors.textDark,
                  margin: "0 0 1rem",
                }}
              >
                למה כדאי לתמוך?
              </h2>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "1rem",
                  lineHeight: 1.85,
                  color: colors.textMid,
                  margin: "0 0 1.5rem",
                }}
              >
                אנחנו לא ארגון ממומן. כל שיעור שעולה לאתר עבר הקלטה, עריכה,
                וקידוד — תהליך שעולה זמן וכסף. התרומה שלך מאפשרת לנו להמשיך
                לבנות, לשדרג, ולהנגיש תוכן לכלל ישראל.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <ImpactRow amount="50₪" desc="הקלטה ועריכה של שיעור אחד" />
                <ImpactRow amount="180₪" desc="עריכת מצגת שיעור עם איורים" />
                <ImpactRow amount="360₪" desc="הסבת שיעור לתסריט וקריינות" />
                <ImpactRow amount="1,000₪" desc="הפקת פרק שלם בקורס דיגיטלי" />
              </div>
            </div>

            {/* Memorial */}
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.navyDeep}, #0F1A30)`,
                borderRadius: radii.xl,
                padding: "2.25rem",
                color: "white",
              }}
            >
              <Flame size={28} style={{ color: colors.goldShimmer, marginBottom: "1rem" }} />
              <h3
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: "1.2rem",
                  fontStyle: "italic",
                  color: "white",
                  margin: "0 0 0.75rem",
                }}
              >
                לעילוי נשמת בן ציון חיים הנמן הי״ד
                <br />
                וסעדיה יעקב בן חיים הי״ד
              </h3>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.92rem",
                  lineHeight: 1.75,
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                }}
              >
                האתר מוקדש לזכרם של חיילי בני ציון שנפלו על קידוש השם.
                כל שיעור שתורמים נצרב כשעת לימוד לעילוי נשמתם.
              </p>
            </div>

            {/* Trust signals */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
              }}
            >
              <TrustCard icon={<Shield size={20} />} label="תשלום מאובטח" sub="SSL / PCI" />
              <TrustCard icon={<CheckCircle2 size={20} />} label="זיכוי מס 46%" sub="עמותה מוכרת" />
              <TrustCard icon={<Award size={20} />} label="קבלה מיידית" sub="למייל שלך" />
            </div>

            {/* Recent donors */}
            {recentDonations && recentDonations.length > 0 && (
              <div
                style={{
                  background: "white",
                  borderRadius: radii.xl,
                  padding: "1.75rem",
                  border: `1px solid rgba(139,111,71,0.1)`,
                  boxShadow: shadows.cardSoft,
                }}
              >
                <h3
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: colors.textDark,
                    margin: "0 0 1rem",
                  }}
                >
                  תורמים אחרונים
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {recentDonations.slice(0, 5).map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        fontSize: "0.88rem",
                      }}
                    >
                      <Heart size={14} style={{ color: colors.goldDark, marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.textDark }}>
                          {d.donor_name || "אנונימי"}
                        </span>
                        <span style={{ color: colors.textMuted }}> תרמ/ה </span>
                        <span style={{ fontFamily: fonts.display, fontWeight: 800, color: colors.goldDark }}>
                          ₪{Number(d.amount).toLocaleString()}
                        </span>
                        {d.dedication_name && (
                          <span style={{ color: colors.textSubtle, fontSize: "0.78rem", display: "block" }}>
                            {typeLabels[d.dedication_type]} {d.dedication_name}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.72rem", color: colors.textSubtle, flexShrink: 0 }}>
                        {timeAgo(d.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Sticky form card ──────────────────── */}
          <div style={{ position: "sticky", top: "5.5rem" }}>
            <DonateFormCard
              amount={amount}
              recurring={recurring}
              dedication={dedication}
              donationType={donationType}
              donorName={donorName}
              donorPhone={donorPhone}
              donorEmail={donorEmail}
              tosAccepted={tosAccepted}
              isProcessing={isProcessing}
              paymentReady={paymentReady}
              paymentError={paymentError}
              onAmount={setAmount}
              onRecurring={setRecurring}
              onDedication={setDedication}
              onDonationType={setDonationType}
              onDonorName={setDonorName}
              onDonorPhone={setDonorPhone}
              onDonorEmail={setDonorEmail}
              onTosAccepted={setTosAccepted}
              onSubmit={handleDonate}
            />
          </div>
        </div>
      </section>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          .donate-grid {
            grid-template-columns: 1fr !important;
          }
          .donate-grid > div:last-child {
            order: -1;
          }
          .donate-grid > div:last-child > div {
            position: static !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default Donate;

// ─────────────────────────────────────────────
// DonateFormCard — sticky right column
// ─────────────────────────────────────────────

interface DonateFormCardProps {
  amount: number;
  recurring: boolean;
  dedication: string;
  donationType: "regular" | "iluy_neshama" | "refua";
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  tosAccepted: boolean;
  isProcessing: boolean;
  paymentReady: boolean;
  paymentError: string | null;
  onAmount: (n: number) => void;
  onRecurring: (b: boolean) => void;
  onDedication: (s: string) => void;
  onDonationType: (t: "regular" | "iluy_neshama" | "refua") => void;
  onDonorName: (s: string) => void;
  onDonorPhone: (s: string) => void;
  onDonorEmail: (s: string) => void;
  onTosAccepted: (b: boolean) => void;
  onSubmit: () => void;
}

function DonateFormCard({
  amount,
  recurring,
  dedication,
  donationType,
  donorName,
  donorPhone,
  donorEmail,
  tosAccepted,
  isProcessing,
  paymentReady,
  paymentError,
  onAmount,
  onRecurring,
  onDedication,
  onDonationType,
  onDonorName,
  onDonorPhone,
  onDonorEmail,
  onTosAccepted,
  onSubmit,
}: DonateFormCardProps) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "2.25rem 2rem",
        border: `1px solid rgba(139,111,71,0.14)`,
        boxShadow: "0 20px 60px rgba(45,31,14,0.10), 0 4px 16px rgba(45,31,14,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
      dir="rtl"
    >
      {/* Form header */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.3rem 0.9rem",
            borderRadius: radii.pill,
            background: `rgba(196,162,101,0.12)`,
            color: colors.goldDark,
            fontFamily: fonts.body,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            marginBottom: "0.75rem",
          }}
        >
          <Flame size={11} /> תרומה לאתר
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: "1.45rem",
            color: colors.textDark,
            margin: 0,
          }}
        >
          בחר את גובה התרומה
        </h2>
      </div>

      {/* Recurring toggle */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex",
            padding: 4,
            background: colors.parchmentDark,
            borderRadius: radii.md,
          }}
        >
          {[
            { label: "חד פעמי", val: false },
            { label: "הוראת קבע", val: true },
          ].map(({ label, val }) => {
            const active = recurring === val;
            return (
              <button
                key={label}
                onClick={() => onRecurring(val)}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: radii.sm,
                  border: "none",
                  background: active ? "white" : "transparent",
                  color: active ? colors.textDark : colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: active ? shadows.cardSoft : "none",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.6rem",
        }}
      >
        {PRESETS.map((p) => {
          const active = amount === p;
          return (
            <button
              key={p}
              onClick={() => onAmount(p)}
              style={{
                padding: "0.9rem 0.5rem",
                borderRadius: radii.lg,
                border: active
                  ? `2px solid ${colors.goldDark}`
                  : `1.5px solid rgba(139,111,71,0.2)`,
                background: active ? `rgba(196,162,101,0.09)` : "white",
                color: active ? colors.goldDark : colors.textDark,
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: "1.2rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p.toLocaleString("he-IL")}₪
            </button>
          );
        })}
      </div>

      {/* Custom amount */}
      <div>
        <label
          style={{
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            color: colors.textMuted,
            fontWeight: 600,
            display: "block",
            marginBottom: "0.4rem",
          }}
        >
          או הקלד סכום אחר
        </label>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              insetInlineEnd: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: fonts.display,
              fontSize: "1.1rem",
              color: colors.textMuted,
              pointerEvents: "none",
            }}
          >
            ₪
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmount(Number(e.target.value) || 0)}
            style={{
              width: "100%",
              padding: "0.85rem 1rem 0.85rem 2.5rem",
              borderRadius: radii.md,
              border: `1.5px solid ${colors.parchmentDeep}`,
              background: "white",
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "1.1rem",
              color: colors.textDark,
              outline: "none",
              direction: "rtl",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Dedication type */}
      <div>
        <label
          style={{
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            color: colors.textMuted,
            fontWeight: 600,
            display: "block",
            marginBottom: "0.5rem",
          }}
        >
          הקדשה (לא חובה)
        </label>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.65rem" }}>
          {([
            { value: "regular" as const, label: "ללא הקדשה" },
            { value: "iluy_neshama" as const, label: "לעילוי נשמת" },
            { value: "refua" as const, label: "לרפואת" },
          ]).map((t) => (
            <button
              key={t.value}
              onClick={() => onDonationType(t.value)}
              style={{
                flex: 1,
                padding: "0.45rem 0.4rem",
                borderRadius: radii.sm,
                border: donationType === t.value
                  ? `1.5px solid ${colors.goldDark}`
                  : `1px solid ${colors.parchmentDeep}`,
                background: donationType === t.value ? `rgba(196,162,101,0.09)` : "white",
                color: donationType === t.value ? colors.goldDark : colors.textMuted,
                fontFamily: fonts.body,
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {donationType !== "regular" && (
          <input
            value={dedication}
            onChange={(e) => onDedication(e.target.value)}
            placeholder={donationType === "iluy_neshama" ? "שם הנפטר/ת..." : "שם החולה..."}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: radii.md,
              border: `1.5px solid ${colors.parchmentDeep}`,
              background: "white",
              fontFamily: fonts.body,
              fontSize: "0.9rem",
              color: colors.textDark,
              outline: "none",
              direction: "rtl",
              boxSizing: "border-box",
            }}
          />
        )}
      </div>

      {/* Donor details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <Label style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
            שם מלא *
          </Label>
          <Input
            value={donorName}
            onChange={(e) => onDonorName(e.target.value)}
            placeholder="שם פרטי ומשפחה..."
            className="mt-1"
            dir="rtl"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
          <div>
            <Label style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
              טלפון *
            </Label>
            <Input
              value={donorPhone}
              onChange={(e) => onDonorPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              type="tel"
              dir="ltr"
              className="mt-1"
            />
          </div>
          <div>
            <Label style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted }}>
              אימייל
            </Label>
            <Input
              type="email"
              value={donorEmail}
              onChange={(e) => onDonorEmail(e.target.value)}
              placeholder="email@..."
              dir="ltr"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* TOS */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
        <Checkbox
          id="donate-tos"
          checked={tosAccepted}
          onCheckedChange={(v) => onTosAccepted(!!v)}
        />
        <label
          htmlFor="donate-tos"
          style={{
            fontFamily: fonts.body,
            fontSize: "0.8rem",
            lineHeight: 1.6,
            color: colors.textMuted,
            cursor: "pointer",
          }}
        >
          אני מאשר/ת את{" "}
          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.goldDark, textDecoration: "underline" }}
          >
            תקנון האתר
          </Link>
          {" "}ומדיניות הפרטיות, ואני מעל גיל 18.
        </label>
      </div>

      {/* Error state */}
      {paymentError && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: radii.md,
            background: "rgba(220,38,38,0.07)",
            border: "1px solid rgba(220,38,38,0.2)",
            fontFamily: fonts.body,
            fontSize: "0.85rem",
            color: "#dc2626",
            textAlign: "center",
          }}
        >
          {paymentError}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onSubmit}
        disabled={!amount || isProcessing || !paymentReady || !tosAccepted}
        style={{
          width: "100%",
          padding: "1.1rem",
          borderRadius: radii.lg,
          border: "none",
          background:
            !amount || isProcessing || !paymentReady || !tosAccepted
              ? "rgba(139,111,71,0.3)"
              : gradients.goldButton,
          color: "white",
          fontFamily: fonts.accent,
          fontWeight: 800,
          fontSize: "1.1rem",
          cursor: !amount || isProcessing || !paymentReady || !tosAccepted ? "not-allowed" : "pointer",
          boxShadow: !tosAccepted ? "none" : shadows.goldGlow,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          letterSpacing: "0.01em",
          transition: "all 0.15s",
        }}
      >
        {isProcessing ? (
          <><Loader2 size={18} className="animate-spin" />מעבד תשלום...</>
        ) : !paymentReady ? (
          <><Loader2 size={18} className="animate-spin" />טוען מערכת תשלום...</>
        ) : (
          <><Heart size={18} fill="currentColor" />
            תרום {amount.toLocaleString("he-IL")}₪{recurring ? " לחודש" : ""}
          </>
        )}
      </button>

      <p
        style={{
          textAlign: "center",
          fontFamily: fonts.body,
          fontSize: "0.72rem",
          color: colors.textSubtle,
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          flexWrap: "wrap" as const,
        }}
      >
        <ShieldCheck size={12} />
        סליקה מאובטחת באמצעות Grow — אשראי, ביט, Apple Pay, Google Pay
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatChip({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
        color: colors.textMid,
      }}
    >
      <span style={{ color: colors.goldDark }}>{icon}</span>
      <div>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: "1.3rem",
            color: colors.textDark,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.8rem",
            color: colors.textMuted,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function ImpactRow({ amount, desc }: { amount: string; desc: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "1rem 1.25rem",
        background: "white",
        borderRadius: radii.lg,
        border: `1px solid rgba(139,111,71,0.1)`,
        boxShadow: shadows.cardSoft,
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: "1.35rem",
          color: colors.goldDark,
          minWidth: "4.5rem",
          flexShrink: 0,
        }}
      >
        {amount}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.92rem",
          lineHeight: 1.6,
          color: colors.textMid,
        }}
      >
        {desc}
      </div>
    </div>
  );
}

function TrustCard({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.35rem",
        padding: "1rem 0.75rem",
        background: colors.parchmentDark,
        borderRadius: radii.lg,
        textAlign: "center",
      }}
    >
      <span style={{ color: colors.goldDark }}>{icon}</span>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.8rem",
          fontWeight: 700,
          color: colors.textDark,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.72rem",
          color: colors.textSubtle,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
