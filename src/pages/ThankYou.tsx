/**
 * /thank-you — עמוד תודה (donation / subscription / store / cart).
 *
 * עוצב מחדש 11.7.2026 בשפת parchment+gold של האתר (designTokens, כמו /ask-rabbi):
 * למעלה לוגו בני ציון בלבד (בלי הלוגואים של הפרק השבועי ותנ"ך למשפחה),
 * hero כהה עם עיטור זהב מאופק, כרטיסי תוכן לבנים וכפתורי חזרה לתכנים.
 * RTL מלא, mobile-first, inline styles.
 *
 * הלוגיקה נשמרה במלואה: ?type= קובע וריאנט (store / subscription / donation /
 * ברירת-מחדל cart), פיקסל Lead של פייסבוק נטען רק עם הסכמת שיווק,
 * וכל הניווטים הקיימים (/, /store, /portal, קבוצת הוואטסאפ) נשארו.
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Gift,
  Heart,
  Mail,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import logoColor from "@/assets/logo-horizontal-color.png";
import { Seo } from "@/components/seo/Seo";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { hasMarketingConsent } from "@/lib/consent";

// ─── Facebook pixel helper (unchanged logic) ────────────────────────────────
function FbPixelLead() {
  useEffect(() => {
    if (!hasMarketingConsent()) return;
    const script = document.createElement("script");
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '880780867959990');
      fbq('track', 'Lead');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement("noscript");
    noscript.innerHTML =
      '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=880780867959990&ev=Lead&noscript=1" />';
    document.body.appendChild(noscript);

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
      if (document.body.contains(noscript)) document.body.removeChild(noscript);
    };
  }, []);
  return null;
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const pageCss = `
  .ty-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    padding: 0.85rem 1.6rem;
    border-radius: ${radii.lg};
    font-family: ${fonts.body};
    font-weight: 700;
    font-size: 1rem;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }
  .ty-btn-gold {
    background: ${gradients.goldButton};
    color: #fff;
    border: none;
    box-shadow: ${shadows.goldGlowSoft};
  }
  .ty-btn-gold:hover { transform: translateY(-2px); box-shadow: ${shadows.goldGlow}; }
  .ty-btn-olive {
    background: ${gradients.oliveButton};
    color: #fff;
    border: none;
    box-shadow: ${shadows.oliveGlow};
  }
  .ty-btn-olive:hover { transform: translateY(-2px); }
  .ty-btn-ghost {
    background: #fff;
    color: ${colors.goldDeep};
    border: 1px solid rgba(139,111,71,0.35);
  }
  .ty-btn-ghost:hover { background: rgba(139,111,71,0.07); }
  .ty-logo-link { display: inline-block; transition: opacity 0.2s ease; }
  .ty-logo-link:hover { opacity: 0.85; }
  @media (prefers-reduced-motion: reduce) {
    .ty-btn, .ty-logo-link { transition: none; }
    .ty-btn:hover { transform: none; }
  }
`;

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: radii.xl,
  border: "1px solid rgba(139,111,71,0.15)",
  boxShadow: shadows.card,
  padding: "1.75rem 1.5rem",
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 800,
  fontSize: "1.3rem",
  color: colors.textDark,
  margin: "0 0 1rem",
  textAlign: "center",
};

const bodyTextStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "0.95rem",
  color: colors.textMid,
  lineHeight: 1.8,
  margin: 0,
};

const mutedTextStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "0.85rem",
  color: colors.textMuted,
  lineHeight: 1.7,
  margin: 0,
};

// ─── Shared building blocks ─────────────────────────────────────────────────

/** Page shell: gold strip → Bnei Zion logo only → dark hero → overlapping content. */
function ThankYouShell({
  icon: Icon,
  title,
  subtitle,
  heroExtra,
  footerTitle,
  footerNote,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  heroExtra?: React.ReactNode;
  footerTitle: string;
  footerNote: string;
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: gradients.parchmentBlend,
      }}
    >
      <style>{pageCss}</style>

      {/* Thin brand strip */}
      <div style={{ height: 4, background: gradients.goldButton }} aria-hidden />

      {/* Logo — Bnei Zion only */}
      <header style={{ padding: "1.75rem 1rem 1.5rem", textAlign: "center" }}>
        <Link to="/" className="ty-logo-link" aria-label="לעמוד הבית של בני ציון">
          <img
            src={logoColor}
            alt="בני ציון — בונים קומה בתנ״ך"
            style={{ height: "clamp(88px, 16vw, 120px)", width: "auto", objectFit: "contain" }}
          />
        </Link>
      </header>

      {/* Hero */}
      <div
        style={{
          background: gradients.warmDark,
          padding: "2.75rem 1.5rem 4.75rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(232,213,160,0.12) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: gradients.goldButton,
              boxShadow: shadows.goldGlow,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.1rem",
            }}
          >
            <Icon size={26} style={{ color: "#fff" }} aria-hidden />
          </div>

          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "clamp(1.8rem, 5vw, 2.6rem)",
              color: "#fff",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "0.95rem",
              color: "rgba(255,255,255,0.72)",
              margin: "0.75rem auto 0",
              maxWidth: 520,
              lineHeight: 1.7,
            }}
          >
            {subtitle}
          </p>

          {/* Restrained festive ornament */}
          <div
            aria-hidden
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              marginTop: "1.25rem",
            }}
          >
            <span style={{ height: 1, width: 56, background: "rgba(232,213,160,0.4)" }} />
            <Sparkles size={14} style={{ color: colors.goldShimmer }} />
            <span style={{ height: 1, width: 56, background: "rgba(232,213,160,0.4)" }} />
          </div>

          {heroExtra}
        </div>
      </div>

      {/* Content — first card overlaps the hero */}
      <main
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
          padding: "0 1.25rem 3rem",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        <div style={{ marginTop: "-3rem", position: "relative", display: "grid", gap: "1.25rem" }}>
          {children}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "2.5rem",
            paddingTop: "1.75rem",
            borderTop: "1px solid rgba(139,111,71,0.18)",
          }}
        >
          <p
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "1.1rem",
              color: colors.textDark,
              margin: "0 0 0.35rem",
            }}
          >
            {footerTitle}
          </p>
          <p style={mutedTextStyle}>{footerNote}</p>
        </div>
      </main>
    </div>
  );
}

