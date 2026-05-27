/**
 * Progress2026 — דף התקדמות 2026 לבני ציון
 * Route: /2026
 * מיועד לפגישות עם הרב יואב. לא מקושר מהניווט הראשי.
 * עיצוב: cream + gold, RTL מלא, CSS only (ללא framer-motion).
 */
import Layout from "@/components/layout/Layout";
import { colors } from "@/lib/designTokens";

// ── Types ────────────────────────────────────────────────────────────────────

type StatusKey = "done" | "in_progress" | "building";

interface ProgressItem {
  id: string;
  title: string;
  subtitle?: string;
  detail: string;
  status: StatusKey;
  /** 0-100, shown only when status is in_progress */
  pct?: number;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const STATUS_META: Record<StatusKey, { label: string; dot: string; badge: string }> = {
  done: {
    label: "הושלם",
    dot: "#4A6741",
    badge: "rgba(74,103,65,0.12)",
  },
  in_progress: {
    label: "בתהליך",
    dot: "#B8860B",
    badge: "rgba(184,134,11,0.12)",
  },
  building: {
    label: "בבנייה",
    dot: "#1A5FB4",
    badge: "rgba(26,95,180,0.12)",
  },
};

const ITEMS: ProgressItem[] = [
  {
    id: "teachers-migration",
    title: "מיגרציית אגף המורים",
    detail:
      "27 יוצרי תוכן ו-20 סוגי תוכן הועברו במלואם. 11,552 שיעורים נגישים לעומת 3,052 קודם — גידול של פי 3.8.",
    status: "done",
  },
  {
    id: "content-creators",
    title: "תוכן כללי — יוצרים ורבנים",
    detail:
      "180 רבנים ו-27 יוצרי תוכן זמינים. הפרדה ברורה בין 'הרב X' ליוצרי תוכן מוסדיים. נותר: שיוכי תמונות ועדכון מטה-דאטה ב-20% מהשיעורים.",
    status: "in_progress",
    pct: 80,
  },
  {
    id: "pdf-fix",
    title: "בעיית קבצי PDF ו-Word",
    detail:
      "כל 3,106 קבצי PDF ו-Word הועברו ל-Supabase Storage ומוצגים ישירות בדפי השיעורים. הקבצים נגישים בלי צורך ב-Umbraco.",
    status: "done",
  },
  {
    id: "navigator-bot",
    title: "סוכן חכם לניווט באתר",
    detail:
      "בוט שמכוון, מעודד ומפנה לרבני האתר — לא מחליף תוכן. האפיון אושר: ניווט בלבד, ללא מענה על שאלות בתנ\"ך. נמצא בפיתוח.",
    status: "building",
  },
  {
    id: "ux",
    title: "חוויית משתמש כללית",
    detail:
      "עיצוב v2 פרוס על כל הדפים הראשיים. Header, Footer, Sidebar ו-Mobile Nav — כולם v2. ניווט לפי ספר תנ\"ך, TOC בדף הרב, חיפוש מהיר.",
    status: "done",
  },
  {
    id: "grow-payment",
    title: "סליקת Grow (Meshulam)",
    detail:
      "Grow הוטמע לחנות, תרומות ומנוי הפרק השבועי. 4 שדות החיובים החוזרים (directDebit) הוגדרו. מוכן לעבור לסביבת Production כשGrow יאשרו.",
    status: "done",
  },
  {
    id: "homepage",
    title: "עיצוב דף הבית מחדש",
    detail:
      "דף בית v2 פרוס — Hero מלא, Sidebar 3-לשוניות זהב, חיפוש, כרטיסי סדרות. אישור: 30.4.2026.",
    status: "done",
  },
  {
    id: "family-bible",
    title: "תנ\"ך למשפחה ודור הפלאות",
    detail:
      "עיצוב אגף המשפחה הושלם. חוברת 'דור הפלאות' הוטמעה כ-PDF ישיר. הרב ציין שהאזור צריך 'עוד משהו' — מתוכנן: כניסה לפי גיל, רמה ויחידת לימוד.",
    status: "in_progress",
    pct: 65,
  },
  {
    id: "store-experience",
    title: "חוויית הרכישה בחנות",
    detail:
      "47 מוצרים זמינים. Checkout ו-CartDrawer עובדים. נותר: Mobile UX, תמונות מוצרים חסרות, סינון לפי קטגוריה ב-Mobile.",
    status: "in_progress",
    pct: 70,
  },
  {
    id: "admin",
    title: "אדמין ושליטה בנתונים",
    detail:
      "לוח בקרה עם ניהול שיעורים, סדרות, רבנים ומוצרים. ייבוא מ-Umbraco, כלי השוואת תוכן. נותר: עריכה ישירה בממשק, ניהול תמונות, דוחות.",
    status: "in_progress",
    pct: 70,
  },
  {
    id: "netspark",
    title: "יציבות טכנית ו-NetSpark",
    detail:
      "תוקן Tier 3 של NetSpark (חסימת URL בבאנדל) — base64 encoding לכתובות Supabase. האתר יציב ב-bneyzion.vercel.app. מוכן לחיבור DNS ל-bneyzion.co.il.",
    status: "done",
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: StatusKey }) => {
  const meta = STATUS_META[status];
  const emoji = status === "done" ? "✓" : status === "in_progress" ? "◑" : "◉";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "20px",
        background: meta.badge,
        color: meta.dot,
        fontSize: "12px",
        fontWeight: 600,
        fontFamily: "Ploni, sans-serif",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: "10px" }}>{emoji}</span>
      {meta.label}
    </span>
  );
};

