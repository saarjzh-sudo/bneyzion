/**
 * DonateForm — the live, Grow-wired donation card.
 *
 * Self-contained sticky form used by both the production /donate page and the
 * /design-donate sandbox preview. Amount is *controlled* from the parent so the
 * impact-tier cards above can set it (click-to-fund), while donor details,
 * recurring mode and dedication stay internal.
 *
 * Payment: reuses the shared useGrowPayment hook.
 *   - one-time   → type="donation"   → GROW_*_DONATIONS merchant
 *   - recurring  → type="directDebit" → same merchant, horaat-keva flow
 * No real charge happens until the donor completes Grow's own secure window.
 *
 * Accessibility: every control has a label, toggle groups expose aria-pressed,
 * and a scoped :focus-visible style gives keyboard users a clear gold ring.
 */
import { useCallback, useState } from "react";
import { Heart, Flame, Loader2, ShieldCheck } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";

const PRESETS = [50, 100, 180, 360, 540, 1000];

type DonationType = "regular" | "iluy_neshama" | "refua";

const DEDICATION_LABELS: { value: DonationType; label: string }[] = [
  { value: "regular", label: "ללא הקדשה" },
  { value: "iluy_neshama", label: "לעילוי נשמת" },
  { value: "refua", label: "לרפואת" },
];

interface DonateFormProps {
  /** Controlled amount (so impact tiers can set it). */
  amount: number;
  onAmount: (n: number) => void;
  /** id used as the scroll anchor target. */
  id?: string;
  /** Pre-fill a dedication (e.g. memorial campaign). */
  initialDedication?: string;
  initialDonationType?: DonationType;
  /** Campaign routing — forwarded to create-payment for stats views. */
  source?: string | null;
  tier?: string | null;
}