/** Info row: gold icon chip + title + body, on a parchment strip with gold accent. */
function InfoRow({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.85rem",
        background: colors.parchment,
        borderRadius: radii.md,
        borderInlineStart: `3px solid ${colors.goldLight}`,
        padding: "0.95rem 1rem",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(139,111,71,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <Icon size={17} style={{ color: colors.goldDark }} aria-hidden />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: "1rem",
            color: colors.textDark,
            margin: "0 0 0.25rem",
          }}
        >
          {title}
        </h3>
        <p style={mutedTextStyle}>{body}</p>
      </div>
    </div>
  );
}

/** CTA row — primary gold link + optional ghost link. */
function CtaRow({
  primary,
  secondary,
}: {
  primary: { to: string; label: string; icon: LucideIcon };
  secondary?: { to: string; label: string; icon: LucideIcon };
}) {
  const PrimaryIcon = primary.icon;
  const SecondaryIcon = secondary?.icon;
  return (
    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
      <Link to={primary.to} className="ty-btn ty-btn-gold">
        <PrimaryIcon size={18} aria-hidden />
        {primary.label}
        <ArrowLeft size={16} aria-hidden />
      </Link>
      {secondary && SecondaryIcon && (
        <Link to={secondary.to} className="ty-btn ty-btn-ghost">
          <SecondaryIcon size={18} aria-hidden />
          {secondary.label}
        </Link>
      )}
    </div>
  );
}

// ─── Variant: Store / book purchase ─────────────────────────────────────────
/**
 * רמה 17 — הורדות דיגיטליות בדף התודה. מושך קישורים חתומים (שעה) לפי מזהי
 * ההזמנות שב-URL. אם ה-webhook של Grow טרם אישר — מנסה שוב כמה פעמים ואז
 * מציג "הקישורים בדרך אליך במייל" (המייל נשלח אוטומטית עם אישור התשלום).
 */
