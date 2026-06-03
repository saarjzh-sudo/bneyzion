/**
 * /course/book-<slug> — Weekly Program Book Detail (data-driven, v1)
 *
 * Replaces the hardcoded DesignPreviewCourseDetail with a fully dynamic page
 * that works for all 6 books in the weekly program.
 *
 * Special cases:
 *  - אסתר (book-esther): chapters shown as pairs (פרקים א-ב etc.)
 *  - חגי-זכריה-מלאכי (book-haggai-zechariah-malachi): 3 sub-books, grouped by bible_book
 *  - דניאל (book-daniel): resources layer shown as "תכנים נוספים" section
 *
 * Access:
 *   hasAccess = useUserAccess(course.access_tag).hasAccess
 *             || useUserAccess('program:weekly-chapter').hasAccess
 *   Both hooks ALWAYS called (no conditional hooks).
 *
 * Built 2026-06-03 — feat/weekly-chapter-data-driven
 */
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  BookOpen, Lock, Play, Headphones, FileText,
  ChevronLeft, ChevronDown, Heart, Clock, Loader2,
  AlertCircle, Film, Volume2, X, BookMarked, Layers,
} from "lucide-react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/contexts/AuthContext";
import {
  useWeeklyBooks,
  useWeeklyBookBySlug,
  useCourseDataWithResources,
  type CommunityLesson,
  type ChapterLayersMulti,
  type WeeklyCourse,
} from "@/hooks/useCommunity";

// ── Hebrew helpers ─────────────────────────────────────────────────────────
const HEB_NUMS = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד","טו","טז","יז","יח","יט","כ","כא","כב","כג","כד"];
function hebNum(n: number) { return HEB_NUMS[n - 1] ?? String(n); }
function chapterLabel(n: number) { return `פרק ${hebNum(n)}`; }

// ── Esther: chapter-pair labels ────────────────────────────────────────────
function estherPairLabel(ch: number): string {
  // Esther has 10 chapters; we show 5 pairs: 1-2, 3-4, 5-6, 7-8, 9-10
  const pairIdx = Math.ceil(ch / 2);
  const a = (pairIdx - 1) * 2 + 1;
  const b = a + 1;
  return `פרקים ${hebNum(a)}′-${hebNum(b)}′`;
}

// ── Sub-book display names (for Haggai/Zechariah/Malachi) ─────────────────
const SUB_BOOK_NAMES: Record<string, string> = {
  haggai:   "חגי",
  zechariah:"זכריה",
  malachi:  "מלאכי",
  // Hebrew variants
  "חגי":    "חגי",
  "זכריה":  "זכריה",
  "מלאכי":  "מלאכי",
};
function subBookLabel(bible_book: string | null): string {
  if (!bible_book) return "ספר";
  return SUB_BOOK_NAMES[bible_book.toLowerCase()] ?? SUB_BOOK_NAMES[bible_book] ?? bible_book;
}

// ── Book accent colors ─────────────────────────────────────────────────────
const BOOK_ACCENTS: Record<string, string> = {
  "book-ezra":                    "#8B6F47",
  "book-nehemiah":                "#5B6E3A",
  "book-daniel":                  "#6B4E8B",
  "book-esther":                  "#A52A2A",
  "book-haggai-zechariah-malachi":"#3A7A85",
  "book-lamentations":            "#7A5A3A",
};

// ── NavItem type: intro | chapter-number | sub-book string ────────────────
type NavItem = "intro" | number | string;
type TabKey  = "base" | "enrichment" | "weekly";

// ── Media helpers ──────────────────────────────────────────────────────────
function mediaUrl(l: CommunityLesson) { return l.video_url ?? l.audio_url ?? l.attachment_url ?? null; }
function mediaKind(l: CommunityLesson): "video" | "audio" | "pdf" | "none" {
  if (l.video_url) return "video";
  if (l.audio_url) return "audio";
  if (l.attachment_url) return "pdf";
  return "none";
}
const KIND_COLOR: Record<string, string> = { video: colors.goldDark, audio: "#3a8a85", pdf: "#a52a2a", none: colors.textSubtle };
const KIND_LABEL: Record<string, string> = { video: "וידאו", audio: "אודיו", pdf: "PDF", none: "" };
const KIND_ACTION: Record<string, string> = { video: "צפה", audio: "האזן", pdf: "פתח", none: "" };

