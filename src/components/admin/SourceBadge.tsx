/**
 * SourceBadge — תגית "מקור: X" קטנה לכל מדד/סקשן בדשבורד המאוחד (הוראת סער 10.7:
 * "תציין מהיכן לקוחים הנתונים"). שימוש: <SourceBadge source="Monday" />.
 */

const SOURCE_COLORS: Record<string, { bg: string; color: string }> = {
  Monday:   { bg: "#EEF2FF", color: "#3730A3" }, // אינדיגו — לוח Monday של יואב
  Supabase: { bg: "#ECFDF5", color: "#065F46" }, // ירוק — ה-DB של האתר
  Grow:     { bg: "#FDF4E7", color: "#92400E" }, // ענבר — סליקה בפועל
};

export function SourceBadge({ source, note }: { source: string; note?: string }) {
  const c = SOURCE_COLORS[source] ?? { bg: "#F1F5F9", color: "#475569" };
  return (
    <span
      dir="rtl"
      title={note}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: c.bg,
        color: c.color,
        borderRadius: 99,
        padding: "1px 8px",
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
        lineHeight: 1.6,
      }}
    >
      מקור: {source}
      {note ? <span style={{ fontWeight: 400, opacity: 0.85 }}>· {note}</span> : null}
    </span>
  );
}