export default function DonateForm({
  amount,
  onAmount,
  id = "donate-form",
  initialDedication = "",
  initialDonationType = "regular",
  source = null,
  tier = null,
}: DonateFormProps) {
  const [recurring, setRecurring] = useState(false);
  const [dedication, setDedication] = useState(initialDedication);
  const [donationType, setDonationType] = useState<DonationType>(initialDonationType);
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const {
    startPayment,
    isLoading: paymentLoading,
    isReady: paymentReady,
    error: paymentError,
  } = useGrowPayment();

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
      toast({ title: "יש לאשר את התקנון לפני המעבר לתשלום", variant: "destructive" });
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
        meta: {
          ...(source && { product: source }),
          tos_accepted: true,
          tos_accepted_at: new Date().toISOString(),
        },
        donationMeta: {
          is_monthly: recurring,
          dedication_type: donationType,
          dedication_name: dedication || undefined,
          donor_email: donorEmail || undefined,
          user_id: user?.id,
          ...(source && { source }),
          ...(tier && { tier_id: tier }),
        } as any,
      });

      toast({
        title: "חלון התשלום נפתח",
        description: "השלימו את התשלום בחלון המאובטח. תודה רבה!",
      });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err?.message, variant: "destructive" });
    }
  }, [
    amount, recurring, donationType, dedication, donorName, donorPhone,
    donorEmail, tosAccepted, user, startPayment, toast, source, tier,
  ]);

  const ctaDisabled = !amount || paymentLoading || !paymentReady || !tosAccepted;

  return (
    <div
      id={id}
      style={{
        background: "white",
        borderRadius: radii.xl,
        padding: "2.25rem 2rem",
        border: `1px solid rgba(139,111,71,0.14)`,
        boxShadow: "0 20px 60px rgba(45,31,14,0.10), 0 4px 16px rgba(45,31,14,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "1.4rem",
      }}
      dir="rtl"
      className="donate-form-card"
    >
      {/* Focus-visible ring for keyboard users (inline styles can't do :focus). */}
      <style>{`
        .donate-form-card button:focus-visible,
        .donate-form-card input:focus-visible,
        .donate-form-card a:focus-visible {
          outline: 3px solid ${colors.goldLight};
          outline-offset: 2px;
        }
        .donate-form-card input { transition: border-color 0.15s; }
        .donate-form-card input:focus { border-color: ${colors.goldDark} !important; }
      `}</style>

      {/* Header */}
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
            marginBottom: "0.7rem",
          }}
        >
          <Flame size={11} aria-hidden="true" /> תרומה לאתר
        </div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: "1.5rem",
            color: colors.textDark,
            margin: 0,
          }}
        >
          בחרו את גובה התרומה
        </h2>
      </div>

      {/* Recurring toggle */}
      <div
        style={{ display: "flex", justifyContent: "center" }}
        role="group"
        aria-label="סוג התרומה"
      >
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
                type="button"
                onClick={() => setRecurring(val)}
                aria-pressed={active}
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
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}
        role="group"
        aria-label="סכומים מומלצים"
      >
        {PRESETS.map((p) => {
          const active = amount === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onAmount(p)}
              aria-pressed={active}
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
          htmlFor="donate-amount"
          style={{
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            color: colors.textMuted,
            fontWeight: 600,
            display: "block",
            marginBottom: "0.4rem",
          }}
        >
          או הקלידו סכום אחר
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
            aria-hidden="true"
          >
            ₪
          </span>
          <input
            id="donate-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => onAmount(Number(e.target.value) || 0)}
            aria-label="סכום תרומה בשקלים"
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

      {/* Dedication */}
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend
          style={{
            fontFamily: fonts.body,
            fontSize: "0.82rem",
            color: colors.textMuted,
            fontWeight: 600,
            marginBottom: "0.5rem",
            padding: 0,
          }}
        >
          הקדשה (לא חובה)
        </legend>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.65rem" }}>
          {DEDICATION_LABELS.map((t) => {
            const active = donationType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setDonationType(t.value)}
                aria-pressed={active}
                style={{
                  flex: 1,
                  padding: "0.45rem 0.4rem",
                  borderRadius: radii.sm,
                  border: active
                    ? `1.5px solid ${colors.goldDark}`
                    : `1px solid ${colors.parchmentDeep}`,
                  background: active ? `rgba(196,162,101,0.09)` : "white",
                  color: active ? colors.goldDark : colors.textMuted,
                  fontFamily: fonts.body,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {donationType !== "regular" && (
          <input
            value={dedication}
            onChange={(e) => setDedication(e.target.value)}
            placeholder={donationType === "iluy_neshama" ? "שם הנפטר/ת..." : "שם החולה..."}
            aria-label={donationType === "iluy_neshama" ? "שם הנפטר לעילוי נשמתו" : "שם החולה לרפואתו"}
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
      </fieldset>

      {/* Donor details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label
            htmlFor="donor-name"
            style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, display: "block", marginBottom: "0.3rem" }}
          >
            שם מלא *
          </label>
          <input
            id="donor-name"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            placeholder="שם פרטי ומשפחה..."
            dir="rtl"
            autoComplete="name"
            style={inputStyle}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
          <div>
            <label
              htmlFor="donor-phone"
              style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, display: "block", marginBottom: "0.3rem" }}
            >
              טלפון *
            </label>
            <input
              id="donor-phone"
              value={donorPhone}
              onChange={(e) => setDonorPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              htmlFor="donor-email"
              style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, display: "block", marginBottom: "0.3rem" }}
            >
              אימייל
            </label>
            <input
              id="donor-email"
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="email@..."
              dir="ltr"
              autoComplete="email"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* TOS */}
      <label
        htmlFor="donate-tos"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          fontFamily: fonts.body,
          fontSize: "0.8rem",
          lineHeight: 1.6,
          color: colors.textMuted,
          cursor: "pointer",
        }}
      >
        <input
          id="donate-tos"
          type="checkbox"
          checked={tosAccepted}
          onChange={(e) => setTosAccepted(e.target.checked)}
          style={{ marginTop: 3, width: 16, height: 16, accentColor: colors.goldDark, flexShrink: 0 }}
        />
        <span>
          אני מאשר/ת את{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.goldDark, textDecoration: "underline" }}
          >
            תקנון האתר
          </a>{" "}
          ומדיניות הפרטיות, ואני מעל גיל 18.
        </span>
      </label>

      {/* Error */}
      {paymentError && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            borderRadius: radii.md,
            background: "rgba(220,38,38,0.07)",
            border: "1px solid rgba(220,38,38,0.2)",
            fontFamily: fonts.body,
            fontSize: "0.85rem",
            color: "#b91c1c",
            textAlign: "center",
          }}
        >
          {paymentError}
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={handleDonate}
        disabled={ctaDisabled}
        style={{
          width: "100%",
          padding: "1.1rem",
          borderRadius: radii.lg,
          border: "none",
          background: ctaDisabled ? "rgba(139,111,71,0.3)" : gradients.goldButton,
          color: "white",
          fontFamily: fonts.accent,
          fontWeight: 800,
          fontSize: "1.1rem",
          cursor: ctaDisabled ? "not-allowed" : "pointer",
          boxShadow: ctaDisabled ? "none" : shadows.goldGlow,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          letterSpacing: "0.01em",
          transition: "all 0.15s",
        }}
      >
        {paymentLoading ? (
          <><Loader2 size={18} className="animate-spin" aria-hidden="true" />מעבד תשלום...</>
        ) : !paymentReady ? (
          <><Loader2 size={18} className="animate-spin" aria-hidden="true" />טוען מערכת תשלום...</>
        ) : (
          <><Heart size={18} fill="currentColor" aria-hidden="true" />
            תרמו {amount.toLocaleString("he-IL")}₪{recurring ? " לחודש" : ""}
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
          flexWrap: "wrap",
        }}
      >
        <ShieldCheck size={12} aria-hidden="true" />
        סליקה מאובטחת ב-Grow — אשראי, ביט, Apple Pay, Google Pay
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.9rem",
  borderRadius: radii.md,
  border: `1.5px solid ${colors.parchmentDeep}`,
  background: "white",
  fontFamily: fonts.body,
  fontSize: "0.92rem",
  color: colors.textDark,
  outline: "none",
  boxSizing: "border-box",
};