function DigitalDownloads() {
  const [searchParams] = useSearchParams();
  const ordersParam = searchParams.get("orders") || "";
  const orderIds = ordersParam.split(",").filter(Boolean);
  const [items, setItems] = useState<Array<{ title: string; url: string }>>([]);
  const [state, setState] = useState<"loading" | "ready" | "pending" | "none">(
    orderIds.length ? "loading" : "none",
  );

  useEffect(() => {
    if (!orderIds.length) return;
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      attempts++;
      try {
        const res = await fetch("/api/store/order-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIds }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.items?.length) {
          setItems(data.items);
          setState("ready");
          return;
        }
        if (data.pending && attempts < 6) {
          setState("pending");
          setTimeout(poll, 5000);
          return;
        }
        setState(data.pending ? "pending" : "none");
      } catch {
        if (!cancelled) setState("none");
      }
    }
    poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersParam]);

  if (state === "none") return null;
  return (
    <section style={cardStyle} aria-label="הספרים הדיגיטליים שלך">
      <h2 style={cardTitleStyle}>הספרים הדיגיטליים שלך</h2>
      {state === "loading" && <p style={{ margin: 0 }}>מכינים את הקבצים…</p>}
      {state === "pending" && (
        <p style={{ margin: 0 }}>
          התשלום מאושר ממש עכשיו — הקישורים יופיעו כאן בעוד רגע, ובכל מקרה נשלחו
          גם למייל שהזנת.
        </p>
      )}
      {state === "ready" && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {items.map((it) => (
            <a
              key={it.url}
              href={it.url}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: colors.navyDeep, color: "#fff", textDecoration: "none",
                padding: "0.8rem 1.3rem", borderRadius: radii.md, fontWeight: 700,
                justifyContent: "center",
              }}
            >
              <Download size={17} /> להורדת {it.title}
            </a>
          ))}
          <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>
            הקישורים כאן תקפים לשעה. עותק קבוע נשלח אליך במייל — אפשר להוריד
            ולשמור את הקובץ לתמיד.
          </p>
        </div>
      )}
    </section>
  );
}

function StoreThankYou() {
  return (
    <ThankYouShell
      icon={Package}
      title="תודה על הרכישה"
      subtitle="ההזמנה שלך התקבלה בהצלחה, ואנחנו כבר מטפלים בה"
      footerTitle="תודה שבחרת בבני ציון"
      footerNote="נתראה בלימוד"
    >
      <DigitalDownloads />
      <section style={cardStyle} aria-label="מה קורה עכשיו">
        <h2 style={cardTitleStyle}>מה קורה עכשיו?</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <InfoRow
            icon={Mail}
            title="אישור הזמנה במייל"
            body="אישור הזמנה ופרטי תשלום נשלחו לכתובת המייל שהזנת. שווה להציץ גם בתיקיית הספאם."
          />
          <InfoRow
            icon={Package}
            title="משלוח"
            body="הספר יישלח אליך תוך 5–7 ימי עסקים, בהתאם לאופן המשלוח שבחרת. פרטי המשלוח יגיעו בהודעה נפרדת."
          />
          <InfoRow
            icon={CheckCircle2}
            title="יש שאלות?"
            body="לכל שאלה או בקשת שינוי אפשר לפנות אלינו בוואטסאפ או במייל, ונשמח לעזור."
          />
        </div>
      </section>

      <CtaRow
        primary={{ to: "/store", label: "חזרה לחנות", icon: BookOpen }}
        secondary={{ to: "/", label: "לעמוד הבית", icon: ArrowLeft }}
      />
    </ThankYouShell>
  );
}

