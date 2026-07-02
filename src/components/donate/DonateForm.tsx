/**
 * DonateForm — the live, Grow-wired donation card (editorial redesign).
 *
 * Underline inputs, inverted-selection amount chips, one refined CTA — no
 * boxed-gray "SaaS" inputs, no gradients, no icons-as-decoration. Amount is
 * controlled from the parent (impact tiers set it). Payment reuses
 * useGrowPayment: one-time → "donation", recurring → "directDebit".
 */
import { useCallback, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { C, EASE, fonts } from "@/components/donate/theme";

const PRESETS = [50, 100, 180, 360, 540, 1000];

type DonationType = "regular" | "iluy_neshama" | "refua" | "simcha";

const DEDICATION_LABELS: { value: DonationType; label: string }[] = [
  { value: "regular", label: "ללא הקדשה" },
  { value: "iluy_neshama", label: "לעילוי נשמת" },
  { value: "refua", label: "לרפואה" },
  { value: "simcha", label: "לכבוד שמחה" },
];

const DEDICATION_PLACEHOLDER: Record<Exclude<DonationType, "regular">, string> = {
  iluy_neshama: "שם הנפטר/ת",
  refua: "שם החולה",
  simcha: "לכבוד מי",
};

const DEDICATION_PREFIX: Record<Exclude<DonationType, "regular">, string> = {
  iluy_neshama: "לעילוי נשמת",
  refua: "לרפואת",
  simcha: "לכבוד",
};

interface DonateFormProps {
  amount: number;
  onAmount: (n: number) => void;
  id?: string;
  source?: string | null;
  tier?: string | null;
}

export default function DonateForm({
  amount,
  onAmount,
  id = "donate-form",
  source = null,
  tier = null,
}: DonateFormProps) {
  const [recurring, setRecurring] = useState(false);
  const [dedication, setDedication] = useState("");
  const [donationType, setDonationType] = useState<DonationType>("regular");
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
          ? ` - ${DEDICATION_PREFIX[donationType]} ${dedication}`
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
          // ⚠️ אסור לשלוח כאן product: source — השרת מפרש meta.product כמזהה
          // ב-payment_products ונופל על "Missing or unknown product".
          // התרומות רצות במסלול ה-legacy (type=donation/directDebit → merchant
          // התרומות). ה-source נשמר ב-donationMeta.source לאנליטיקס.
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

      toast({ title: "חלון התשלום נפתח", description: "השלימו את התשלום בחלון המאובטח. תודה רבה!" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err?.message, variant: "destructive" });
    }
  }, [
    amount, recurring, donationType, dedication, donorName, donorPhone,
    donorEmail, tosAccepted, user, startPayment, toast, source, tier,
  ]);

  const ctaDisabled = !amount || paymentLoading || !paymentReady || !tosAccepted;

  return (
    <div id={id} className="df" dir="rtl">
      <FormStyles />

      <div style={{ marginBottom: "1.75rem" }}>
        <Kicker>תרומה לאתר בני ציון</Kicker>
        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.6rem", color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
          בחרו את גובה השותפות
        </h3>
      </div>

      {/* Frequency — underlined text tabs */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.75rem" }} role="group" aria-label="תדירות התרומה">
        {[
          { label: "חד־פעמי", val: false },
          { label: "הוראת קבע", val: true },
        ].map(({ label, val }) => {
          const active = recurring === val;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setRecurring(val)}
              aria-pressed={active}
              className="df-tab"
              style={{
                color: active ? C.ink : C.ink42,
                borderBottom: `2px solid ${active ? C.gold : "transparent"}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Amount chips — inverted selection */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1.5rem" }} role="group" aria-label="סכומים">
        {PRESETS.map((p) => {
          const active = amount === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onAmount(p)}
              aria-pressed={active}
              className="df-chip"
              style={{
                background: active ? C.ink : "transparent",
                color: active ? C.cream : C.ink,
                borderColor: active ? C.ink : C.line,
              }}
            >
              {p.toLocaleString("he-IL")} ₪
            </button>
          );
        })}
      </div>

      {/* Custom amount — underline */}
      <div style={{ marginBottom: "1.75rem" }}>
        <label htmlFor="donate-amount" className="df-label">סכום אחר</label>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
          <input
            id="donate-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => onAmount(Number(e.target.value) || 0)}
            aria-label="סכום תרומה בשקלים"
            className="df-input"
            style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.5rem" }}
          />
          <span style={{ fontFamily: fonts.display, fontSize: "1.25rem", color: C.ink42 }} aria-hidden="true">₪</span>
        </div>
      </div>

      {/* Dedication */}
      <fieldset style={{ border: "none", margin: "0 0 1.75rem", padding: 0 }}>
        <legend className="df-label" style={{ marginBottom: "0.75rem" }}>הקדשה (לא חובה)</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: donationType !== "regular" ? "1rem" : 0 }}>
          {DEDICATION_LABELS.map((t) => {
            const active = donationType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setDonationType(t.value)}
                aria-pressed={active}
                className="df-pill"
                style={{
                  background: active ? C.goldTint : "transparent",
                  color: active ? C.goldDeep : C.ink62,
                  borderColor: active ? C.gold : C.line,
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
            placeholder={DEDICATION_PLACEHOLDER[donationType]}
            aria-label={`${DEDICATION_PREFIX[donationType]} — שם`}
            className="df-input"
          />
        )}
      </fieldset>

      {/* Donor details — underline inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem", marginBottom: "1.75rem" }}>
        <div>
          <label htmlFor="donor-name" className="df-label">שם מלא</label>
          <input id="donor-name" value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="שם פרטי ומשפחה" dir="rtl" autoComplete="name" className="df-input" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
          <div>
            <label htmlFor="donor-phone" className="df-label">טלפון</label>
            <input id="donor-phone" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} placeholder="05XXXXXXXX" type="tel" dir="ltr" autoComplete="tel" className="df-input" style={{ textAlign: "right" }} />
          </div>
          <div>
            <label htmlFor="donor-email" className="df-label">אימייל (לקבלה)</label>
            <input id="donor-email" type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} placeholder="email@example.com" dir="ltr" autoComplete="email" className="df-input" style={{ textAlign: "right" }} />
          </div>
        </div>
      </div>

      {/* TOS */}
      <label htmlFor="donate-tos" className="df-tos">
        <input id="donate-tos" type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} />
        <span>
          אני מאשר/ת את{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer">תקנון האתר</a>{" "}
          ומדיניות הפרטיות, ואני מעל גיל 18.
        </span>
      </label>

      {paymentError && (
        <div role="alert" className="df-error">{paymentError}</div>
      )}

      <button type="button" onClick={handleDonate} disabled={ctaDisabled} className="df-cta">
        {paymentLoading ? "מעבד תשלום…"
          : !paymentReady ? "טוען מערכת תשלום…"
          : `לתרומה מאובטחת · ${amount.toLocaleString("he-IL")} ₪${recurring ? " לחודש" : ""}`}
      </button>

      <p className="df-trust">
        סליקה מאובטחת · קבלה מיידית למייל · מוכר לזיכוי מס לפי סעיף 46 · עמותת מכלל יופי (ע״ר)
      </p>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
      <span aria-hidden="true" style={{ width: 26, height: 1, background: C.gold, opacity: 0.7 }} />
      <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.2em", color: C.goldDeep }}>
        {children}
      </span>
    </div>
  );
}

function FormStyles() {
  return (
    <style>{`
      .df {
        background: ${C.paper};
        border: 1px solid ${C.line};
        border-radius: 4px;
        padding: 2.5rem 2.25rem;
      }
      .df-label { display: block; font-family: ${fonts.body}; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; color: ${C.ink42}; margin-bottom: 0.5rem; }
      .df-tab { background: none; border: none; padding: 0 0 0.45rem; font-family: ${fonts.body}; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: color 0.3s ${EASE}, border-color 0.3s ${EASE}; }
      .df-chip { padding: 0.85rem 0.5rem; border: 1px solid; border-radius: 3px; font-family: ${fonts.display}; font-weight: 700; font-size: 1.15rem; cursor: pointer; transition: background 0.25s ${EASE}, color 0.25s ${EASE}, border-color 0.25s ${EASE}; }
      .df-chip:hover { border-color: ${C.ink}; }
      .df-pill { padding: 0.4rem 0.9rem; border: 1px solid; border-radius: 999px; font-family: ${fonts.body}; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.25s ${EASE}; }
      .df-input { width: 100%; box-sizing: border-box; border: none; border-bottom: 1px solid ${C.line}; background: transparent; padding: 0.5rem 0; font-family: ${fonts.body}; font-size: 1rem; color: ${C.ink}; outline: none; transition: border-color 0.3s ${EASE}; }
      .df-input::placeholder { color: ${C.ink42}; }
      .df-input:focus { border-bottom-color: ${C.gold}; }
      .df-tos { display: flex; align-items: flex-start; gap: 0.6rem; font-family: ${fonts.body}; font-size: 0.82rem; line-height: 1.6; color: ${C.ink62}; cursor: pointer; margin-bottom: 1.5rem; }
      .df-tos input { margin-top: 3px; width: 15px; height: 15px; accent-color: ${C.gold}; flex-shrink: 0; }
      .df-tos a { color: ${C.goldDeep}; text-underline-offset: 3px; }
      .df-error { padding: 0.75rem 1rem; border: 1px solid rgba(176,58,46,0.3); border-radius: 3px; background: rgba(176,58,46,0.06); font-family: ${fonts.body}; font-size: 0.85rem; color: #9c2c22; text-align: center; margin-bottom: 1.25rem; }
      .df-cta { width: 100%; padding: 1.15rem; border: none; border-radius: 3px; background: ${C.gold}; color: ${C.cream}; font-family: ${fonts.body}; font-weight: 700; font-size: 1.02rem; letter-spacing: 0.02em; cursor: pointer; transition: background 0.3s ${EASE}, transform 0.3s ${EASE}; }
      .df-cta:hover:not(:disabled) { background: ${C.ink}; }
      .df-cta:disabled { background: ${C.creamDeep}; color: ${C.ink42}; cursor: not-allowed; }
      .df-trust { text-align: center; font-family: ${fonts.body}; font-size: 0.7rem; line-height: 1.6; color: ${C.ink42}; margin: 1rem 0 0; }
      .df :focus-visible { outline: 2px solid ${C.gold}; outline-offset: 3px; }
    `}</style>
  );
}