// ── isHaggaiZechariahMalachi ───────────────────────────────────────────────
function isHZM(slug: string | null) { return slug === "book-haggai-zechariah-malachi"; }
function isEsther(slug: string | null) { return slug === "book-esther"; }

// ── BookSwitcher (dropdown) ────────────────────────────────────────────────
function BookSwitcher({ books, currentSlug, accent }: { books: WeeklyCourse[]; currentSlug: string; accent: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const current = books.find((b) => b.program_slug === currentSlug);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", borderRadius: radii.md, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "white", fontFamily: fonts.body, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        <BookMarked size={13} />
        {current?.title ?? "בחר ספר"}
        <ChevronDown size={12} style={{ opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            style={{ position: "absolute", top: "calc(100% + 6px)", insetInlineStart: 0, background: "white", borderRadius: radii.lg, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", border: `1px solid rgba(139,111,71,0.1)`, zIndex: 50, minWidth: 200, overflow: "hidden" }}
            dir="rtl"
          >
            {books.map((book) => (
              <button
                key={book.id}
                onClick={() => { navigate(`/course/${book.program_slug}`); setOpen(false); }}
                style={{ width: "100%", padding: "0.75rem 1rem", background: book.program_slug === currentSlug ? `rgba(139,111,71,0.07)` : "none", border: "none", borderBottom: `1px solid rgba(139,111,71,0.05)`, cursor: "pointer", textAlign: "right", fontFamily: fonts.body, fontWeight: book.program_slug === currentSlug ? 700 : 400, fontSize: "0.85rem", color: book.program_slug === currentSlug ? accent : colors.textDark, display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                {book.program_slug === currentSlug && <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent, flexShrink: 0 }} />}
                {book.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function WeeklyBookDetail() {
  const { slug = "book-ezra" } = useParams<{ slug: string }>();

  // Access: ALWAYS call both hooks unconditionally (iron rule: no conditional hooks)
  const bookTagSource = `course:${slug.replace("book-", "")}`;
  const { hasAccess: bookAccess, isLoading: bookAccessLoading } = useUserAccess(bookTagSource);
  const { hasAccess: programAccess, isLoading: programAccessLoading } = useUserAccess("program:weekly-chapter");
  const accessLoading = bookAccessLoading || programAccessLoading;

  const { isAdmin } = useAuth();
  const [previewMode, setPreviewMode] = useState<"subscriber" | "locked">("subscriber");

  // Combine: admin can toggle; real user: either tag grants access
  const realAccess = bookAccess || programAccess;
  const hasAccess = isAdmin ? (previewMode === "subscriber" || realAccess) : realAccess;

  // Data
  const { data: course, isLoading: courseLoading, error: courseError } = useWeeklyBookBySlug(slug);
  const { data: allBooks = [] } = useWeeklyBooks();
  const { data: courseData, isLoading: lessonsLoading } = useCourseDataWithResources(course?.id);

  const accent = BOOK_ACCENTS[slug] ?? colors.goldDark;
  const isLoading = accessLoading || courseLoading || lessonsLoading;

  // Navigation state
  const [activeNav, setActiveNav] = useState<NavItem>("intro");
  const [activeTab, setActiveTab] = useState<TabKey>("base");
  const [embeddedId, setEmbeddedId] = useState<string | null>(null);

  function selectNav(nav: NavItem) { setActiveNav(nav); setActiveTab("base"); setEmbeddedId(null); }

  // ── Special: Haggai-Zechariah-Malachi sub-books ─────────────────────────
  // Group chapters by bible_book column
  const hzmSubBooks: Map<string, number[]> = new Map();
  if (isHZM(slug) && courseData) {
    for (const [ch, chData] of courseData.chapters) {
      const lessons = [...chData.base, ...chData.enrichment, ...chData.weekly];
      const bibleBook = lessons[0]?.bible_book ?? "unknown";
      if (!hzmSubBooks.has(bibleBook)) hzmSubBooks.set(bibleBook, []);
      hzmSubBooks.get(bibleBook)!.push(ch);
    }
    // Sort chapters within each sub-book
    for (const [, chs] of hzmSubBooks) chs.sort((a, b) => a - b);
  }
  const hzmSubBookKeys = Array.from(hzmSubBooks.keys());

  // ── Special: Esther pairs ────────────────────────────────────────────────
  // Each pair = odd chapter (1, 3, 5, 7, 9). Both chapters combined into one slot.
  const estherPairs: number[] = []; // list of odd-chapter anchors
  if (isEsther(slug) && courseData) {
    const oddChs = courseData.chapterNumbers.filter((ch) => ch % 2 === 1);
    estherPairs.push(...oddChs.sort((a, b) => a - b));
  }

  // ── Chapter for current nav ──────────────────────────────────────────────
  // For Esther: activeNav is the odd-chapter anchor; we merge data from ch + ch+1
  // For HZM: activeNav is a sub-book string
  // Otherwise: activeNav is a chapter number

  function getActiveChapterData(): ChapterLayersMulti | null {
    if (activeNav === "intro") return null;
    if (!courseData) return null;
    if (isHZM(slug)) {
      // sub-book level: merge all chapters of that sub-book into one "chapter" entry
      const subChapters = hzmSubBooks.get(activeNav as string) ?? [];
      if (subChapters.length === 0) return null;
      const merged: ChapterLayersMulti = { chapter: subChapters[0], topic: null, base: [], enrichment: [], weekly: [] };
      for (const ch of subChapters) {
        const chd = courseData.chapters.get(ch);
        if (!chd) continue;
        if (!merged.topic && chd.topic) merged.topic = chd.topic;
        merged.base.push(...chd.base);
        merged.enrichment.push(...chd.enrichment);
        merged.weekly.push(...chd.weekly);
      }
      return merged;
    }
    if (isEsther(slug)) {
      // pair: merge odd and even chapter
      const oddCh = activeNav as number;
      const evenCh = oddCh + 1;
      const a = courseData.chapters.get(oddCh);
      const b = courseData.chapters.get(evenCh);
      if (!a && !b) return null;
      const merged: ChapterLayersMulti = { chapter: oddCh, topic: a?.topic ?? b?.topic ?? null, base: [], enrichment: [], weekly: [] };
      if (a) { merged.base.push(...a.base); merged.enrichment.push(...a.enrichment); merged.weekly.push(...a.weekly); }
      if (b) { merged.base.push(...b.base); merged.enrichment.push(...b.enrichment); merged.weekly.push(...b.weekly); }
      return merged;
    }
    return courseData.chapters.get(activeNav as number) ?? null;
  }

  const activeChapterData = getActiveChapterData();

  // ── Nav label for heading ────────────────────────────────────────────────
  function activeNavLabel(): string {
    if (activeNav === "intro") return "הקדמה";
    if (isHZM(slug)) return `ספר ${subBookLabel(activeNav as string)}`;
    if (isEsther(slug)) return estherPairLabel(activeNav as number);
    return chapterLabel(activeNav as number);
  }

  // ── Prev / Next nav ──────────────────────────────────────────────────────
  function buildNavList(): NavItem[] {
    if (!courseData) return [];
    if (isHZM(slug)) return ["intro", ...hzmSubBookKeys];
    if (isEsther(slug)) return ["intro", ...estherPairs];
    return ["intro", ...courseData.chapterNumbers];
  }
  const navList = buildNavList();
  const navIdx = navList.indexOf(activeNav);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DesignLayout sidebar={false}>
        <div style={{ padding: "10rem 0", display: "flex", justifyContent: "center" }}>
          <Loader2 style={{ width: 32, height: 32, color: accent, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (!courseLoading && !course) {
    return (
      <DesignLayout sidebar={false}>
        <div dir="rtl" style={{ padding: "6rem 2rem", textAlign: "center" }}>
          <AlertCircle size={40} style={{ color: accent, margin: "0 auto 1rem" }} />
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.4rem", color: colors.textDark, marginBottom: "0.5rem" }}>הספר לא נמצא</h2>
          <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMuted, marginBottom: "1.5rem" }}>
            {courseError ? "שגיאה בטעינת הספר." : `הספר "${slug}" אינו קיים בתכנית.`}
          </p>
          <Link to="/program/weekly-chapter" style={{ color: accent, fontFamily: fonts.body, fontWeight: 700 }}>חזרה לספרייה</Link>
        </div>
      </DesignLayout>
    );
  }

  const bookTitle = course?.title ?? slug;
  const chapterNumbers = courseData?.chapterNumbers ?? [];
  const introItems    = courseData?.intro ?? [];
  const resourceItems = courseData?.resources ?? [];

  return (
    <DesignLayout sidebar={false}>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{ background: gradients.warmDark, padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <Link
            to="/program/weekly-chapter"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.55)", textDecoration: "none" }}
          >
            <ChevronLeft size={13} />ספריית הספרים
          </Link>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: colors.goldShimmer, marginBottom: "0.15rem" }}>הפרק השבועי בתנ״ך</div>
            <h1 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.2rem", color: "white", margin: 0, lineHeight: 1.2 }}>
              {bookTitle}
              {activeNav !== "intro" && (
                <span style={{ fontWeight: 400, fontSize: "0.85rem", opacity: 0.65, marginInlineStart: "0.5rem" }}>· {activeNavLabel()}</span>
              )}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Book switcher */}
          {allBooks.length > 1 && (
            <BookSwitcher books={allBooks} currentSlug={slug} accent={accent} />
          )}
          <Link
            to="/portal"
            style={{ padding: "0.45rem 0.9rem", borderRadius: radii.md, border: "1.5px solid rgba(232,213,160,0.25)", background: "rgba(232,213,160,0.07)", color: colors.goldShimmer, fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.74rem", textDecoration: "none", whiteSpace: "nowrap" }}
          >
            האזור האישי
          </Link>
        </div>
      </div>

      {/* ── Admin toggle ─────────────────────────────────────────── */}
      {isAdmin && (
        <div dir="rtl" style={{ background: "rgba(45,31,14,0.97)", borderBottom: "1px solid rgba(232,213,160,0.12)", padding: "0.45rem 1.5rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: "rgba(232,213,160,0.45)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>תצוגת אדמין</span>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "0.15rem", gap: "0.1rem" }}>
            {(["subscriber", "locked"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPreviewMode(mode)}
                style={{ padding: "0.25rem 0.75rem", borderRadius: 16, border: "none", cursor: "pointer", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.7rem", background: previewMode === mode ? gradients.goldButton : "transparent", color: previewMode === mode ? "white" : "rgba(232,213,160,0.45)", transition: "all 0.15s" }}
              >
                {mode === "subscriber" ? "מנוי" : "לא-מנוי"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "min(280px, 30%) 1fr", minHeight: "calc(100vh - 200px)", background: colors.parchment }} className="book-detail-grid">

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <aside style={{ background: "white", borderInlineStart: `1px solid rgba(139,111,71,0.08)`, overflowY: "auto", position: "sticky", top: 96, maxHeight: "calc(100vh - 96px)" }}>
          {/* Header */}
          <div style={{ padding: "1rem", borderBottom: `1px solid rgba(139,111,71,0.07)`, background: colors.parchment }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", fontWeight: 700, color: accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.12rem" }}>
              {bookTitle} · {chapterNumbers.length} פרקים
            </div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textMuted }}>תכנית הפרק השבועי</div>
          </div>

          {/* Intro */}
          <SbRow
            label="הקדמה"
            subtitle={introItems.length > 0 ? `${introItems.length} פריטים` : ""}
            isActive={activeNav === "intro"}
            accent={accent}
            done
            onClick={() => selectNav("intro")}
          />

          {/* ── HZM: sub-books ─────────────────────────────────── */}
          {isHZM(slug) && hzmSubBookKeys.map((subBook) => {
            const chs = hzmSubBooks.get(subBook) ?? [];
            return (
              <SbRow
                key={subBook}
                label={`ספר ${subBookLabel(subBook)}`}
                subtitle={`${chs.length} פרקים`}
                isActive={activeNav === subBook}
                accent={accent}
                done={chs.length > 0}
                onClick={() => selectNav(subBook)}
              />
            );
          })}

          {/* ── Esther: pairs ─────────────────────────────────── */}
          {isEsther(slug) && estherPairs.map((oddCh) => (
            <SbRow
              key={oddCh}
              label={estherPairLabel(oddCh)}
              subtitle={courseData?.chapters?.get(oddCh)?.topic ?? ""}
              isActive={activeNav === oddCh}
              accent={accent}
              done
              onClick={() => selectNav(oddCh)}
            />
          ))}

          {/* ── Normal: chapters ──────────────────────────────── */}
          {!isHZM(slug) && !isEsther(slug) && (
            (chapterNumbers.length > 0 ? chapterNumbers : []).map((ch) => {
              const chd = courseData?.chapters?.get(ch);
              return (
                <SbRow
                  key={ch}
                  label={chapterLabel(ch)}
                  subtitle={chd?.topic ?? ""}
                  isActive={activeNav === ch}
                  accent={accent}
                  done={chapterNumbers.length > 0}
                  onClick={() => selectNav(ch)}
                />
              );
            })
          )}

          {/* Resources divider (Daniel etc.) */}
          {resourceItems.length > 0 && (
            <div style={{ padding: "0.45rem 1rem", background: "rgba(139,111,71,0.03)", borderTop: `1px solid rgba(139,111,71,0.06)`, borderBottom: `1px solid rgba(139,111,71,0.06)` }}>
              <div style={{ fontFamily: fonts.body, fontSize: "0.58rem", fontWeight: 700, color: colors.textSubtle, letterSpacing: "0.12em", textTransform: "uppercase" }}>תכנים נוספים</div>
            </div>
          )}
          {resourceItems.length > 0 && (
            <SbRow
              label="תכנים נוספים"
              subtitle={`${resourceItems.length} פריטים`}
              isActive={activeNav === "resources"}
              accent={accent}
              done
              onClick={() => selectNav("resources")}
            />
          )}
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <main style={{ padding: "2rem", maxWidth: 900 }}>

          {/* Heading */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.3rem, 3vw, 1.9rem)", color: colors.textDark, margin: "0 0 0.3rem", lineHeight: 1.2 }}>
              {activeNav === "intro" ? `הקדמה לספר ${bookTitle}` :
               activeNav === "resources" ? "תכנים נוספים" :
               `${bookTitle} — ${activeNavLabel()}`}
            </h2>
            {activeChapterData?.topic && activeNav !== "intro" && activeNav !== "resources" && (
              <div style={{ fontFamily: fonts.body, fontSize: "1rem", color: accent, fontWeight: 600 }}>{activeChapterData.topic}</div>
            )}
          </div>

          {/* ── Intro ─────────────────────────────────────────── */}
          {activeNav === "intro" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {introItems.length === 0 && (
                <EmptyState icon={<BookOpen size={32} />} title="תכני ההקדמה עדיין לא נטענו" desc="הפעל את ה-import script כדי לטעון תכנים." />
              )}
              {introItems.length > 0 && (
                <div style={{ padding: "0.9rem 1.1rem", background: "rgba(139,111,71,0.05)", borderRadius: radii.lg, fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMid, lineHeight: 1.7, borderInlineStart: `3px solid ${accent}` }}>
                  לפני שצוללים לפרקים — כמה פריטי פתיחה שיעזרו לך להיכנס לרוח הספר.
                </div>
              )}
              {introItems.map((item, idx) => (
                <MediaCard key={item.id} lesson={item} featured={idx === 0} embeddedId={embeddedId} onEmbed={setEmbeddedId} accent={accent} />
              ))}
            </div>
          )}

          {/* ── Resources (Daniel: שיעורי הרב ברוך סליי) ─────── */}
          {activeNav === "resources" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.9rem 1.1rem", background: "rgba(107,78,139,0.06)", borderRadius: radii.lg, fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMid, lineHeight: 1.7, borderInlineStart: `3px solid ${accent}` }}>
                תכנים נוספים של הרב ברוך סליי ומלומדים נוספים לספר דניאל.
              </div>
              {resourceItems.map((item, idx) => (
                <MediaCard key={item.id} lesson={item} featured={idx === 0} embeddedId={embeddedId} onEmbed={setEmbeddedId} accent={accent} />
              ))}
            </div>
          )}

          {/* ── Chapter / Sub-book content ─────────────────────── */}
          {activeNav !== "intro" && activeNav !== "resources" && (
            <>
              {/* Tabs */}
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ display: "flex", gap: "0.2rem", borderBottom: `2px solid rgba(139,111,71,0.1)` }}>
                  {([
                    { key: "base"       as const, label: "בסיס",          locked: false },
                    { key: "enrichment" as const, label: "הרחבה",         locked: !hasAccess },
                    { key: "weekly"     as const, label: "שיעור שבועי",   locked: !hasAccess },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{ padding: "0.7rem 1.2rem", background: "none", border: "none", cursor: "pointer", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.86rem", color: activeTab === tab.key ? accent : tab.locked ? colors.textSubtle : colors.textMuted, borderBottom: activeTab === tab.key ? `2px solid ${accent}` : "2px solid transparent", marginBottom: -2, display: "inline-flex", alignItems: "center", gap: "0.3rem", transition: "color 0.15s" }}
                    >
                      {tab.locked && <Lock size={11} />}{tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "base" && (
                <LayerSection
                  items={activeChapterData?.base ?? []}
                  embeddedId={embeddedId}
                  onEmbed={setEmbeddedId}
                  emptyTitle="תכני הבסיס טרם פורסמו"
                  emptyDesc="הפרק עדיין לא הגיע בתוכנית — תכנים יפורסמו כשיגיע תורו."
                  noData={!activeChapterData && chapterNumbers.length > 0}
                  accent={accent}
                />
              )}
              {activeTab === "enrichment" && (
                !hasAccess
                  ? <LockedPanel tab="הרחבה" accent={accent} />
                  : <LayerSection
                      items={activeChapterData?.enrichment ?? []}
                      embeddedId={embeddedId}
                      onEmbed={setEmbeddedId}
                      emptyTitle="תכני ההרחבה יתווספו בקרוב"
                      emptyDesc="שיעורי ההרחבה לפרק זה עדיין לא הועלו."
                      noData={!activeChapterData && chapterNumbers.length > 0}
                      accent={accent}
                    />
              )}
              {activeTab === "weekly" && (
                !hasAccess
                  ? <LockedPanel tab="שיעור שבועי" accent={accent} />
                  : <LayerSection
                      items={activeChapterData?.weekly ?? []}
                      embeddedId={embeddedId}
                      onEmbed={setEmbeddedId}
                      emptyTitle="הקלטת השיעור טרם פורסמה"
                      emptyDesc="השיעור השבועי עדיין לא הגיע — ההקלטה תפורסם אחרי השיעור."
                      noData={!activeChapterData && chapterNumbers.length > 0}
                      accent={accent}
                    />
              )}

              {/* Chapter nav arrows */}
              <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: `1px solid rgba(139,111,71,0.1)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {navIdx > 0 ? (
                  <button onClick={() => selectNav(navList[navIdx - 1])} style={navBtnStyle("prev", accent)}>
                    ← {navIdx === 1 ? "הקדמה" : (isEsther(slug) ? estherPairLabel(navList[navIdx - 1] as number) : isHZM(slug) ? `ספר ${subBookLabel(navList[navIdx - 1] as string)}` : chapterLabel(navList[navIdx - 1] as number))}
                  </button>
                ) : <span />}
                {navIdx < navList.length - 1 && (
                  <button onClick={() => selectNav(navList[navIdx + 1])} style={navBtnStyle("next", accent)}>
                    {isEsther(slug) ? estherPairLabel(navList[navIdx + 1] as number) : isHZM(slug) ? `ספר ${subBookLabel(navList[navIdx + 1] as string)}` : chapterLabel(navList[navIdx + 1] as number)} →
                  </button>
                )}
              </div>
            </>
          )}

          {/* Intro → first chapter CTA */}
          {activeNav === "intro" && navList.length > 1 && (
            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: `1px solid rgba(139,111,71,0.1)` }}>
              <button onClick={() => selectNav(navList[1])} style={navBtnStyle("next", accent)}>
                → {isEsther(slug) ? estherPairLabel(navList[1] as number) : isHZM(slug) ? `ספר ${subBookLabel(navList[1] as string)}` : chapterLabel(navList[1] as number)}
              </button>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) { .book-detail-grid { grid-template-columns: 1fr !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </DesignLayout>
  );
}

// ── Nav button ────────────────────────────────────────────────────────────
function navBtnStyle(dir: "prev" | "next", accent: string): React.CSSProperties {
  if (dir === "next") return { padding: "0.7rem 1.5rem", borderRadius: radii.md, background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`, border: "none", cursor: "pointer", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.88rem", color: "white", boxShadow: `0 4px 14px ${accent}40`, display: "inline-flex", alignItems: "center", gap: "0.4rem" };
  return { padding: "0.7rem 1.25rem", borderRadius: radii.md, background: "white", border: `1px solid rgba(139,111,71,0.14)`, cursor: "pointer", fontFamily: fonts.body, fontSize: "0.84rem", color: colors.textMid, display: "inline-flex", alignItems: "center", gap: "0.4rem" };
}

// ── SbRow ─────────────────────────────────────────────────────────────────
function SbRow({ label, subtitle, isActive, done, accent, onClick }: { label: string; subtitle: string; isActive: boolean; done: boolean; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", padding: "0.7rem 1rem", background: isActive ? `${accent}0d` : "none", border: "none", borderBottom: `1px solid rgba(139,111,71,0.05)`, borderInlineEnd: isActive ? `3px solid ${accent}` : "3px solid transparent", cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", gap: "0.55rem" }}
    >
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? `${accent}18` : "rgba(139,111,71,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {done
          ? <span style={{ fontSize: "0.52rem", color: accent, fontWeight: 900 }}>✓</span>
          : <Clock size={9} style={{ color: colors.textSubtle }} />}
      </div>
      <div style={{ flex: 1, textAlign: "right", minWidth: 0 }}>
        <div style={{ fontFamily: fonts.body, fontWeight: isActive ? 700 : 500, fontSize: "0.82rem", color: isActive ? accent : colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        {subtitle && <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", color: colors.textSubtle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>}
      </div>
    </button>
  );
}

// ── LayerSection ──────────────────────────────────────────────────────────
function LayerSection({ items, embeddedId, onEmbed, emptyTitle, emptyDesc, noData, accent }: {
  items: CommunityLesson[];
  embeddedId: string | null;
  onEmbed: (id: string | null) => void;
  emptyTitle: string;
  emptyDesc: string;
  noData?: boolean;
  accent: string;
}) {
  if (noData || items.length === 0) return <EmptyState icon={<Clock size={32} />} title={emptyTitle} desc={emptyDesc} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {items.map((item, idx) => (
        <MediaCard key={item.id} lesson={item} featured={idx === 0} embeddedId={embeddedId} onEmbed={onEmbed} accent={accent} />
      ))}
    </div>
  );
}

// ── MediaCard ─────────────────────────────────────────────────────────────
function MediaCard({ lesson, featured, embeddedId, onEmbed, accent }: {
  lesson: CommunityLesson;
  featured: boolean;
  embeddedId: string | null;
  onEmbed: (id: string | null) => void;
  accent: string;
}) {
  const kind  = mediaKind(lesson);
  const url   = mediaUrl(lesson);
  const isOpen = embeddedId === lesson.id;
  const kindAccent = KIND_COLOR[kind] ?? accent;
  const embedH = kind === "pdf" ? 600 : kind === "audio" ? 130 : 420;

  return (
    <div style={{ background: "white", borderRadius: radii.xl, border: featured ? `2px solid ${accent}` : `1px solid rgba(139,111,71,0.1)`, boxShadow: featured ? `0 8px 24px ${accent}20` : shadows.cardSoft, overflow: "hidden" }}>
      <div style={{ padding: featured ? "1.3rem 1.6rem" : "1rem 1.35rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ width: featured ? 48 : 40, height: featured ? 48 : 40, borderRadius: radii.md, background: `${kindAccent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: kindAccent }}>
          {kind === "video" ? <Film size={featured ? 22 : 18} /> : kind === "audio" ? <Headphones size={featured ? 22 : 18} /> : <FileText size={featured ? 22 : 18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: featured ? "1rem" : "0.9rem", color: colors.textDark }}>{lesson.title}</div>
            {KIND_LABEL[kind] && (
              <span style={{ padding: "0.08rem 0.4rem", borderRadius: radii.pill, background: `${kindAccent}14`, color: kindAccent, fontFamily: fonts.body, fontSize: "0.6rem", fontWeight: 700 }}>{KIND_LABEL[kind]}</span>
            )}
          </div>
          {lesson.description && (
            <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted, marginTop: "0.2rem", lineHeight: 1.5 }}>{lesson.description}</div>
          )}
        </div>
        {url && (
          <button
            onClick={() => onEmbed(isOpen ? null : lesson.id)}
            style={{ padding: "0.44rem 0.9rem", borderRadius: radii.md, background: isOpen ? `${kindAccent}15` : `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`, border: isOpen ? `1px solid ${kindAccent}40` : "none", color: isOpen ? kindAccent : "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0, boxShadow: isOpen ? "none" : `0 4px 12px ${accent}35`, transition: "all 0.15s" }}
          >
            {isOpen ? <><X size={12} /> סגור</> : <><Play size={11} fill="currentColor" /> {KIND_ACTION[kind]}</>}
          </button>
        )}
      </div>
      {isOpen && url && (
        <div style={{ borderTop: `1px solid rgba(139,111,71,0.07)`, background: "#f5f0e8", padding: "0.75rem" }}>
          <iframe
            src={url}
            allow="autoplay"
            style={{ width: "100%", height: embedH, border: "none", borderRadius: 8, display: "block" }}
            title={lesson.title}
          />
          {kind === "audio" && (
            <p style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: colors.textSubtle, margin: "0.35rem 0 0", textAlign: "center" }}>
              אם השמע לא מתחיל — לחץ על ה-Play בתוך הנגן
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── LockedPanel ───────────────────────────────────────────────────────────
function LockedPanel({ tab, accent }: { tab: string; accent: string }) {
  return (
    <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, padding: "3rem 2rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${accent}10`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
        <Lock size={28} style={{ color: accent, opacity: 0.65 }} />
      </div>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 0.5rem" }}>תוכן ה{tab} למנויים בלבד</h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.8, color: colors.textMuted, maxWidth: 380, margin: "0 auto 1.75rem" }}>
        שיעורי ההרחבה, המאמרים וההקלטות השבועיות פתוחים למנויי הפרק השבועי בלבד.
      </p>
      <Link
        to="/chapter-weekly"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.75rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", boxShadow: shadows.goldGlow }}
      >
        <Heart size={14} fill="currentColor" />הצטרף לתכנית הפרק השבועי
      </Link>
      <div style={{ marginTop: "0.85rem" }}>
        <Link to="/portal" style={{ fontFamily: fonts.body, fontSize: "0.77rem", color: accent, textDecoration: "underline" }}>כבר מנוי? התחבר לאזור האישי</Link>
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, padding: "3rem 2rem", border: `1px solid rgba(139,111,71,0.07)`, textAlign: "center" }}>
      <div style={{ color: colors.textSubtle, margin: "0 auto 1rem", width: "fit-content" }}>{icon}</div>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", color: colors.textMuted, margin: "0 0 0.5rem" }}>{title}</h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.83rem", color: colors.textSubtle, maxWidth: 360, margin: "0 auto" }}>{desc}</p>
    </div>
  );
}