// ─── Variant: Subscription (weekly chapter) ──────────────────────────────────
function SubscriptionThankYou() {
  const weeklySteps = [
    {
      icon: Calendar,
      title: "יום שישי בבוקר",
      body: "מקבלים את תכני הבסיס וההעמקה על הפרקים השבועיים: הקלטה של קריאת הפרקים, ביאור פשוט, מאמר מאת הרב יואב והקלטות העמקה.",
    },
    {
      icon: BookOpen,
      title: "שישי עד ראשון",
      body: 'לימוד אישי: קוראים את הפרקים (רק 15–20 דקות). ממליצים ללמוד עם פירוש "מצודות דוד".',
    },
    {
      icon: Video,
      title: "ערב רביעי: שיעור הזום השבועי",
      body: "שיעור חי עם הרב יואב אוריאל. ההקלטה תמיד זמינה למי שפספס או רוצה לחזור.",
    },
    {
      icon: FileText,
      title: "יום חמישי",
      body: "מקבלים סיכום כתוב והקלטה מלאה של השיעור.",
    },
  ];

  return (
    <ThankYouShell
      icon={BookOpen}
      title={'ברוכים הבאים ל"לחיות תנ"ך — הפרק השבועי"'}
      subtitle="שמחים שהצטרפת למסע לימוד התנ״ך שלנו עם הרב יואב אוריאל"
      heroExtra={
        <div
          style={{
            marginTop: "1.25rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 1.1rem",
            borderRadius: radii.pill,
            background: "rgba(232,213,160,0.14)",
            border: "1px solid rgba(232,213,160,0.3)",
          }}
        >
          <Calendar size={15} style={{ color: colors.goldShimmer }} aria-hidden />
          <span
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "0.85rem",
              color: colors.goldShimmer,
            }}
          >
            שיעור זום שבועי · ערב רביעי
          </span>
        </div>
      }
      footerTitle="תודה שהצטרפת אלינו"
      footerNote="נתראה בלימוד"
    >
      {/* What we study now */}
      <section style={cardStyle} aria-label="מה לומדים עכשיו">
        <h2 style={cardTitleStyle}>מה לומדים עכשיו?</h2>
        <div
          style={{
            textAlign: "center",
            background: colors.parchment,
            borderRadius: radii.md,
            padding: "1rem 1.1rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ ...bodyTextStyle, fontWeight: 700 }}>
            כעת לומדים: <span style={{ color: colors.goldDark }}>חגי, זכריה, מלאכי</span>
          </p>
          <p style={{ ...mutedTextStyle, marginTop: "0.35rem" }}>
            נביאי הבית השני, ההמשך הישיר של מגילת אסתר בתקופת שיבת ציון
          </p>
        </div>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <InfoRow icon={BookOpen} title="חגי" body="הנביא שמעודד את בניין בית המקדש השני" />
          <InfoRow icon={BookOpen} title="זכריה" body="חזיונות ועידוד, מבניין הבית ועד ימות המשיח" />
          <InfoRow icon={BookOpen} title="מלאכי" body="הנביא האחרון, שקורא לחזרה בתשובה לפני הגאולה" />
        </div>
        <p style={{ ...mutedTextStyle, textAlign: "center", marginTop: "1rem" }}>
          בהמשך נעבור לשאר ספרי נביאים וכתובים על הסדר
        </p>
      </section>

      {/* Weekly rhythm */}
      <section style={cardStyle} aria-label="מה צפוי בכל שבוע">
        <h2 style={cardTitleStyle}>כך נראה שבוע של לימוד</h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.35rem" }}>
          {weeklySteps.map((step, idx) => {
            const StepIcon = step.icon;
            const isLast = idx === weeklySteps.length - 1;
            return (
              <li key={step.title} style={{ display: "flex", gap: "0.9rem" }}>
                {/* Number + connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: gradients.goldButton,
                      boxShadow: shadows.goldGlowSoft,
                      color: "#fff",
                      fontFamily: fonts.body,
                      fontWeight: 800,
                      fontSize: "1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-hidden
                  >
                    {idx + 1}
                  </span>
                  {!isLast && (
                    <span
                      aria-hidden
                      style={{ width: 2, flex: 1, minHeight: 20, background: "rgba(139,111,71,0.2)" }}
                    />
                  )}
                </div>
                <div style={{ paddingBottom: isLast ? 0 : "1.1rem", flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      color: colors.textDark,
                      margin: "0.4rem 0 0.3rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    <StepIcon size={16} style={{ color: colors.goldDark, flexShrink: 0 }} aria-hidden />
                    {step.title}
                  </h3>
                  <p style={mutedTextStyle}>{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Portal + WhatsApp CTA */}
      <section
        style={{ ...cardStyle, textAlign: "center", borderColor: "rgba(139,111,71,0.3)" }}
        aria-label="כניסה לתכנים"
      >
        <h2 style={cardTitleStyle}>מוכנים להתחיל ללמוד?</h2>
        <p style={{ ...bodyTextStyle, marginBottom: "1.25rem" }}>
          כל התכנים, ההקלטות והסיכומים מחכים לך בפורטל הלומדים
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/portal" className="ty-btn ty-btn-gold">
            <BookOpen size={18} aria-hidden />
            כניסה לפורטל הלומדים
            <ArrowLeft size={16} aria-hidden />
          </a>
          <a
            href="https://chat.whatsapp.com/L1PZWRh8kxdDojWmUDMBs3"
            target="_blank"
            rel="noopener noreferrer"
            className="ty-btn ty-btn-olive"
          >
            <Users size={18} aria-hidden />
            הצטרפות לקבוצת הוואטסאפ
          </a>
        </div>
        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(139,111,71,0.15)",
            display: "flex",
            gap: "1.5rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[
            { icon: Gift, text: "הכול פתוח ונגיש דרך קבוצת הוואטסאפ או המייל שלך" },
            { icon: ShieldCheck, text: "אין התחייבות, רק רצון ללמוד ולהתחבר" },
          ].map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  maxWidth: 300,
                  textAlign: "start",
                }}
              >
                <ItemIcon size={17} style={{ color: colors.goldDark, flexShrink: 0 }} aria-hidden />
                <span style={mutedTextStyle}>{item.text}</span>
              </div>
            );
          })}
        </div>
      </section>
    </ThankYouShell>
  );
}

