/**
 * KenesArchive — ארכיון כנסי בני ציון
 * Route: /kenes-archive
 *
 * רשימה של כל הכנסים עם לינקים לדפים הייעודיים.
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useSEO } from "@/hooks/useSEO";
// רמה 21 (סער 17.7): הרשימה עברה למקור-אמת משותף — משרת גם את קטגוריית "ימי עיון בתנ"ך"
import { KNESIM } from "@/data/kenesim";

export default function KenesArchive() {
  useSEO({
    title: "ארכיון כנסי בני ציון",
    description: "כל כנסי תנועת בני ציון ללימוד תנ״ך — הקלטות, סיכומים ותורה",
  });

  return (
    <Layout>
      <div dir="rtl" className="min-h-screen bg-[hsl(38_50%_93%)]">

        {/* ===== HEADER ===== */}
        <section className="py-14 md:py-20 px-4 text-center">
          <h1 className="font-kedem font-bold text-3xl md:text-5xl text-[hsl(30_40%_20%)] mb-3">
            ארכיון כנסי בני ציון
          </h1>
          <p className="font-ploni text-[hsl(30_30%_45%)] text-base md:text-lg max-w-xl mx-auto">
            כנסים עם גדולי תורה על הפרשה, על הגאולה, ועל חיינו — פתוחים לצפייה ולימוד
          </p>
        </section>

        {/* ===== KNESIM LIST ===== */}
        <section className="pb-20 px-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            {KNESIM.map((knes) => (
              <Link
                key={knes.slug}
                to={knes.to}
                className="group block rounded-2xl border border-[hsl(38_45%_80%)] bg-[hsl(38_50%_96%)] p-6 md:p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[hsl(43_70%_55%)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-ploni text-xs text-[hsl(30_30%_55%)]">{knes.hebrewDate}</span>
                      <span className="font-ploni text-xs text-[hsl(30_30%_65%)]">·</span>
                      <span className="font-ploni text-xs text-[hsl(30_30%_55%)]">{knes.date}</span>
                      {knes.badge && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[hsl(43_70%_47%)] text-white font-ploni text-xs">
                          {knes.badge}
                        </span>
                      )}
                    </div>
                    <h2 className="font-kedem font-bold text-xl md:text-2xl text-[hsl(30_40%_22%)] mb-1 group-hover:text-[hsl(30_50%_18%)] transition-colors">
                      {knes.title}
                    </h2>
                    <p className="font-ploni text-[hsl(30_30%_45%)] text-sm leading-relaxed mb-4">
                      {knes.subtitle}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {knes.rabbis.map((r) => (
                        <span
                          key={r}
                          className="inline-block px-2.5 py-1 rounded-lg bg-[hsl(38_40%_88%)] text-[hsl(30_35%_35%)] font-ploni text-xs"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(43_70%_47%/0.12)] text-[hsl(43_60%_40%)] group-hover:bg-[hsl(43_70%_47%)] group-hover:text-white transition-all duration-200">
                    <ArrowLeft className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </Layout>
  );
}
