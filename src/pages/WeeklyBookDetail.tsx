/**
 * /course/book-<slug> — Weekly Program Book Detail (data-driven, v1)
 *
 * Replaces the hardcoded DesignPreviewCourseDetail with a fully dynamic page
 * that works for all 8 books in the weekly program.
 *
 * Special cases:
 *  - אסתר (book-esther): chapters shown as pairs (פרקים א-ב etc.)
 *  - דניאל (book-daniel): resources layer shown as "תכנים נוספים" section
 *
 * (11.7.2026 — level 15) הקורס המאוחד "חגי, זכריה ומלאכי" פוצל ב-DB לשלושה
 * ספרים אמיתיים (book-haggai / book-zechariah / book-malachi, השיעורים שויכו
 * לפי bible_book). כל לוגיקת ה-sub-books (isHZM) הוסרה; הסלאג הישן
 * book-haggai-zechariah-malachi ממופה כאן ל-book-zechariah (הספר הנלמד) —
 * redirect בתוך הקומפוננטה, לא ב-App.tsx.
 *
 * מקור האמת ל"פרק הנוכחי הנלמד" מתועד ב-src/hooks/useWeeklyProgramChapters.ts:
 * ספר = is_current=true; פרק = ה-bible_chapter הגבוה ביותר עם שיעור weekly
 * שפורסם (הקלטת הזום שנשלחת לקבוצות הוואטסאפ). ה-auto-jump למטה נגזר ממנו.
 *
 * Access:
 *   hasAccess = useUserAccess(course.access_tag).hasAccess
 *             || useUserAccess('program:weekly-chapter').hasAccess
 *   Both hooks ALWAYS called (no conditional hooks).
 *   בפועל (אומת ב-DB 11.7.26): כל 355 המנויים מחזיקים תג program:weekly-chapter
 *   (ועוד 109 program:eicha-monday) — אין תגי course:* פר-ספר, ולכן הפיצול
 *   לא נגע בגישה של אף מנוי.
 *
 * Built 2026-06-03 — feat/weekly-chapter-data-driven
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { GlobalWeeklyNav } from "@/components/weekly/GlobalWeeklyNav";
import { ZoomCtaCard } from "@/components/weekly/ZoomCtaCard";
import { WeeklyScheduleCard, type ScheduleItem } from "@/components/weekly/WeeklyScheduleCard";
import {
  BookOpen, Lock, Play, Headphones, FileText,
  ChevronDown, Heart, Clock, Loader2,
  AlertCircle, Film, Volume2, X, BookMarked, Layers,
  CheckCircle2, Circle,
} from "lucide-react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { Seo, courseJsonLd, breadcrumbJsonLd } from "@/components/seo/Seo";
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
// יואב 14.7: רכישה חד-פעמית של קורס-ספר ישירות מדף הספר (payment_products book-*)
import { QuickBuyDialog } from "@/components/payment/QuickBuyDialog";
// רמה 18 (יואב 14.7): מעקב התקדמות אישי — "מה למדתי, מה השלמתי, מסמן כזה"
import { useCourseProgress, useToggleLessonComplete } from "@/hooks/useCourseProgress";

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

// ── Legacy slug redirects ──────────────────────────────────────────────────
// הקורס המאוחד פוצל ל-3 ספרים (11.7.26). קישורים ישנים (וואטסאפ/מיילים)
// ממשיכים לעבוד — הסלאג הישן ממופה לספר הנלמד (זכריה), בלי לגעת ב-App.tsx.
const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  "book-haggai-zechariah-malachi": "book-zechariah",
};

// ── Book accent colors ─────────────────────────────────────────────────────
const BOOK_ACCENTS: Record<string, string> = {
  "book-ezra":                    "#8B6F47",
  "book-nehemiah":                "#5B6E3A",
  "book-daniel":                  "#6B4E8B",
  "book-esther":                  "#A52A2A",
  "book-haggai":                  "#2E6E5E",
  "book-zechariah":               "#3A7A85",
  "book-malachi":                 "#456E8A",
  "book-lamentations":            "#7A5A3A",
};

// ── לו״ז הלימוד = פריט-תוכן רגיל בקורס (סער 16.7) ──────────────────────────
// התמונה המעוצבת יושבת על שורת-שיעור (layer=intro, בלי פרק, כותרת "לו״ז")
// שנערכת מהאדמין כמו כל פריט: החלפת תמונה, עריכת כותרת, הסתרה = טיוטה.
// אין יותר מפה קשיחה בקוד — מחיקת הפריט מורידה את הכרטיס מהדף.
const isScheduleLesson = (l: CommunityLesson) =>
  l.bible_chapter == null && /לו[״"']?ז|לוח זמנים|תאריכי מפגש/.test(l.title || "");

// ── NavItem type: intro | resources | chapter-number ──────────────────────
type NavItem = "intro" | "resources" | number;
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
  const { slug: rawSlug = "book-ezra" } = useParams<{ slug: string }>();
  // Legacy slug → new slug (הפיצול של חגי-זכריה-מלאכי). הדאטה נטענת מיד עם
  // הסלאג החדש; ה-useEffect למטה רק מיישר את שורת הכתובת (replace, שומר query).
  const slug = LEGACY_SLUG_REDIRECTS[rawSlug] ?? rawSlug;
  const legacyNavigate = useNavigate();
  const isLegacySlug = slug !== rawSlug;
  useEffect(() => {
    if (isLegacySlug) {
      legacyNavigate({ pathname: `/course/${slug}`, search: window.location.search }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLegacySlug, slug]);

  // Access: ALWAYS call both hooks unconditionally (iron rule: no conditional hooks)
  const bookTagSource = `course:${slug.replace("book-", "")}`;
  // מוצר-הרכישה של הספר: payment_products.id === program_slug (למשל book-daniel).
  // ⚠️ המחיר נקרא מ-community_courses.price (קריא לציבור) ולא מ-payment_products —
  // על payment_products יש RLS בלי policies (הקשחת-סליקה) והקליינט לא רואה אותה.
  // עדיף להשאיר אותה סגורה מאשר לפתוח הרשאות; ה-id עדיין משמש את create-payment בשרת.
  // price>0 → כפתור רכישה בפאנל הנעול; 0/ריק → רק CTA מנוי (אין חיוב ₪0).
  const { hasAccess: bookAccess, isLoading: bookAccessLoading } = useUserAccess(bookTagSource);
  const { hasAccess: programAccess, isLoading: programAccessLoading } = useUserAccess("program:weekly-chapter");
  // תכנית איכה בימי שני (2.7.2026) — תכנית מקבילה לפרק השבועי; מנוייה מקבלים
  // גישה לספר איכה בלבד, עד המיזוג לתכנית הראשית (retag ב-user_access_tags).
  const { hasAccess: eichaAccess, isLoading: eichaLoading } = useUserAccess("program:eicha-monday");
  const accessLoading = bookAccessLoading || programAccessLoading || eichaLoading;

  const { isAdmin } = useAuth();

  // Data
  const { data: course, isLoading: courseLoading, error: courseError } = useWeeklyBookBySlug(slug);

  // (סער 10.7) טוגל "תצוגת אדמין מנוי/לא-מנוי" הוסר מהעמוד — אדמין תמיד רואה
  // כמנוי. 8.7 (סער): לומד-איכה משלם את אותו מנוי — פתוח לו גם הספר הראשי
  // הנוכחי (is_current), כדי שהמעבר לפרק השבועי יהיה קל; שאר הארכיון נפתח במיזוג.
  const realAccess =
    bookAccess || programAccess ||
    (eichaAccess && (slug === "book-lamentations" || course?.is_current === true));
  const hasAccess = isAdmin || realAccess;
  // רכישה חד-פעמית (יואב 14.7): מחיר מ-community_courses.price (ראו הערה למעלה)
  const bookPaymentProduct =
    slug.startsWith("book-") && Number((course as any)?.price ?? 0) > 0
      ? { id: slug, display_name: course?.title ?? null, default_amount: Number((course as any).price), active: true }
      : null;
  const { data: allBooks = [] } = useWeeklyBooks();
  const { data: courseData, isLoading: lessonsLoading } = useCourseDataWithResources(course?.id);

  // רמה 18 (יואב 14.7): מעקב התקדמות — סימון "נלמד" לכל פריט, אישי לכל לומד
  const { completedIds, canTrack } = useCourseProgress(course?.id);
  const toggleComplete = useToggleLessonComplete(course?.id);
  const showProgress = canTrack && hasAccess;
  const progressProps = (item: CommunityLesson) =>
    showProgress
      ? {
          completed: completedIds.has(item.id),
          onToggleComplete: () =>
            toggleComplete.mutate({ lessonId: item.id, completed: !completedIds.has(item.id) }),
        }
      : {};
  const totalTrackable = courseData
    ? courseData.intro.length + courseData.resources.length + courseData.rawLessons.length
    : 0;

  const accent = BOOK_ACCENTS[slug] ?? colors.goldDark;
  const isLoading = accessLoading || courseLoading || lessonsLoading;

  // ?chapter=N from GlobalWeeklyNav cross-book navigation
  const [searchParams] = useSearchParams();
  const initialChapter: NavItem = (() => {
    const ch = Number(searchParams.get("chapter"));
    return ch > 0 ? ch : "intro";
  })();

  // Navigation state
  const [activeNav, setActiveNav] = useState<NavItem>(initialChapter);
  const [activeTab, setActiveTab] = useState<TabKey>("base");
  const [embeddedId, setEmbeddedId] = useState<string | null>(null);

  function selectNav(nav: NavItem) { setActiveNav(nav); setActiveTab("base"); setEmbeddedId(null); }

  // ── Special: Esther pairs ────────────────────────────────────────────────
  // Each pair = odd chapter (1, 3, 5, 7, 9). Both chapters combined into one slot.
  const estherPairs: number[] = []; // list of odd-chapter anchors
  if (isEsther(slug) && courseData) {
    const oddChs = courseData.chapterNumbers.filter((ch) => ch % 2 === 1);
    estherPairs.push(...oddChs.sort((a, b) => a - b));
  }

  // ── Chapter for current nav ──────────────────────────────────────────────
  // For Esther: activeNav is the odd-chapter anchor; we merge data from ch + ch+1
  // Otherwise: activeNav is a chapter number

  function getActiveChapterData(): ChapterLayersMulti | null {
    if (activeNav === "intro" || activeNav === "resources") return null;
    if (!courseData) return null;
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
    if (activeNav === "resources") return "תכנים נוספים";
    if (isEsther(slug)) return estherPairLabel(activeNav as number);
    return chapterLabel(activeNav as number);
  }

  // ── Prev / Next nav ──────────────────────────────────────────────────────
  function buildNavList(): NavItem[] {
    if (!courseData) return [];
    if (isEsther(slug)) return ["intro", ...estherPairs];
    return ["intro", ...courseData.chapterNumbers];
  }
  const navList = buildNavList();
  const navIdx = navList.indexOf(activeNav);

  // ── Weekly schedule (לו״ז) — real per-chapter status ─────────────────────
  // A chapter that already has a 'weekly' layer (the live-lesson recording /
  // "הפרק במבט רחב") has been taught. That's a genuine progress signal —
  // the same source-of-truth documented in useWeeklyProgramChapters.ts.
  function itemTaught(nav: NavItem): boolean {
    if (typeof nav !== "number" || !courseData) return false;
    if (isEsther(slug)) {
      const odd = nav;
      const a = courseData.chapters.get(odd);
      const b = courseData.chapters.get(odd + 1);
      return (a?.weekly.length ?? 0) > 0 || (b?.weekly.length ?? 0) > 0;
    }
    return (courseData.chapters.get(nav)?.weekly.length ?? 0) > 0;
  }
  function itemLabel(nav: NavItem): string {
    if (typeof nav !== "number") return nav === "intro" ? "הקדמה" : "תכנים נוספים";
    if (isEsther(slug)) return estherPairLabel(nav);
    return chapterLabel(nav);
  }

  const chapterNavItems = navList.filter((n) => n !== "intro");
  const taughtFlags = chapterNavItems.map(itemTaught);
  const lastTaughtIdx = taughtFlags.lastIndexOf(true);
  // הפרק הנוכחי = הפרק *הנלמד* השבוע: אחרי השיעור האחרון שהועבר עוברים לפרק
  // הבא (תכני הבסיס שלו כבר פורסמו), עד תקרת הפרק האחרון שיש בו תוכן.
  // (יואב 15.7: "אנחנו בזכריה פרק יד" בעוד שהשיעור האחרון היה על יג —
  // ההגדרה הישנה "האחרון שהועבר" נחתה פרק אחד אחורה.)
  const currentIdx =
    lastTaughtIdx < 0
      ? (chapterNavItems.length > 0 ? 0 : -1)
      : Math.min(lastTaughtIdx + 1, chapterNavItems.length - 1);

  // (סער 10.7, דויק 11.7) "תכניס אותי ישר לפרק שלי" — בספר הנוכחי (is_current)
  // נוחתים ישירות על הפרק הנוכחי הנלמד = הפרק האחרון עם שיעור weekly שפורסם
  // (מקור האמת — ראה useWeeklyProgramChapters.ts; זה הפרק שנשלח לקבוצות
  // הוואטסאפ). רץ פעם אחת אחרי טעינת הדאטה; ?chapter=N מנצח (ניווט מפורש),
  // וספרי-ארכיון נשארים על ההקדמה. activeNav מספרי → הסיידבר מדגיש את הפרק.
  const autoJumpedRef = useRef(false);
  useEffect(() => {
    if (autoJumpedRef.current) return;
    if (isLoading || !courseData || !course) return;
    autoJumpedRef.current = true;
    if (Number(searchParams.get("chapter")) > 0) return;
    if (!course.is_current) return;
    if (currentIdx >= 0) {
      const target = chapterNavItems[currentIdx];
      setActiveNav(target);
      // בוחרים טאב שבאמת יש בו תוכן: בסיס → השיעור והסיכום (בזכריה, למשל,
      // אין שכבת בסיס — נחיתה על טאב ריק מרגישה שבורה)
      let baseCount = 0;
      let weeklyCount = 0;
      if (isEsther(slug)) {
        const odd = target as number;
        const a = courseData.chapters.get(odd);
        const b = courseData.chapters.get(odd + 1);
        baseCount = (a?.base.length ?? 0) + (b?.base.length ?? 0);
        weeklyCount = (a?.weekly.length ?? 0) + (b?.weekly.length ?? 0);
      } else {
        const ch = courseData.chapters.get(target as number);
        baseCount = ch?.base.length ?? 0;
        weeklyCount = ch?.weekly.length ?? 0;
      }
      if (baseCount === 0 && weeklyCount > 0) setActiveTab("weekly");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, courseData, course, currentIdx]);
  const scheduleItems: ScheduleItem[] = chapterNavItems.map((nav, i) => {
    let status: ScheduleItem["status"];
    if (course?.is_current && i === currentIdx) status = "current";
    else if (taughtFlags[i]) status = "done";
    else status = "upcoming";
    return { label: itemLabel(nav), status, onOpen: () => selectNav(nav) };
  });
  const currentChapterLabel =
    currentIdx >= 0 ? itemLabel(chapterNavItems[currentIdx]) : undefined;

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
  // הלו״ז יוצא מרשימת-ההקדמה ומרונדר ככרטיס-הלו״ז (פריט נערך באדמין, סער 16.7)
  const allIntroItems  = courseData?.intro ?? [];
  const scheduleLesson = allIntroItems.find(isScheduleLesson) ?? (courseData?.resources ?? []).find(isScheduleLesson);
  const introItems     = allIntroItems.filter((l) => !isScheduleLesson(l));
  const resourceItems  = (courseData?.resources ?? []).filter((l) => !isScheduleLesson(l));

  const coursePath = `/course/${course?.program_slug ?? slug}`;
  const courseDesc =
    course?.description ||
    (course ? `לימוד ${course.title} בתוכנית השבועית של בני ציון — פרק בכל שבוע, עם שיעורים וחומרי לימוד.` : undefined);

  // ── מודל גישה (סער 14.7): תוכן הקורס סגור לחלוטין ללא-גישה ──────────────
  // מנוי-הפרק-השבועי רואה את כל הקורסים · רוכש רואה רק את הקורס שלו ·
  // מי שאין לו — רואה דף-מכירה (הסבר מההקדמה, מחיר, רכישה) ולא שום תוכן.
  if (!isLoading && course && !hasAccess) {
    return (
      <CourseSalesPage
        course={course}
        slug={slug}
        bookTitle={bookTitle}
        courseDesc={courseDesc}
        coursePath={coursePath}
        accent={accent}
        paymentProduct={bookPaymentProduct}
        introItems={introItems}
        lessonCount={courseData ? Array.from(courseData.chapters.values()).reduce((s, c) => s + c.base.length + c.enrichment.length + c.weekly.length, 0) : (course.total_lessons ?? 0)}
        chapterCount={chapterNumbers.length}
      />
    );
  }

  return (
    <DesignLayout sidebar={false}>
      {course && (
        <Seo
          title={course.title}
          description={courseDesc}
          image={course.image_url ?? undefined}
          url={`https://bneyzion.co.il${coursePath}`}
          jsonLd={[
            courseJsonLd({ name: course.title, description: courseDesc, path: coursePath, image: course.image_url }),
            breadcrumbJsonLd([
              { name: "בית", path: "/" },
              { name: "התוכנית השבועית", path: "/program/weekly-chapter" },
              { name: course.title, path: coursePath },
            ]),
          ]}
        />
      )}

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{ background: gradients.warmDark, padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
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
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "min(280px, 30%) 1fr", minHeight: "calc(100vh - 200px)", background: colors.parchment }} className="book-detail-grid">

        {/* ── Sidebar — GlobalWeeklyNav (all books accordion) ──── */}
        {/*
          Critique #13 safety: GlobalWeeklyNav only handles navigation.
          All access/payment logic (hasAccess, previewMode, isAdmin) lives
          exclusively in the main content section below — untouched.
          GlobalWeeklyNav.onNavSelect calls selectNav() which is defined here.
        */}
        <GlobalWeeklyNav
          currentSlug={slug}
          activeNav={activeNav}
          onNavSelect={selectNav}
          accent={accent}
        />

        {/* ── Main content ─────────────────────────────────────── */}
        <main style={{ padding: "2rem", maxWidth: 900 }}>

          {/* ── פס-מכירה (יואב 14.7): הצעת הרכישה גלויה מיד, לא רק בטאבים הנעולים ── */}
          {!hasAccess && bookPaymentProduct && (
            <div
              dir="rtl"
              style={{
                marginBottom: "1.75rem",
                background: `linear-gradient(105deg, rgba(24,19,11,0.94) 0%, rgba(30,25,14,0.82) 60%, rgba(24,19,11,0.68) 100%)`,
                borderRadius: radii.xl,
                border: "1px solid rgba(196,162,101,0.4)",
                padding: "1.4rem 1.6rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1.25rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: "white", marginBottom: 4 }}>
                  קורס {bookTitle} — כל השיעורים, הסיכומים וההרחבות
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
                  רכישה חד-פעמית של ₪{Number(bookPaymentProduct.default_amount).toLocaleString()} פותחת את הקורס המלא לתמיד · מאת הרב יואב אוריאל
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                <QuickBuyDialog
                  product={bookPaymentProduct.id}
                  amount={Number(bookPaymentProduct.default_amount)}
                  description={`קורס ${bookTitle}`}
                  title={`רכישת קורס ${bookTitle}`}
                  subtitle={`תשלום חד-פעמי של ₪${Number(bookPaymentProduct.default_amount).toLocaleString()} — גישה מלאה לתמיד`}
                  thankYouType="store"
                >
                  <button
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.8rem 1.6rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.92rem", border: "none", cursor: "pointer", boxShadow: shadows.goldGlow, whiteSpace: "nowrap" }}
                  >
                    לרכישת הקורס — ₪{Number(bookPaymentProduct.default_amount).toLocaleString()}
                  </button>
                </QuickBuyDialog>
                <Link
                  to="/chapter-weekly"
                  style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.9)", textDecoration: "underline", whiteSpace: "nowrap" }}
                >
                  או מנוי שפותח הכל
                </Link>
              </div>
            </div>
          )}

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
            {/* רמה 18: שורת התקדמות אישית — כמה תכנים סומנו כנלמדו */}
            {showProgress && totalTrackable > 0 && (
              <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ flex: "0 0 160px", height: 6, background: "rgba(139,111,71,0.12)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.round((completedIds.size / totalTrackable) * 100))}%`, height: "100%", background: accent, borderRadius: 999, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted }}>
                  סימנת {completedIds.size} מתוך {totalTrackable} תכנים כנלמדו
                </span>
              </div>
            )}
          </div>

          {/* ── Intro ─────────────────────────────────────────── */}
          {activeNav === "intro" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Live Zoom session — prominent for the current book */}
              {course?.is_current && (
                <ZoomCtaCard
                  zoomLink={(course as any)?.zoom_link}
                  chapterLabel={currentChapterLabel}
                  hasAccess={hasAccess}
                />
              )}

              {/* Chapter schedule (לו״ז) — ניזון מפריט-תוכן שנערך באדמין (סער 16.7):
                  התמונה = של הפריט; מחיקה/טיוטה של הפריט מסירה את הכרטיס.
                  מוצג רק בספר הנוכחי ורק לחברי התכנית (מנוי/איכה/אדמין) —
                  לרוכש קורס-ספר בודד ובספרי-ארכיון לא רלוונטי (יואב 15.7). */}
              {scheduleLesson && course?.is_current && (isAdmin || programAccess || eichaAccess) && (
                <WeeklyScheduleCard
                  bookTitle={bookTitle}
                  scheduleImageUrl={scheduleLesson.thumbnail_url || scheduleLesson.attachment_url || null}
                  items={scheduleItems}
                  accent={accent}
                />
              )}

              {introItems.length === 0 ? null : (
                <>
                  <div style={{ padding: "0.9rem 1.1rem", background: "rgba(139,111,71,0.05)", borderRadius: radii.lg, fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMid, lineHeight: 1.7, borderInlineStart: `3px solid ${accent}` }}>
                    לפני שצוללים לפרקים — כמה פריטי פתיחה שיעזרו לך להיכנס לרוח הספר.
                  </div>
                  {introItems.map((item, idx) => (
                    <MediaCard key={item.id} lesson={item} featured={idx === 0} embeddedId={embeddedId} onEmbed={setEmbeddedId} accent={accent} {...progressProps(item)} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Resources (Daniel: שיעורי הרב ברוך סליי) ─────── */}
          {activeNav === "resources" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.9rem 1.1rem", background: "rgba(107,78,139,0.06)", borderRadius: radii.lg, fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMid, lineHeight: 1.7, borderInlineStart: `3px solid ${accent}` }}>
                תכנים נוספים של הרב ברוך סליי ומלומדים נוספים לספר דניאל.
              </div>
              {resourceItems.map((item, idx) => (
                <MediaCard key={item.id} lesson={item} featured={idx === 0} embeddedId={embeddedId} onEmbed={setEmbeddedId} accent={accent} {...progressProps(item)} />
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
                    { key: "base"       as const, label: "תכני הבסיס",     locked: false },
                    { key: "enrichment" as const, label: "הרחבה",          locked: !hasAccess },
                    { key: "weekly"     as const, label: "השיעור והסיכום", locked: !hasAccess },
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
                  progressProps={progressProps}
                  embeddedId={embeddedId}
                  onEmbed={setEmbeddedId}
                  emptyTitle="התוכן יתווסף בקרוב"
                  emptyDesc=""
                  noData={!activeChapterData && chapterNumbers.length > 0}
                  accent={accent}
                />
              )}
              {activeTab === "enrichment" && (
                !hasAccess
                  ? <LockedPanel tab="הרחבה" accent={accent} bookTitle={course?.title} paymentProduct={bookPaymentProduct} />
                  : <LayerSection
                      items={activeChapterData?.enrichment ?? []}
                      progressProps={progressProps}
                      embeddedId={embeddedId}
                      onEmbed={setEmbeddedId}
                      emptyTitle="התוכן יתווסף בקרוב"
                      emptyDesc=""
                      noData={!activeChapterData && chapterNumbers.length > 0}
                      accent={accent}
                    />
              )}
              {activeTab === "weekly" && (
                !hasAccess
                  ? <LockedPanel tab="שיעור שבועי" accent={accent} bookTitle={course?.title} paymentProduct={bookPaymentProduct} />
                  : <LayerSection
                      items={activeChapterData?.weekly ?? []}
                      progressProps={progressProps}
                      embeddedId={embeddedId}
                      onEmbed={setEmbeddedId}
                      emptyTitle="התוכן יתווסף בקרוב"
                      emptyDesc=""
                      noData={!activeChapterData && chapterNumbers.length > 0}
                      accent={accent}
                    />
              )}

              {/* Chapter nav arrows */}
              <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: `1px solid rgba(139,111,71,0.1)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {/* RTL: "הקודם" יושב מימין וחץ ימינה; "הבא" משמאל וחץ שמאלה (יואב 15.7) */}
                {navIdx > 0 ? (
                  <button onClick={() => selectNav(navList[navIdx - 1])} style={navBtnStyle("prev", accent)}>
                    → הקודם: {navIdx === 1 ? "הקדמה" : (isEsther(slug) ? estherPairLabel(navList[navIdx - 1] as number) : chapterLabel(navList[navIdx - 1] as number))}
                  </button>
                ) : <span />}
                {navIdx < navList.length - 1 && (
                  <button onClick={() => selectNav(navList[navIdx + 1])} style={navBtnStyle("next", accent)}>
                    הבא: {isEsther(slug) ? estherPairLabel(navList[navIdx + 1] as number) : chapterLabel(navList[navIdx + 1] as number)} ←
                  </button>
                )}
              </div>
            </>
          )}

          {/* Intro → first chapter CTA */}
          {activeNav === "intro" && navList.length > 1 && (
            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: `1px solid rgba(139,111,71,0.1)` }}>
              <button onClick={() => selectNav(navList[1])} style={navBtnStyle("next", accent)}>
                לתחילת הלימוד: {isEsther(slug) ? estherPairLabel(navList[1] as number) : chapterLabel(navList[1] as number)} ←
              </button>
            </div>
          )}
        </main>
      </div>

      <style>{`
        /* (סער 10.7) נייד: התוכן קודם, אקורדיון הספרים אחריו — בלי בלגן מעל הפרק */
        @media (max-width: 768px) {
          .book-detail-grid { grid-template-columns: 1fr !important; display: flex !important; flex-direction: column !important; }
          .book-detail-grid > main { order: 1; padding: 1.25rem !important; }
          .book-detail-grid > aside { order: 2; position: static !important; max-height: none !important; border-top: 1px solid rgba(139,111,71,0.12); }
        }
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

// ── LayerSection ──────────────────────────────────────────────────────────
function LayerSection({ items, embeddedId, onEmbed, emptyTitle, emptyDesc, noData, accent, progressProps }: {
  items: CommunityLesson[];
  embeddedId: string | null;
  onEmbed: (id: string | null) => void;
  emptyTitle: string;
  emptyDesc: string;
  noData?: boolean;
  accent: string;
  /** רמה 18: מזריק completed/onToggleComplete לכל כרטיס (ריק כשאין מעקב) */
  progressProps?: (item: CommunityLesson) => { completed?: boolean; onToggleComplete?: () => void };
}) {
  if (noData || items.length === 0) return <EmptyState icon={<Clock size={32} />} title={emptyTitle} desc={emptyDesc} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {items.map((item, idx) => (
        <MediaCard key={item.id} lesson={item} featured={idx === 0} embeddedId={embeddedId} onEmbed={onEmbed} accent={accent} {...(progressProps ? progressProps(item) : {})} />
      ))}
    </div>
  );
}

// ── MediaCard ─────────────────────────────────────────────────────────────
function MediaCard({ lesson, featured, embeddedId, onEmbed, accent, completed, onToggleComplete }: {
  lesson: CommunityLesson;
  featured: boolean;
  embeddedId: string | null;
  onEmbed: (id: string | null) => void;
  accent: string;
  /** רמה 18: סימון "נלמד" אישי — מוצג רק ללומד מחובר עם גישה */
  completed?: boolean;
  onToggleComplete?: () => void;
}) {
  const kind  = mediaKind(lesson);
  const url   = mediaUrl(lesson);
  const isOpen = embeddedId === lesson.id;
  const kindAccent = KIND_COLOR[kind] ?? accent;
  const embedH = kind === "pdf" ? 600 : kind === "audio" ? 130 : 420;

  // (סער, level 15) כל השורה לחיצה — לא רק כפתור ה"פתח". השורה עצמה היא
  // הפקד היחיד (role="button" + מקלדת); ה"כפתור" הוויזואלי הוא span תצוגתי,
  // כדי שלא יהיה פקד מקונן בתוך פקד (נגישות).
  const toggle = url ? () => onEmbed(isOpen ? null : lesson.id) : undefined;

  return (
    <div style={{ background: "white", borderRadius: radii.xl, border: featured ? `2px solid ${accent}` : `1px solid rgba(139,111,71,0.1)`, boxShadow: featured ? `0 8px 24px ${accent}20` : shadows.cardSoft, overflow: "hidden" }}>
      {/* רמה 18: שורת-הכותרת = פקד-הפתיחה + כפתור "נלמד" — אחים, לא מקוננים
          (נגישות: אין פקד בתוך פקד; ה-padding עבר לעוטף) */}
      <div style={{ padding: featured ? "1.3rem 1.6rem" : "1rem 1.35rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          role={toggle ? "button" : undefined}
          tabIndex={toggle ? 0 : undefined}
          aria-expanded={toggle ? isOpen : undefined}
          aria-label={toggle ? `${isOpen ? "סגור" : KIND_ACTION[kind]} — ${lesson.title}` : undefined}
          onClick={toggle}
          onKeyDown={toggle ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } } : undefined}
          style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "1rem", cursor: toggle ? "pointer" : undefined }}
        >
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
            <span
              aria-hidden="true"
              style={{ padding: "0.44rem 0.9rem", borderRadius: radii.md, background: isOpen ? `${kindAccent}15` : `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`, border: isOpen ? `1px solid ${kindAccent}40` : "none", color: isOpen ? kindAccent : "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0, boxShadow: isOpen ? "none" : `0 4px 12px ${accent}35`, transition: "all 0.15s" }}
            >
              {isOpen ? <><X size={12} /> סגור</> : <><Play size={11} fill="currentColor" /> {KIND_ACTION[kind]}</>}
            </span>
          )}
        </div>
        {onToggleComplete && (
          <button
            type="button"
            title={completed ? "סומן כנלמד — לחיצה מבטלת" : "סמן שלמדתי את התוכן"}
            aria-label={completed ? `בטל סימון נלמד — ${lesson.title}` : `סמן כנלמד — ${lesson.title}`}
            aria-pressed={!!completed}
            onClick={onToggleComplete}
            style={{ background: completed ? "#2E7D3212" : "white", border: completed ? "1px solid #2E7D3240" : "1px dashed rgba(139,111,71,0.4)", borderRadius: radii.pill, cursor: "pointer", padding: "0.35rem 0.7rem", flexShrink: 0, color: completed ? "#2E7D32" : colors.textMuted, display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.7rem", fontWeight: 700, transition: "all 0.15s" }}
          >
            {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            {completed ? "נלמד ✓" : "סמן כנלמד"}
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
// ── דף מכירה לקורס (סער 14.7) ────────────────────────────────────────────
// מוצג לכל מי שאין לו גישה — אורח או מחובר-בלי-רכישה. ההסבר נלקח מההקדמה,
// הרכישה בדף checkout מסודר (לא פופאפ). אחרי רכישה: התחברות Google עם מייל
// הרכישה פותחת את הקורס (linkPendingAccessTags ב-AuthContext).
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function CourseSalesPage({ course, slug, bookTitle, courseDesc, coursePath, accent, paymentProduct, introItems, lessonCount, chapterCount }: {
  course: WeeklyCourse;
  slug: string;
  bookTitle: string;
  courseDesc?: string;
  coursePath: string;
  accent: string;
  paymentProduct: { id: string; display_name?: string | null; default_amount?: number | null; active?: boolean | null } | null;
  introItems: CommunityLesson[];
  lessonCount: number;
  chapterCount: number;
}) {
  const price = Number(paymentProduct?.default_amount ?? 0);
  const canBuy = !!paymentProduct?.active && price > 0;

  // דברי ההסבר: קודם הטקסט שנערך באדמין (sales_content); כשריק — מתוך
  // ההקדמה (טקסטים בלבד, בלי לחשוף וידאו/קבצים).
  const editedSales = String((course as any)?.sales_content || "").trim();
  const introText = editedSales || introItems
    .map((it) => (it.content_html ? stripHtml(it.content_html) : it.description || ""))
    .filter((t) => t.length > 40)
    .join("\n\n")
    .slice(0, 1400);

  const included = [
    `${lessonCount > 0 ? lessonCount + " " : ""}שיעורים מוקלטים על כל ${chapterCount > 0 ? chapterCount + " הפרקים" : "הספר"}`,
    "סיכומים מעוצבים לכל פרק",
    "שיעורי הרחבה, מאמרים ומקורות",
    "גישה מלאה לתמיד — לומדים בקצב שלכם",
  ];

  return (
    <DesignLayout sidebar={false}>
      <Seo title={`${bookTitle} — קורס מוקלט`} description={courseDesc} image={course.image_url ?? undefined} url={`https://bneyzion.co.il${coursePath}`} />

      {/* Hero */}
      <div dir="rtl" style={{ background: gradients.warmDark, padding: "3rem 1.5rem 2.5rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: colors.goldShimmer, marginBottom: "0.5rem" }}>
              קורסים בתנ״ך · קורס מוקלט
            </div>
            <h1 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.7rem, 4vw, 2.5rem)", color: "white", margin: "0 0 0.5rem", lineHeight: 1.15 }}>
              קורס {bookTitle}
            </h1>
            <div style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: "rgba(255,255,255,0.85)", marginBottom: "0.4rem" }}>
              מאת הרב יואב אוריאל
            </div>
            {courseDesc && (
              <p style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 520, margin: "0.6rem 0 1.4rem" }}>
                {courseDesc}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              {canBuy ? (
                <>
                  <Link
                    to={`${coursePath}/checkout`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", padding: "1rem 2.2rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", boxShadow: shadows.goldGlow }}
                  >
                    לרכישת הקורס — ₪{price.toLocaleString()}
                  </Link>
                  <span style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: "rgba(255,255,255,0.65)" }}>
                    תשלום חד-פעמי · גישה לתמיד
                  </span>
                </>
              ) : (
                <Link
                  to="/chapter-weekly"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", padding: "1rem 2.2rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1rem", textDecoration: "none", boxShadow: shadows.goldGlow }}
                >
                  <Heart size={15} fill="currentColor" /> הקורס פתוח למנויי הפרק השבועי
                </Link>
              )}
            </div>
          </div>
          {course.image_url && (
            <img
              src={course.image_url}
              alt={bookTitle}
              style={{ width: 240, borderRadius: radii.xl, boxShadow: "0 18px 50px rgba(0,0,0,0.35)", flexShrink: 0 }}
            />
          )}
        </div>
      </div>

      {/* Body */}
      <div dir="rtl" style={{ background: colors.parchment, padding: "2.5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>

          {/* מה מקבלים */}
          <section style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.12)", boxShadow: shadows.cardSoft, padding: "1.75rem 2rem" }}>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.25rem", color: colors.textDark, margin: "0 0 1rem" }}>מה מקבלים בקורס?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.8rem" }}>
              {included.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMid, lineHeight: 1.6 }}>
                  <span style={{ color: accent, fontWeight: 900, marginTop: 1 }}>✓</span>
                  {line}
                </div>
              ))}
            </div>
          </section>

          {/* על הקורס — מתוך ההקדמה */}
          {introText && (
            <section style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.12)", boxShadow: shadows.cardSoft, padding: "1.75rem 2rem" }}>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.25rem", color: colors.textDark, margin: "0 0 0.9rem" }}>{editedSales ? "על הקורס" : "על הקורס — מתוך ההקדמה"}</h2>
              <p style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: colors.textMid, lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
                {introText}{introText.length >= 1400 ? "…" : ""}
              </p>
              <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textSubtle, marginTop: "0.9rem" }}>
                ההקדמה המלאה — יחד עם כל השיעורים — נפתחת מיד אחרי הרכישה.
              </p>
            </section>
          )}

          {/* CTA תחתון + מסלולים */}
          <section style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.12)", boxShadow: shadows.cardSoft, padding: "1.75rem 2rem", textAlign: "center" }}>
            {canBuy && (
              <>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.35rem", color: colors.textDark, marginBottom: 4 }}>
                  ₪{price.toLocaleString()} · תשלום חד-פעמי
                </div>
                <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, margin: "0 0 1.2rem" }}>
                  אפשר לרכוש בלי להתחבר — אחרי התשלום מתחברים עם Google עם המייל של הרכישה, והקורס נפתח אוטומטית.
                </p>
                <Link
                  to={`${coursePath}/checkout`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", padding: "0.95rem 2.4rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "1rem", textDecoration: "none", boxShadow: shadows.goldGlow }}
                >
                  מעבר לרכישה מאובטחת
                </Link>
              </>
            )}
            <div style={{ marginTop: canBuy ? "1.4rem" : 0, paddingTop: canBuy ? "1.2rem" : 0, borderTop: canBuy ? "1px solid rgba(139,111,71,0.12)" : "none", display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", fontFamily: fonts.body, fontSize: "0.82rem" }}>
              <Link to="/chapter-weekly" style={{ color: accent, textDecoration: "underline" }}>
                מנוי הפרק השבועי פותח את כל הקורסים
              </Link>
              <Link to="/portal" style={{ color: colors.textMuted, textDecoration: "underline" }}>
                כבר רכשת? כניסה עם Google עם מייל הרכישה
              </Link>
            </div>
          </section>
        </div>
      </div>
    </DesignLayout>
  );
}

