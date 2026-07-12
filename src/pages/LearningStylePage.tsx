/**
 * LearningStylePage — /learning-style/:key (רמה 13, הערת יואב 9.7)
 *
 * ניווט לפי אופי-הלימוד: מוקלט / מוקלט+פירוש / PDF+פירוש / מבטים רחבים —
 * "כמו אגף המורים שוויתר על תגיות". הסיווג דטרמיניסטי, צד-שרת, ב-RPC
 * get_learning_style_series (set-based; pg_column_size לזיהוי פירוש-כתוב
 * בלי detoast — length() עשה statement-timeout כ-anon על 23K שיעורים).
 *
 * Layout: DesignLayout (v2 + sidebar). Cream+gold, RTL — כמו CategoryPage.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Headphones,
  BookOpenText,
  FileText,
  Telescope,
  ChevronLeft,
  AlertCircle,
  Search,
  SearchX,
  X,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, radii, getSeriesCoverImage } from "@/lib/designTokens";
import { Seo, collectionJsonLd, breadcrumbJsonLd } from "@/components/seo/Seo";
import { supabase } from "@/integrations/supabase/client";

const STYLE_META: Record<
  string,
  { label: string; Icon: typeof Headphones; desc: string }
> = {
  muklat: {
    label: "מוקלט",
    Icon: Headphones,
    desc: "סדרות של שיעורים מוקלטים — שמע ווידאו — להאזנה ולצפייה.",
  },
  "muklat-perush": {
    label: "מוקלט + פירוש",
    Icon: BookOpenText,
    desc: "סדרות שבהן לצד ההקלטה יש גם פירוש כתוב ללימוד מהמסך.",
  },
  "pdf-perush": {
    label: "PDF + פירוש",
    Icon: FileText,
    desc: "סדרות עם קבצים להורדה ולהדפסה לצד פירוש כתוב.",
  },
  mabatim: {
    label: "מבטים רחבים",
    Icon: Telescope,
    desc: "מבט כללי וסקירות רוחב על ספרי התנ״ך ותקופותיו.",
  },
};

interface StyleSeries {
  id: string;
  title: string;
  image_url: string | null;
  rabbi_name: string | null;
  match_count: number;
}

function useLearningStyleSeries(styleKey: string | undefined) {
  return useQuery({
    queryKey: ["learning-style-series", styleKey],
    enabled: !!styleKey && !!STYLE_META[styleKey ?? ""],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_learning_style_series", {
        style: styleKey,
      });
      if (error) throw error;
      return (data ?? []) as StyleSeries[];
    },
  });
}

const PAGE_SIZE = 60;

export default function LearningStylePage() {
  const { key } = useParams<{ key: string }>();
  const meta = key ? STYLE_META[key] : undefined;
  const { data: series = [], isLoading } = useLearningStyleSeries(key);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // חיפוש בתוך המסלול — סינון מיידי בצד-הלקוח (ה-RPC מחזיר את כל הסדרות מראש)
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 200);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE); // חיפוש חדש מאפס את "הצגת עוד"
  }, [query]);

  const filtered = useMemo(() => {
    if (!query) return series;
    const q = query.toLowerCase();
    return series.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.rabbi_name ?? "").toLowerCase().includes(q),
    );
  }, [series, query]);

  if (key && !meta) return <Navigate to="/" replace />;
  const { label, Icon, desc } = meta ?? STYLE_META.muklat;

  const visible = filtered.slice(0, visibleCount);
  const path = `/learning-style/${key}`;

  return (
    <DesignLayout>
      <Seo
        title={`${label} — לפי אופי הלימוד`}
        description={desc}
        url={`https://bneyzion.co.il${path}`}
        jsonLd={[
          collectionJsonLd({ name: label, description: desc, path }),
          breadcrumbJsonLd([
            { name: "בית", path: "/" },
            { name: label, path },
          ]),
        ]}
      />

      {/* ── Hero ── */}
      <div
        dir="rtl"
        style={{
          background: `linear-gradient(160deg, #FBF6EC 0%, #F5EFE0 60%, #EDE5D0 100%)`,
          borderBottom: `1px solid rgba(139,111,71,0.12)`,
          padding: "2.5rem 2rem 2rem",
        }}
      >
        <nav aria-label="ניווט" style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "1rem" }}>
          <Link
            to="/"
            style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.textSubtle, textDecoration: "none" }}
          >
            ראשי
          </Link>
          <ChevronLeft size={12} style={{ color: colors.textSubtle }} />
          <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark, fontWeight: 600 }}>
            לפי אופי הלימוד
          </span>
        </nav>

        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            fontWeight: 700,
            color: colors.textDark,
            margin: 0,
            lineHeight: 1.2,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <Icon size={30} style={{ color: colors.goldDark, flexShrink: 0 }} />
          {label}
        </h1>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "0.92rem",
            color: colors.textMuted,
            marginTop: "0.6rem",
            marginBottom: 0,
            maxWidth: 560,
            lineHeight: 1.65,
          }}
        >
          {desc}
        </p>
        {!isLoading && series.length > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              marginTop: "1rem",
              padding: "0.3rem 0.75rem",
              borderRadius: radii.pill,
              background: "rgba(139,111,71,0.08)",
              border: `1px solid rgba(139,111,71,0.15)`,
              fontFamily: fonts.body,
              fontSize: "0.78rem",
              color: colors.goldDark,
              fontWeight: 600,
            }}
          >
            {series.length} סדרות
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div dir="rtl" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 80,
                  borderRadius: radii.lg,
                  background: "rgba(139,111,71,0.07)",
                  animation: "pulse 1.5s ease infinite",
                }}
              />
            ))}
          </div>
        ) : series.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "3rem 1.5rem",
              gap: "1rem",
              color: colors.textSubtle,
              textAlign: "center",
            }}
          >
            <AlertCircle size={40} style={{ opacity: 0.4 }} />
            <div style={{ fontFamily: fonts.display, fontSize: "1.1rem", fontWeight: 600, color: colors.textMuted }}>
              אין כרגע סדרות במסלול {label}
            </div>
          </div>
        ) : (
          <>
            {/* ── חיפוש במסלול ── */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="learning-style-search"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              >
                חיפוש במסלול {label}
              </label>
              <div style={{ position: "relative", maxWidth: 420 }}>
                <Search
                  size={16}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    insetInlineStart: "0.85rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: colors.textSubtle,
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="learning-style-search"
                  type="text"
                  dir="rtl"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="חיפוש במסלול..."
                  autoComplete="off"
                  style={{
                    width: "100%",
                    padding: "0.6rem 2.4rem",
                    borderRadius: radii.pill,
                    border: `1px solid rgba(139,111,71,0.25)`,
                    background: "white",
                    fontFamily: fonts.body,
                    fontSize: "0.88rem",
                    color: colors.textDark,
                    outline: "none",
                    boxShadow: "0 1px 4px rgba(45,31,14,0.04)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.goldDark;
                    e.currentTarget.style.boxShadow = "0 2px 10px rgba(139,111,71,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(139,111,71,0.25)";
                    e.currentTarget.style.boxShadow = "0 1px 4px rgba(45,31,14,0.04)";
                  }}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    aria-label="ניקוי החיפוש"
                    style={{
                      position: "absolute",
                      insetInlineEnd: "0.6rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(139,111,71,0.10)",
                      color: colors.goldDark,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
              {query && filtered.length > 0 && (
                <div
                  aria-live="polite"
                  style={{
                    marginTop: "0.5rem",
                    fontFamily: fonts.body,
                    fontSize: "0.78rem",
                    color: colors.textMuted,
                  }}
                >
                  {filtered.length === 1 ? "סדרה אחת נמצאה" : `${filtered.length} סדרות נמצאו`}
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "2.5rem 1.5rem",
                  gap: "0.75rem",
                  color: colors.textSubtle,
                  textAlign: "center",
                }}
              >
                <SearchX size={36} style={{ opacity: 0.4 }} aria-hidden="true" />
                <div style={{ fontFamily: fonts.display, fontSize: "1.05rem", fontWeight: 600, color: colors.textMuted }}>
                  לא נמצאו תוצאות במסלול הזה
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textSubtle }}>
                  אפשר לנסות מילה אחרת או קצרה יותר
                </div>
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  style={{
                    marginTop: "0.25rem",
                    padding: "0.45rem 1.3rem",
                    borderRadius: radii.pill,
                    border: `1px solid ${colors.goldDark}`,
                    background: "transparent",
                    color: colors.goldDark,
                    fontFamily: fonts.body,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ניקוי החיפוש
                </button>
              </div>
            ) : (
              <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {visible.map((s) => (
                <Link key={s.id} to={`/series/${s.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      borderRadius: radii.lg,
                      overflow: "hidden",
                      background: "white",
                      border: `1px solid rgba(139,111,71,0.10)`,
                      boxShadow: "0 2px 8px rgba(45,31,14,0.06)",
                      transition: "box-shadow 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(139,111,71,0.18)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,111,71,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(45,31,14,0.06)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,111,71,0.10)";
                    }}
                  >
                    <div style={{ width: 90, flexShrink: 0, overflow: "hidden", background: "#EDE5D6" }}>
                      <img
                        src={s.image_url || getSeriesCoverImage(s.title) || "/images/series-default.webp"}
                        alt={s.title}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/images/series-default.webp";
                        }}
                      />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: "0.75rem 1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontFamily: fonts.display, fontSize: "0.98rem", fontWeight: 700, color: colors.textDark, lineHeight: 1.3 }}>
                        {s.title}
                      </span>
                      {s.rabbi_name && (
                        <span style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMuted }}>
                          {s.rabbi_name}
                        </span>
                      )}
                      <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.goldDark, fontWeight: 600 }}>
                        {s.match_count} תכנים במסלול זה
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", paddingInlineEnd: "1rem", color: colors.textSubtle }}>
                      <ChevronLeft size={16} style={{ transform: "rotate(180deg)" }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length > visibleCount && (
              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  style={{
                    padding: "0.6rem 1.6rem",
                    borderRadius: radii.pill,
                    border: `1px solid ${colors.goldDark}`,
                    background: "transparent",
                    color: colors.goldDark,
                    fontFamily: fonts.body,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  הצגת עוד ({filtered.length - visibleCount} נותרו)
                </button>
              </div>
            )}
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </DesignLayout>
  );
}