const ProgressBar = ({ pct }: { pct: number }) => (
  <div
    style={{
      marginTop: "10px",
      height: "5px",
      borderRadius: "3px",
      background: "rgba(184,134,11,0.18)",
      overflow: "hidden",
    }}
    role="progressbar"
    aria-valuenow={pct}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      style={{
        height: "100%",
        width: `${pct}%`,
        borderRadius: "3px",
        background: `linear-gradient(90deg, ${colors.goldDark}, ${colors.goldLight})`,
        transition: "width 0.6s ease",
      }}
    />
  </div>
);

const ItemCard = ({ item }: { item: ProgressItem }) => (
  <div
    style={{
      background: item.status === "done"
        ? "rgba(250,246,240,0.7)"
        : colors.parchment,
      border: `1px solid ${item.status === "done" ? "rgba(139,111,71,0.18)" : "rgba(139,111,71,0.28)"}`,
      borderRadius: "14px",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      opacity: item.status === "done" ? 0.92 : 1,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
      <h3
        style={{
          fontFamily: 'Kedem, "Frank Ruhl Libre", serif',
          fontSize: "17px",
          fontWeight: 700,
          color: colors.textDark,
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {item.title}
      </h3>
      <StatusBadge status={item.status} />
    </div>

    <p
      style={{
        fontFamily: "Ploni, sans-serif",
        fontSize: "13.5px",
        color: colors.textMuted,
        margin: 0,
        lineHeight: 1.65,
      }}
    >
      {item.detail}
    </p>

    {item.status === "in_progress" && item.pct !== undefined && (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ flex: 1 }}>
          <ProgressBar pct={item.pct} />
        </div>
        <span
          style={{
            fontFamily: "Ploni, sans-serif",
            fontSize: "12px",
            color: colors.goldDark,
            fontWeight: 600,
            minWidth: "32px",
          }}
        >
          {item.pct}%
        </span>
      </div>
    )}
  </div>
);

// ── Page ─────────────────────────────────────────────────────────────────────

const doneCnt = ITEMS.filter((i) => i.status === "done").length;
const inProgressCnt = ITEMS.filter((i) => i.status === "in_progress").length;
const buildingCnt = ITEMS.filter((i) => i.status === "building").length;

const Progress2026 = () => (
  <Layout sidebar={false}>
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: colors.parchment,
        paddingBottom: "60px",
      }}
    >
      {/* ── Hero ── */}
      <section
        style={{
          background: `linear-gradient(180deg, ${colors.navyDeep} 0%, #162038 100%)`,
          padding: "48px 24px 44px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "Ploni, sans-serif",
            fontSize: "13px",
            color: colors.goldShimmer,
            letterSpacing: "0.12em",
            margin: "0 0 12px",
            textTransform: "uppercase",
          }}
        >
          בני ציון · 2026
        </p>
        <h1
          style={{
            fontFamily: 'Kedem, "Frank Ruhl Libre", serif',
            fontSize: "clamp(26px, 5vw, 40px)",
            fontWeight: 800,
            color: "#FAF6F0",
            margin: "0 0 14px",
            lineHeight: 1.2,
          }}
        >
          סקירת התקדמות
        </h1>
        <p
          style={{
            fontFamily: "Ploni, sans-serif",
            fontSize: "15px",
            color: "rgba(250,246,240,0.72)",
            maxWidth: "480px",
            margin: "0 auto 28px",
            lineHeight: 1.65,
          }}
        >
          מה עשינו, מה בדרך, ומה עוד לפנינו — כל המהלכים העיקריים ב-2026 ברמה אחת.
        </p>

        {/* Summary pills */}
        <div
          style={{
            display: "inline-flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { label: `${doneCnt} הושלמו`, color: "#4A6741", bg: "rgba(74,103,65,0.2)" },
            { label: `${inProgressCnt} בתהליך`, color: colors.goldLight, bg: "rgba(196,162,101,0.2)" },
            { label: `${buildingCnt} בבנייה`, color: "#7AAFF5", bg: "rgba(122,175,245,0.2)" },
          ].map((pill) => (
            <span
              key={pill.label}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                background: pill.bg,
                color: pill.color,
                fontFamily: "Ploni, sans-serif",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {pill.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Grid ── */}
      <section
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "36px 20px 0",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "14px",
          }}
        >
          {ITEMS.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* ── Up Next ── */}
      <section
        style={{
          maxWidth: "960px",
          margin: "36px auto 0",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, rgba(139,111,71,0.08), rgba(139,111,71,0.04))`,
            border: `1px solid rgba(139,111,71,0.2)`,
            borderRadius: "16px",
            padding: "24px 28px",
          }}
        >
          <h2
            style={{
              fontFamily: 'Kedem, "Frank Ruhl Libre", serif',
              fontSize: "20px",
              fontWeight: 700,
              color: colors.textDark,
              margin: "0 0 16px",
            }}
          >
            מה הלאה
          </h2>
          <ul
            style={{
              fontFamily: "Ploni, sans-serif",
              fontSize: "14px",
              color: colors.textMuted,
              margin: 0,
              paddingInlineStart: "18px",
              lineHeight: 1.9,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "2px 24px",
              listStyle: "none",
              paddingRight: "0",
            }}
          >
            {[
              "חיבור DNS ל-bneyzion.co.il",
              "קמפיין ספר יהושע — סיוון",
              "תכנית הפרק השבועי לקהלת — אלול",
              "אדמין: עריכה ישירה + ניהול תמונות",
              "תנ\"ך למשפחה: כניסה לפי גיל ורמה",
              "מעבר Grow לסביבת Production",
            ].map((item) => (
              <li
                key={item}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ color: colors.goldDark, fontSize: "10px" }}>◆</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          textAlign: "center",
          marginTop: "36px",
          fontFamily: "Ploni, sans-serif",
          fontSize: "12px",
          color: colors.textSubtle,
        }}
      >
        עודכן לאחרונה: 27 במאי 2026
      </footer>
    </div>
  </Layout>
);

export default Progress2026;