// ─── Variant: Donation ───────────────────────────────────────────────────────
function DonationThankYou() {
  return (
    <ThankYouShell
      icon={Heart}
      title="תודה רבה על התרומה"
      subtitle="התרומה שלך מרחיבה את לימוד התורה והתנ״ך בישראל, ואנחנו מודים לך מכל הלב"
      footerTitle="תודה שאתם שותפים לחזון"
      footerNote="יהי רצון שזכות לימוד התנ״ך תעמוד לכם ולכל יקיריכם"
    >
      <section style={cardStyle} aria-label="לאן הולכת התרומה">
        <h2 style={cardTitleStyle}>ברכה ממעמקי הלב</h2>
        <p style={{ ...bodyTextStyle, textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          בזכות תרומות כמו שלך, אלפי לומדים זוכים לשיעורי תנ״ך ברמה גבוהה, בלי עלות.
          ממש כמו שהתורה מיועדת להיות: נחלת כלל ישראל.
        </p>
        <div
          style={{
            display: "grid",
            gap: "0.85rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginTop: "1.5rem",
          }}
        >
          {[
            { icon: BookOpen, text: "הנגשת אלפי שיעורים בחינם" },
            { icon: Users, text: "תמיכה ברבנים ובמרצים" },
            { icon: Gift, text: "פיתוח תכנים ופלטפורמה" },
          ].map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.text}
                style={{
                  background: colors.parchment,
                  borderRadius: radii.md,
                  border: "1px solid rgba(139,111,71,0.12)",
                  padding: "1.1rem 0.9rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.55rem",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(139,111,71,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ItemIcon size={18} style={{ color: colors.goldDark }} aria-hidden />
                </span>
                <span style={mutedTextStyle}>{item.text}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={cardStyle} aria-label="קבלה במייל">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <InfoRow
            icon={Mail}
            title="קבלה במייל"
            body="קבלה על התרומה תישלח בקרוב לכתובת המייל שהזנת. לכל שאלה אפשר לפנות אלינו ישירות, ונשמח לעזור."
          />
        </div>
      </section>

      <CtaRow
        primary={{ to: "/", label: "לעמוד הבית", icon: BookOpen }}
        secondary={{ to: "/series", label: "לכל הסדרות והשיעורים", icon: ArrowLeft }}
      />
    </ThankYouShell>
  );
}

// ─── Variant: Cart / generic ─────────────────────────────────────────────────
function CartThankYou() {
  return (
    <ThankYouShell
      icon={CheckCircle2}
      title="תודה על ההזמנה"
      subtitle="ההזמנה התקבלה בהצלחה, ופרטי הרכישה כבר בדרך למייל שלך"
      footerTitle="תודה שבחרת בבני ציון"
      footerNote="נתראה בלימוד"
    >
      <DigitalDownloads />
      <section style={cardStyle} aria-label="פרטי ההזמנה">
        <h2 style={cardTitleStyle}>ההזמנה התקבלה בהצלחה</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <InfoRow
            icon={Mail}
            title="אישור במייל"
            body="אישור הזמנה ופרטי התשלום נשלחו לכתובת המייל שלך. אם לא קיבלת, שווה להציץ בתיקיית הספאם."
          />
          <InfoRow
            icon={CheckCircle2}
            title="יש שאלות?"
            body="לכל שאלה אפשר לפנות אלינו בוואטסאפ, ונשמח לעזור."
          />
        </div>
      </section>

      <CtaRow
        primary={{ to: "/store", label: "חזרה לחנות", icon: Package }}
        secondary={{ to: "/", label: "לעמוד הבית", icon: BookOpen }}
      />
    </ThankYouShell>
  );
}

// ─── Root component — switches on ?type= (unchanged logic) ──────────────────
const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") ?? "cart";

  const variant = (() => {
    switch (type) {
      case "store":
        return <StoreThankYou />;
      case "subscription":
        return <SubscriptionThankYou />;
      case "donation":
        return <DonationThankYou />;
      default:
        return <CartThankYou />;
    }
  })();

  return (
    <>
      <Seo title="תודה רבה" noindex />
      <FbPixelLead />
      {variant}
    </>
  );
};

export default ThankYou;
