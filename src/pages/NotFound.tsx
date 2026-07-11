import { useLocation, Link, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Home, Search, Library } from "lucide-react";
import Layout from "@/components/layout/Layout";
import GlobalSearch from "@/components/search/GlobalSearch";
import { isLegacyContentPath, resolveLegacyContentUrl } from "@/lib/legacyResolver";

/**
 * Client-side safety net for old Umbraco (www.bneyzion.co.il) URLs.
 * All legacy routing is handled in-house (Saar's rule: no vercel.json
 * redirects). Two layers:
 *   1. Deep content URLs (/מאגר-עזרי-הלמידה/..., /מאגר-השיעורים-והמאמרים/...)
 *      → LegacyContentRedirect below resolves them against Supabase to the
 *      exact series/lesson page (see src/lib/legacyResolver.ts).
 *   2. Simple top-level pages → the static map here.
 * SEO: this is a client-side JS redirect — Google follows it and indexes the
 * destination; the canonical stays the target page's own canonical.
 */
const LEGACY_PATHS: Record<string, string> = {
  "אודותינו": "/about",
  "צור-קשר": "/contact",
  "תרומות": "/donate",
  "חנות-הספרים": "/store",
  "אגף-המורים": "/teachers",
  // ⚠️ "מאגר-עזרי-הלמידה" deliberately NOT mapped here — its deep URLs point
  // at real series/lessons and are resolved exactly by LegacyContentRedirect.
  "בן-ציון-חיים-הנמן-היד": "/memorial",
  "פרשת-השבוע": "/parasha",
  "דרך-לימוד-התנך": "/series",
  "מקורות-על-חשיבות-לימוד-תנך": "/series",
  "תורה": "/series",
  "נביאים": "/series",
  "כתובים": "/series",
  "משנה": "/series",
  "גמרא": "/series",
  "הלכה": "/series",
  "מחשבה": "/series",
  "אמונה-ומוסר": "/series",
  "מועדים": "/series",
  "חגים": "/series",
  "מגילות": "/series",
  "מדרשים": "/series",
  "שיעורים": "/series",
  "מאמרים": "/series",
  "רבנים": "/rabbis",
  "כנס": "/kenes",
};

/** Returns the new path for a known legacy URL, or null if none matches. */
function resolveLegacyPath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  // Match on the first segment only (Umbraco pages were top-level Hebrew slugs);
  // deep children (/חנות-הספרים/xxx) fold back to their section landing page.
  const firstSegment = decoded.replace(/^\/+/, "").split("/")[0];
  return LEGACY_PATHS[firstSegment] ?? null;
}

/**
 * Resolves a deep legacy content URL (old learning-aids / shiurim repositories)
 * to the exact new-site page via Supabase, showing a minimal parchment+gold
 * loader meanwhile — never a 404 flash for a Hebrew content path.
 */
const LegacyContentRedirect = ({ decodedPath }: { decodedPath: string }) => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    resolveLegacyContentUrl(decodedPath)
      .then((res) => {
        if (!cancelled) navigate(res.target, { replace: true });
      })
      .catch(() => {
        if (!cancelled) navigate("/series", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [decodedPath, navigate]);

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center gap-5 section-gradient-warm"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-10 w-10 rounded-full border-[3px] border-accent/30 border-t-accent animate-spin"
        aria-hidden="true"
      />
      <p className="font-serif text-base text-muted-foreground">
        רק רגע, מאתרים בשבילכם את הדף המדויק…
      </p>
    </div>
  );
};

const bookPages = [
  { text: "בְּרֵאשִׁית בָּרָא אֱלֹהִים", opacity: 0.15, y: -20 },
  { text: "אֵת הַשָּׁמַיִם וְאֵת הָאָֽרֶץ", opacity: 0.12, y: 10 },
  { text: "וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ", opacity: 0.1, y: 40 },
  { text: "וְרוּחַ אֱלֹהִים מְרַחֶפֶת", opacity: 0.08, y: 70 },
];

const NotFound = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(location.pathname);
  } catch {
    decodedPath = location.pathname;
  }

  // Deep legacy content URL → exact series/lesson resolution (async, in-house).
  const isLegacyContent = isLegacyContentPath(decodedPath);

  // Simple top-level legacy page → static map.
  const legacyTarget = isLegacyContent ? null : resolveLegacyPath(location.pathname);

  useEffect(() => {
    if (!legacyTarget && !isLegacyContent) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname, legacyTarget, isLegacyContent]);

  if (isLegacyContent) {
    return <LegacyContentRedirect decodedPath={decodedPath} />;
  }

  if (legacyTarget) {
    return <Navigate to={legacyTarget} replace />;
  }

  return (
    <Layout>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden section-gradient-warm" dir="rtl">
        <div className="absolute inset-0 noise-overlay opacity-5 pointer-events-none" />

        {/* Animated Bible text background */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden">
          {bookPages.map((page, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              animate={{ opacity: page.opacity, x: 0 }}
              transition={{ delay: 0.8 + i * 0.3, duration: 1.2 }}
              className="font-serif text-3xl md:text-5xl text-primary/20 whitespace-nowrap"
              style={{ transform: `translateY(${page.y}px)` }}
            >
              {page.text}
            </motion.p>
          ))}
        </div>

        <div className="container relative z-10 text-center max-w-lg py-20">
          {/* Animated open book */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 inline-block"
          >
            <div className="relative">
              <motion.div
                animate={{ rotateZ: [0, -3, 3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 border border-primary/20 flex items-center justify-center shadow-xl shadow-primary/10"
              >
                <BookOpen className="h-14 w-14 md:h-18 md:w-18 text-primary" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full"
              >
                404
              </motion.span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-4xl font-heading text-foreground mb-3">
              הדף לא נמצא
            </h1>
            <p className="text-muted-foreground font-serif mb-2 text-base md:text-lg">
              אולי הדף הזה עדיין לא נכתב...
            </p>
            <p className="text-muted-foreground font-serif mb-6 text-sm">
              אבל בתנ״ך יש הרבה תוכן שכן!
            </p>

            {/* Search — real global search over rabbis, series, lessons, books */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group mx-auto mb-8 flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-right transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="חיפוש באתר"
            >
              <Search className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
              <span className="flex-1 font-display text-sm text-muted-foreground group-hover:text-foreground">
                חפשו רב, סדרה, שיעור או ספר...
              </span>
              <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-display text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                לדף הבית
              </Link>
              <Link
                to="/parasha"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground rounded-xl font-display text-sm hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                פרשת השבוע
              </Link>
              <Link
                to="/rabbis"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground rounded-xl font-display text-sm hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Library className="h-4 w-4" aria-hidden="true" />
                שיעורים לפי רב
              </Link>
            </div>
          </motion.div>

          {/* Ornament */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex items-center justify-center gap-3 text-accent/40"
          >
            <span className="h-px w-16 bg-accent/30" />
            <span className="font-serif text-xs text-muted-foreground">״כִּי נֵר מִצְוָה וְתוֹרָה אוֹר״</span>
            <span className="h-px w-16 bg-accent/30" />
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
