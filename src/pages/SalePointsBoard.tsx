/**
 * לוח נקודות האיסוף של "דור הפלאות" (18.9.2026) — רעיון הרב יואב:
 * לכל שגריר בנקודת איסוף תהיה דרך לראות כמה ספרים הוזמנו דרכו, כדי לדרבן.
 *
 * הכרעות:
 *  - בלי כניסה ובלי חשבון (יואב: "לא הייתי עושה להם כניסה לאתר וגוגל"), קישור
 *    אחד פתוח לכולם (סער 17.9: "לא קישור אישי לכל אחד, פשוט פתוח לכולם").
 *  - הדף קורא מ-v_sale_point_leaderboard בלבד: ספירות לכל נקודה, בלי שם רוכש,
 *    בלי טלפון ובלי סכומי כסף. donations עצמה נשארת סגורה ל-RLS.
 *  - חיפוש חופשי כדי שכל אחד ימצא את עצמו, ולצידו הממוצע והמובילה, כמו שיואב
 *    ביקש ("מה הממוצע בתחנות, מה הכי גבוהה, ואיפה הוא").
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, BookOpen, TrendingUp, Trophy, Truck, X } from "lucide-react";

const C = {
  navy: "#1A2744",
  gold: "#8B6F47",
  goldSoft: "#E8D5A0",
  cream: "#FAF6F0",
  text: "#2D1F0E",
  muted: "#6B5C4A",
};

interface BoardRow {
  id: string;
  name: string;
  region: string | null;
  books: number;
  orders: number;
}

interface Summary {
  total_books: number;
  total_orders: number;
  direct_books: number;
  direct_orders: number;
}

/**
 * הסך-הכול נקרא בנפרד, ולא כסכום השורות (18.9.2026, הערת נחמה): הזמנות של
 * 5 ספרים ומעלה כוללות משלוח עד הבית ואין להן נקודת איסוף, ולכן הן לא מופיעות
 * בשום שורה בלוח. סכימת השורות בלבד החסירה 35 ספרים מתוך 133.
 */
function useSummary() {
  return useQuery<Summary>({
    queryKey: ["dor-books-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_dor_books_summary").select("*").maybeSingle();
      if (error) throw error;
      return (data ?? { total_books: 0, total_orders: 0, direct_books: 0, direct_orders: 0 }) as Summary;
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });
}

function useLeaderboard() {
  return useQuery<BoardRow[]>({
    queryKey: ["sale-point-leaderboard"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_sale_point_leaderboard")
        .select("id, name, region, books, orders");
      if (error) throw error;
      return ((data ?? []) as BoardRow[]).sort(
        (a, b) => b.books - a.books || a.name.localeCompare(b.name, "he"),
      );
    },
    // מספרים חיים בקמפיין פעיל — רענון קצר, בלי להפציץ את ה-DB.
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });
}

/** "צפון | חיספין" → היישוב בלבד. שם בלי מפריד נשאר כמו שהוא. */
function placeOf(name: string) {
  const i = name.indexOf(" | ");
  return i >= 0 ? name.slice(i + 3) : name;
}