function LockedPanel({ tab, accent, bookTitle, paymentProduct }: {
  tab: string;
  accent: string;
  bookTitle?: string;
  paymentProduct?: { id: string; display_name?: string | null; default_amount?: number | null; active?: boolean | null } | null;
}) {
  // רכישה חד-פעמית של הקורס (יואב 14.7) — רק כשיש מחיר אמיתי (אין חיוב ₪0)
  const price = Number(paymentProduct?.default_amount ?? 0);
  const canBuy = !!paymentProduct?.active && price > 0;
  const courseName = bookTitle || paymentProduct?.display_name || "הקורס";
  return (
    <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, padding: "3rem 2rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${accent}10`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
        <Lock size={28} style={{ color: accent, opacity: 0.65 }} />
      </div>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 0.5rem" }}>
        {canBuy ? `תוכן ה${tab} לרוכשי הקורס ולמנויים` : `תוכן ה${tab} למנויים בלבד`}
      </h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.8, color: colors.textMuted, maxWidth: 380, margin: "0 auto 1.75rem" }}>
        {canBuy
          ? `אפשר לרכוש את קורס ${courseName} ברכישה חד-פעמית שפותחת את כל השיעורים לתמיד — או להצטרף למנוי הפרק השבועי שפותח הכל.`
          : "שיעורי ההרחבה, המאמרים וההקלטות השבועיות פתוחים למנויי הפרק השבועי בלבד."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        {canBuy && (
          <QuickBuyDialog
            product={paymentProduct!.id}
            amount={price}
            description={`קורס ${courseName}`}
            title={`רכישת קורס ${courseName}`}
            subtitle={`תשלום חד-פעמי של ₪${price.toLocaleString()} — גישה מלאה לתמיד`}
            thankYouType="store"
          >
            <button
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.75rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", boxShadow: shadows.goldGlow }}
            >
              רכישת הקורס — ₪{price.toLocaleString()}
            </button>
          </QuickBuyDialog>
        )}
        <Link
          to="/chapter-weekly"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.75rem", borderRadius: radii.lg, background: canBuy ? "white" : gradients.goldButton, color: canBuy ? accent : "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", border: canBuy ? `1.5px solid ${accent}` : "none", boxShadow: canBuy ? "none" : shadows.goldGlow }}
        >
          <Heart size={14} fill="currentColor" />הצטרפות למנוי הפרק השבועי
        </Link>
      </div>
      <div style={{ marginTop: "0.85rem" }}>
        <Link to="/portal" style={{ fontFamily: fonts.body, fontSize: "0.77rem", color: accent, textDecoration: "underline" }}>כבר יש לך גישה? כניסה לאזור האישי</Link>
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
