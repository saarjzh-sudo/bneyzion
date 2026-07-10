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
import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Headphones,
  BookOpenText,
  FileText,
  Telescope,
  ChevronLeft,
  AlertCircle,
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

  if (key && !meta) return <Navigate to="/" replace />;
  const { label, Icon, desc } = meta ?? STYLE_META.muklat;

  const visible = series.slice(0, visibleCount);
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

            {series.length > visibleCount && (
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
                  הצגת עוד ({series.length - visibleCount} נותרו)
                </button>
              </div>
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