function normalize(s: string) {
  return s.replace(/["'׳״]/g, "").trim().toLowerCase();
}

export default function SalePointsBoard() {
  const { data: rows, isLoading, isError } = useLeaderboard();
  const { data: summary } = useSummary();
  const [q, setQ] = useState("");

  const stats = useMemo(() => {
    const list = rows ?? [];
    const pointBooks = list.reduce((s, r) => s + r.books, 0);
    const active = list.filter((r) => r.books > 0);
    return {
      // הסך-הכול מכל המכירות, כולל משלוחים עד הבית שאינם משויכים לנקודה.
      totalBooks: summary?.total_books ?? pointBooks,
      points: list.length,
      top: list[0]?.books ?? 0,
      // הממוצע נשאר על נקודות האיסוף בלבד — זו ההשוואה הרלוונטית לשגריר.
      avg: active.length ? Math.round((pointBooks / active.length) * 10) / 10 : 0,
    };
  }, [rows, summary]);

  const needle = normalize(q);
  const matches = useMemo(() => {
    if (!needle) return null;
    return (rows ?? []).filter((r) => normalize(r.name).includes(needle));
  }, [rows, needle]);

  const visible = matches ?? rows ?? [];

  return (
    <div dir="rtl" style={{ background: C.cream, minHeight: "100vh", color: C.text }}>
      <header style={{ background: C.navy, padding: "26px 18px 30px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <p className="font-ploni" style={{ color: C.goldSoft, fontSize: 13, letterSpacing: ".04em", margin: 0 }}>
            תנועת בני ציון ללימוד תנ"ך
          </p>
          <h1 className="font-heading" style={{ color: "#fff", fontSize: 27, fontWeight: 900, margin: "8px 0 6px", lineHeight: 1.3 }}>
            דור הפלאות · לוח נקודות האיסוף
          </h1>
          <p className="font-ploni" style={{ color: "#C9D3E4", fontSize: 14.5, margin: 0, lineHeight: 1.7 }}>
            חפשו את הנקודה שלכם וראו כמה ספרים הוזמנו דרככם
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "0 14px 60px" }}>
        {/* רצועת מספרים — בנייד שורה אחת, לפי כלל הסטריפ של סער */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            background: "#fff",
            border: `1px solid ${C.goldSoft}`,
            borderRadius: 14,
            padding: "14px 10px",
            marginTop: -18,
            boxShadow: "0 6px 20px rgba(26,39,68,.08)",
          }}
        >
          {[
            { icon: BookOpen, val: stats.totalBooks, label: "ספרים בסך הכול" },
            { icon: TrendingUp, val: stats.avg, label: "ממוצע לנקודה פעילה" },
            { icon: Trophy, val: stats.top, label: "הנקודה המובילה" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <s.icon size={17} color={C.gold} style={{ margin: "0 auto 4px", display: "block" }} aria-hidden />
              <div className="font-heading" style={{ fontSize: 21, fontWeight: 900, color: C.navy, lineHeight: 1.1 }}>
                {isLoading ? "…" : s.val}
              </div>
              <div className="font-ploni" style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: "relative", margin: "18px 0 6px" }}>
          <Search
            size={17}
            color={C.muted}
            style={{ position: "absolute", insetInlineStart: 13, top: "50%", transform: "translateY(-50%)" }}
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חפשו יישוב או אזור, למשל: עלי"
            aria-label="חיפוש נקודת איסוף"
            className="font-ploni"
            style={{
              width: "100%",
              padding: "13px 40px 13px 40px",
              borderRadius: 12,
              border: `1.5px solid ${C.goldSoft}`,
              background: "#fff",
              fontSize: 15.5,
              color: C.text,
              outline: "none",
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="ניקוי החיפוש"
              style={{
                position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0,
              }}
            >
              <X size={17} color={C.muted} aria-hidden />
            </button>
          )}
        </div>

        {isError && (
          <p className="font-ploni" style={{ textAlign: "center", color: C.muted, padding: "30px 0" }}>
            הנתונים לא נטענו כרגע. נסו לרענן את הדף.
          </p>
        )}

        {matches && (
          <p className="font-ploni" style={{ fontSize: 13.5, color: C.muted, margin: "0 0 10px" }}>
            {matches.length === 0
              ? "לא נמצאה נקודה בשם הזה. אפשר לחפש רק את שם היישוב."
              : `נמצאו ${matches.length} נקודות`}
          </p>
        )}

        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {visible.map((r) => {
            const rank = (rows ?? []).findIndex((x) => x.id === r.id) + 1;
            const hit = !!matches && matches.length > 0;
            return (
              <li
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  background: "#fff",
                  border: hit ? `2px solid ${C.gold}` : `1px solid ${C.goldSoft}`,
                  borderRadius: 12,
                  padding: "11px 13px",
                }}
              >
                <span
                  className="font-heading"
                  aria-label={`מקום ${rank}`}
                  style={{
                    minWidth: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: rank <= 3 && r.books > 0 ? C.navy : C.cream,
                    color: rank <= 3 && r.books > 0 ? C.goldSoft : C.muted,
                    display: "grid", placeItems: "center", fontSize: 13.5, fontWeight: 900,
                  }}
                >
                  {rank}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="font-heading" style={{ display: "block", fontSize: 15.5, fontWeight: 800, color: C.navy, lineHeight: 1.3 }}>
                    {placeOf(r.name)}
                  </span>
                  {r.region && (
                    <span className="font-ploni" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                      <MapPin size={12} aria-hidden />
                      {r.region}
                    </span>
                  )}
                </span>
                <span style={{ textAlign: "center", flexShrink: 0 }}>
                  <span className="font-heading" style={{ display: "block", fontSize: 19, fontWeight: 900, color: r.books ? C.gold : "#C4B9A8", lineHeight: 1 }}>
                    {r.books}
                  </span>
                  <span className="font-ploni" style={{ fontSize: 11, color: C.muted }}>ספרים</span>
                </span>
              </li>
            );
          })}
        </ol>

        {!!summary?.direct_books && !needle && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 11, marginTop: 8,
              background: "#fff", border: `1px dashed ${C.goldSoft}`, borderRadius: 12, padding: "11px 13px",
            }}
          >
            <span style={{ minWidth: 30, height: 30, borderRadius: 8, flexShrink: 0, background: C.cream, display: "grid", placeItems: "center" }}>
              <Truck size={15} color={C.muted} aria-hidden />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="font-heading" style={{ display: "block", fontSize: 15, fontWeight: 800, color: C.navy, lineHeight: 1.3 }}>
                משלוח עד הבית
              </span>
              <span className="font-ploni" style={{ fontSize: 12.5, color: C.muted }}>
                הזמנות של 5 ספרים ומעלה, בלי נקודת איסוף
              </span>
            </span>
            <span style={{ textAlign: "center", flexShrink: 0 }}>
              <span className="font-heading" style={{ display: "block", fontSize: 19, fontWeight: 900, color: C.muted, lineHeight: 1 }}>
                {summary.direct_books}
              </span>
              <span className="font-ploni" style={{ fontSize: 11, color: C.muted }}>ספרים</span>
            </span>
          </div>
        )}

        {!isLoading && !isError && (
          <p className="font-ploni" style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 20, lineHeight: 1.8 }}>
            הספירה מתעדכנת אוטומטית עם כל הזמנה שמשולמת.
            <br />
            נקודה שעדיין לא מופיעה כאן, או טעות בשם, אפשר לכתוב לנו והיא תתוקן.
          </p>
        )}
      </main>
    </div>
  );
}
