/**
 * /course/:slug — Weekly program course detail page v4.
 *
 * v4 changes (2026-06-02):
 *   - Switches from useChapterLayerMap (one row per layer) → useCourseDataMulti (many rows per layer)
 *   - Intro section shows ALL intro items (4 PDFs + audio), not a single row
 *   - Each tab (base/enrichment/weekly) shows a LIST of cards, each with Drive iframe embed
 *   - bible_verses table / BibleReading component REMOVED (saar: "פסוקים יוצאים מעפן")
 *   - Chapter subtitle = topic description from manifest (e.g. "הצהרת כורש")
 *   - Sidebar: Intro + 10 Ezra chapters + coming-soon books
 *   - All embed = iframe Drive /preview (video, audio, pdf — all same pattern)
 *   - Admin toggle preserved; LockedTabPanel links to /chapter-weekly (not /megilat-esther)
 *
 * Access gates: בסיס open, הרחבה + שיעור שבועי require program:weekly-chapter
 * DB: course_id 35e7d37b-a263-4e85-a8d8-16fdbae312ae
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  Lock,
  Play,
  Headphones,
  FileText,
  ChevronLeft,
  Heart,
  Clock,
  Loader2,
  AlertCircle,
  Film,
  Volume2,
  X,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCourseByProgramSlug,
  useCourseDataMulti,
} from "@/hooks/useCommunity";
import type { CommunityLesson, ChapterLayersMulti } from "@/hooks/useCommunity";

// ── Constants ──────────────────────────────────────────────────────────────
const COURSE_ID = "35e7d37b-a263-4e85-a8d8-16fdbae312ae";

type TabKey = "base" | "enrichment" | "weekly";
type NavItem = "intro" | number;

const HEB_NUMS = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד","טו","טז","יז","יח","יט","כ","כא","כב","כג","כד"];
function chapterLabel(n: number) { return `פרק ${HEB_NUMS[n - 1] ?? String(n)}`; }

const COMING_SOON_BOOKS = [
  { name: "נחמיה",  chapters: 13 },
  { name: "מלאכי", chapters: 3  },
  { name: "יהושע", chapters: 24 },
];

// ── Media helpers ──────────────────────────────────────────────────────────
function mediaUrl(lesson: CommunityLesson): string | null {
  return lesson.video_url ?? lesson.audio_url ?? lesson.attachment_url ?? null;
}
function mediaKind(lesson: CommunityLesson): "video" | "audio" | "pdf" | "none" {
  if (lesson.video_url) return "video";
  if (lesson.audio_url) return "audio";
  if (lesson.attachment_url) return "pdf";
  return "none";
}
const KIND_COLOR: Record<string, string> = {
  video: colors.goldDark,
  audio: "#3a8a85",
  pdf:   "#a52a2a",
  none:  colors.textSubtle,
};
const KIND_LABEL: Record<string, string> = { video: "וידאו", audio: "אודיו", pdf: "PDF", none: "" };
const KIND_ACTION: Record<string, string> = { video: "צפה", audio: "האזן", pdf: "פתח", none: "" };

// ── Component ──────────────────────────────────────────────────────────────
export default function DesignPreviewCourseDetail() {
  const { slug = "weekly-chapter" } = useParams<{ slug: string }>();

  const { hasAccess: realAccess, isLoading: accessLoading } = useUserAccess("program:weekly-chapter");
  const { isAdmin } = useAuth();

  const [previewMode, setPreviewMode] = useState<"subscriber" | "locked">("subscriber");
  const hasAccess = isAdmin ? (previewMode === "subscriber" || realAccess) : realAccess;

  const { data: course, isLoading: courseLoading, error: courseError } =
    useCourseByProgramSlug(slug === "weekly-chapter" ? "weekly-chapter" : undefined);
  const courseId = course?.id as string | undefined;
  const { data: courseData, isLoading: lessonsLoading } = useCourseDataMulti(courseId ?? COURSE_ID);

  const chapterNumbers = courseData?.chapterNumbers ?? [];
  const introItems    = courseData?.intro ?? [];

  const [activeNav, setActiveNav] = useState<NavItem>(1);
  const [activeTab, setActiveTab] = useState<TabKey>("base");
  const [embeddedId, setEmbeddedId] = useState<string | null>(null);

  function selectNav(nav: NavItem) {
    setActiveNav(nav);
    setActiveTab("base");
    setEmbeddedId(null);
  }

  const activeChapterData: ChapterLayersMulti | null =
    activeNav !== "intro" && courseData?.chapters
      ? (courseData.chapters.get(activeNav as number) ?? null)
      : null;

  const activeTopic =
    activeNav === "intro" ? "הקדמה לספר עזרא" : (activeChapterData?.topic ?? "");

  const isLoading = accessLoading || courseLoading || lessonsLoading;

  if (isLoading) {
    return (
      <DesignLayout sidebar={false}>
        <div style={{ padding: "10rem 0", display: "flex", justifyContent: "center" }}>
          <Loader2 style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  if (slug !== "weekly-chapter" || (!courseLoading && !course)) {
    return (
      <DesignLayout sidebar={false}>
        <div dir="rtl" style={{ padding: "6rem 2rem", textAlign: "center" }}>
          <AlertCircle size={40} style={{ color: colors.goldDark, margin: "0 auto 1rem" }} />
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.4rem", color: colors.textDark, marginBottom: "0.5rem" }}>הקורס לא נמצא</h2>
          <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMuted, marginBottom: "1.5rem" }}>
            {courseError ? "שגיאה בטעינת הקורס." : `הקורס "${slug}" לא קיים.`}
          </p>
          <Link to="/design-my-courses" style={{ color: colors.goldDark, fontFamily: fonts.body, fontWeight: 700 }}>חזרה לקורסים</Link>
        </div>
      </DesignLayout>
    );
  }

  const bookTitle = course?.title ?? "ספר עזרא";
  const totalChapters = chapterNumbers.length || 10;
  const chapterIdx = activeNav !== "intro" ? chapterNumbers.indexOf(activeNav as number) : -1;

  return (
    <DesignLayout sidebar={false}>
      {/* ─── Top bar ──────────────────────────────────────────────── */}
      <div dir="rtl" style={{ background: gradients.warmDark, padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/design-my-courses" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.6)", textDecoration: "none" }}>
            <ChevronLeft size={13} />הקורסים שלי
          </Link>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: colors.goldShimmer, marginBottom: "0.2rem" }}>הפרק השבועי בתנ״ך</div>
            <h1 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.25rem", color: "white", margin: 0, lineHeight: 1.2 }}>
              {bookTitle}
              {activeNav === "intro"
                ? " — הקדמה"
                : ` — ${chapterLabel(activeNav as number)}`}
              {activeTopic && activeNav !== "intro" && (
                <span style={{ fontWeight: 400, fontSize: "0.9rem", opacity: 0.7, marginInlineStart: "0.4rem" }}>· {activeTopic}</span>
              )}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.2rem", color: colors.goldShimmer, lineHeight: 1 }}>{totalChapters}/{totalChapters}</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.63rem", color: "rgba(255,255,255,0.5)" }}>פרקים</div>
          </div>
          <div style={{ width: 90, height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: gradients.goldButton, borderRadius: 3 }} />
          </div>
          <Link to="/portal" style={{ padding: "0.5rem 1rem", borderRadius: radii.md, border: "1.5px solid rgba(232,213,160,0.3)", background: "rgba(232,213,160,0.08)", color: colors.goldShimmer, fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.75rem", textDecoration: "none", whiteSpace: "nowrap" }}>האזור האישי</Link>
        </div>
      </div>

      {/* ─── Admin toggle (admin-only, security pattern per iron rule) ── */}
      {isAdmin && (
        <div dir="rtl" style={{ background: "rgba(45,31,14,0.97)", borderBottom: "1px solid rgba(232,213,160,0.15)", padding: "0.5rem 1.5rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: "rgba(232,213,160,0.5)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>תצוגת אדמין</span>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "0.18rem", gap: "0.1rem" }}>
            {([{ key: "subscriber" as const, label: "מנוי" }, { key: "locked" as const, label: "לא-מנוי" }]).map((opt) => (
              <button key={opt.key} onClick={() => setPreviewMode(opt.key)} style={{ padding: "0.28rem 0.8rem", borderRadius: 16, border: "none", cursor: "pointer", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.72rem", background: previewMode === opt.key ? gradients.goldButton : "transparent", color: previewMode === opt.key ? "white" : "rgba(232,213,160,0.5)", transition: "all 0.18s" }}>{opt.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Two-column grid ───────────────────────────────────────── */}
      <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "min(280px, 30%) 1fr", minHeight: "calc(100vh - 220px)", background: colors.parchment }} className="course-detail-grid">

        {/* ─── Sidebar ──────────────────────────────────────────── */}
        <aside style={{ background: "white", borderInlineStart: `1px solid rgba(139,111,71,0.1)`, overflowY: "auto", position: "sticky", top: 96, maxHeight: "calc(100vh - 96px)" }}>
          {/* Header */}
          <div style={{ padding: "1.1rem 1rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, background: colors.parchment }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.15rem" }}>ספר עזרא · {totalChapters} פרקים</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>תכנית הפרק השבועי</div>
          </div>

          {/* Intro */}
          <SbRow label="הקדמה" subtitle={`${introItems.length} פריטי פתיחה`} isActive={activeNav === "intro"} done onClick={() => selectNav("intro")} />

          {/* Chapters */}
          {(chapterNumbers.length > 0 ? chapterNumbers : Array.from({ length: 10 }, (_, i) => i + 1)).map((ch) => {
            const chData = courseData?.chapters?.get(ch);
            return (
              <SbRow
                key={ch}
                label={chapterLabel(ch)}
                subtitle={chData?.topic ?? ""}
                isActive={activeNav === ch}
                done={chapterNumbers.length > 0}
                onClick={() => selectNav(ch)}
              />
            );
          })}

          {/* Coming soon divider */}
          <div style={{ padding: "0.5rem 1rem", background: "rgba(139,111,71,0.04)", borderTop: `1px solid rgba(139,111,71,0.06)`, borderBottom: `1px solid rgba(139,111,71,0.06)` }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.6rem", fontWeight: 700, color: colors.textSubtle, letterSpacing: "0.12em", textTransform: "uppercase" }}>ספרים הבאים</div>
          </div>
          {COMING_SOON_BOOKS.map((b) => (
            <div key={b.name} style={{ padding: "0.7rem 1rem", display: "flex", alignItems: "center", gap: "0.55rem", opacity: 0.38, borderBottom: `1px solid rgba(139,111,71,0.05)` }}>
              <Lock size={11} style={{ color: colors.textSubtle, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMuted }}>{b.name}</div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.62rem", color: colors.textSubtle }}>{b.chapters} פרקים · בקרוב</div>
              </div>
            </div>
          ))}
        </aside>

        {/* ─── Main content ──────────────────────────────────────── */}
        <main style={{ padding: "2rem 2rem", maxWidth: 880 }}>

          {/* Chapter / intro heading */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.4rem, 3vw, 2rem)", color: colors.textDark, margin: "0 0 0.3rem", lineHeight: 1.15 }}>
              {activeNav === "intro" ? "הקדמה לספר עזרא" : `ספר עזרא — ${chapterLabel(activeNav as number)}`}
            </h2>
            {activeTopic && activeNav !== "intro" && (
              <div style={{ fontFamily: fonts.body, fontSize: "1.05rem", color: colors.goldDark, fontWeight: 600 }}>{activeTopic}</div>
            )}
          </div>

          {/* ─── INTRO ──────────────────────────────────────────── */}
          {activeNav === "intro" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {introItems.length === 0 && (
                <EmptyState icon={<BookOpen size={32} />} title="תכני ההקדמה עדיין לא נטענו" desc="הפעל את ה-import script כדי לטעון את תכני עזרא מ-Google Drive." />
              )}
              {introItems.length > 0 && (
                <div style={{ padding: "0.9rem 1.1rem", background: "rgba(139,111,71,0.06)", borderRadius: radii.lg, fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMid, lineHeight: 1.7, borderInlineStart: `3px solid ${colors.goldDark}` }}>
                  לפני שצוללים לפרקים — כמה פריטי פתיחה שיעזרו לך להיכנס לרוח הספר.
                </div>
              )}
              {introItems.map((item, idx) => (
                <MediaCard key={item.id} lesson={item} featured={idx === 0} embeddedId={embeddedId} onEmbed={setEmbeddedId} />
              ))}
            </div>
          )}

          {/* ─── CHAPTER ────────────────────────────────────────── */}
          {activeNav !== "intro" && (
            <>
              {/* Tabs */}
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ display: "flex", gap: "0.25rem", borderBottom: `2px solid rgba(139,111,71,0.1)` }}>
                  {([
                    { key: "base" as const, label: "בסיס", locked: false },
                    { key: "enrichment" as const, label: "הרחבה", locked: !hasAccess },
                    { key: "weekly" as const, label: "שיעור שבועי", locked: !hasAccess },
                  ]).map((tab) => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "0.75rem 1.25rem", background: "none", border: "none", cursor: "pointer", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.88rem", color: activeTab === tab.key ? colors.goldDark : tab.locked ? colors.textSubtle : colors.textMuted, borderBottom: activeTab === tab.key ? `2px solid ${colors.goldDark}` : "2px solid transparent", marginBottom: -2, display: "inline-flex", alignItems: "center", gap: "0.35rem", transition: "color 0.15s" }}>
                      {tab.locked && <Lock size={11} />}{tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab: בסיס */}
              {activeTab === "base" && (
                <LayerSection
                  items={activeChapterData?.base ?? []}
                  embeddedId={embeddedId}
                  onEmbed={setEmbeddedId}
                  emptyTitle="תכני הבסיס טרם פורסמו"
                  emptyDesc="הפרק עדיין לא הגיע בתוכנית — תכנים יפורסמו כשיגיע תורו."
                  noData={!activeChapterData && chapterNumbers.length > 0}
                />
              )}

              {/* Tab: הרחבה */}
              {activeTab === "enrichment" && (
                !hasAccess
                  ? <LockedPanel tab="הרחבה" />
                  : <LayerSection
                      items={activeChapterData?.enrichment ?? []}
                      embeddedId={embeddedId}
                      onEmbed={setEmbeddedId}
                      emptyTitle="תכני ההרחבה יתווספו בקרוב"
                      emptyDesc="שיעורי ההרחבה לפרק זה עדיין לא הועלו."
                      noData={!activeChapterData && chapterNumbers.length > 0}
                    />
              )}

              {/* Tab: שיעור שבועי */}
              {activeTab === "weekly" && (
                !hasAccess
                  ? <LockedPanel tab="שיעור שבועי" />
                  : <LayerSection
                      items={activeChapterData?.weekly ?? []}
                      embeddedId={embeddedId}
                      onEmbed={setEmbeddedId}
                      emptyTitle="הקלטת השיעור טרם פורסמה"
                      emptyDesc="השיעור השבועי עדיין לא הגיע — ההקלטה תפורסם אחרי השיעור."
                      noData={!activeChapterData && chapterNumbers.length > 0}
                    />
              )}

              {/* No data fallback (import not yet run) */}
              {!activeChapterData && chapterNumbers.length === 0 && !lessonsLoading && (
                <EmptyState icon={<Clock size={32} />} title="תכנים טרם נטענו" desc="הפעל את ה-import script כדי לטעון את תכני עזרא." />
              )}

              {/* Chapter navigation */}
              <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: `1px solid rgba(139,111,71,0.1)`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                {chapterIdx > 0 ? (
                  <button onClick={() => selectNav(chapterNumbers[chapterIdx - 1])} style={navBtnStyle("prev")}>הפרק הקודם ←</button>
                ) : (
                  <button onClick={() => selectNav("intro")} style={navBtnStyle("prev")}>← הקדמה</button>
                )}
                {chapterIdx < chapterNumbers.length - 1 && (
                  <button onClick={() => selectNav(chapterNumbers[chapterIdx + 1])} style={navBtnStyle("next")}>→ הפרק הבא</button>
                )}
              </div>
            </>
          )}

          {/* Intro nav to chapter 1 */}
          {activeNav === "intro" && (
            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: `1px solid rgba(139,111,71,0.1)` }}>
              <button onClick={() => selectNav(chapterNumbers[0] ?? 1)} style={navBtnStyle("next")}>
                → פרק א — {courseData?.chapters?.get(1)?.topic ?? "הצהרת כורש"}
              </button>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) { .course-detail-grid { grid-template-columns: 1fr !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </DesignLayout>
  );
}

// ── Nav button ────────────────────────────────────────────────────────────
function navBtnStyle(dir: "prev" | "next"): React.CSSProperties {
  if (dir === "next") return { padding: "0.7rem 1.5rem", borderRadius: radii.md, background: gradients.goldButton, border: "none", cursor: "pointer", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.9rem", color: "white", boxShadow: shadows.goldGlow, display: "inline-flex", alignItems: "center", gap: "0.4rem" };
  return { padding: "0.7rem 1.25rem", borderRadius: radii.md, background: "white", border: `1px solid rgba(139,111,71,0.15)`, cursor: "pointer", fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMid, display: "inline-flex", alignItems: "center", gap: "0.4rem" };
}

// ── SbRow — sidebar row ────────────────────────────────────────────────────
function SbRow({ label, subtitle, isActive, done, onClick }: { label: string; subtitle: string; isActive: boolean; done: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: "100%", padding: "0.72rem 1rem", background: isActive ? "rgba(139,111,71,0.07)" : "none", border: "none", borderBottom: `1px solid rgba(139,111,71,0.05)`, borderInlineEnd: isActive ? `3px solid ${colors.goldDark}` : "3px solid transparent", cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: done ? "rgba(91,110,58,0.12)" : "rgba(139,111,71,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {done
          ? <span style={{ fontSize: "0.55rem", color: colors.oliveMain, fontWeight: 900 }}>✓</span>
          : <Clock size={10} style={{ color: colors.textSubtle }} />}
      </div>
      <div style={{ flex: 1, textAlign: "right", minWidth: 0 }}>
        <div style={{ fontFamily: fonts.body, fontWeight: isActive ? 700 : 500, fontSize: "0.82rem", color: isActive ? colors.goldDark : colors.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        {subtitle && <div style={{ fontFamily: fonts.body, fontSize: "0.62rem", color: colors.textSubtle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>}
      </div>
    </button>
  );
}

// ── LayerSection ───────────────────────────────────────────────────────────
function LayerSection({ items, embeddedId, onEmbed, emptyTitle, emptyDesc, noData }: {
  items: CommunityLesson[];
  embeddedId: string | null;
  onEmbed: (id: string | null) => void;
  emptyTitle: string;
  emptyDesc: string;
  noData?: boolean;
}) {
  if (noData || items.length === 0) return <EmptyState icon={<Clock size={32} />} title={emptyTitle} desc={emptyDesc} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {items.map((item, idx) => (
        <MediaCard key={item.id} lesson={item} featured={idx === 0} embeddedId={embeddedId} onEmbed={onEmbed} />
      ))}
    </div>
  );
}

// ── MediaCard ──────────────────────────────────────────────────────────────
function MediaCard({ lesson, featured, embeddedId, onEmbed }: {
  lesson: CommunityLesson;
  featured: boolean;
  embeddedId: string | null;
  onEmbed: (id: string | null) => void;
}) {
  const kind = mediaKind(lesson);
  const url  = mediaUrl(lesson);
  const isOpen = embeddedId === lesson.id;
  const accent = KIND_COLOR[kind] ?? colors.goldDark;

  const embedHeight = kind === "pdf" ? 600 : kind === "audio" ? 130 : 420;

  return (
    <div style={{ background: "white", borderRadius: radii.xl, border: featured ? `2px solid ${colors.goldDark}` : `1px solid rgba(139,111,71,0.1)`, boxShadow: featured ? "0 8px 24px rgba(139,111,71,0.12)" : shadows.cardSoft, overflow: "hidden" }}>
      {/* Header row */}
      <div style={{ padding: featured ? "1.3rem 1.6rem" : "1rem 1.35rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Icon */}
        <div style={{ width: featured ? 48 : 40, height: featured ? 48 : 40, borderRadius: radii.md, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: accent }}>
          {kind === "video" ? <Film size={featured ? 22 : 18} /> : kind === "audio" ? <Headphones size={featured ? 22 : 18} /> : <FileText size={featured ? 22 : 18} />}
        </div>
        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: featured ? "1rem" : "0.9rem", color: colors.textDark }}>{lesson.title}</div>
            {KIND_LABEL[kind] && (
              <span style={{ padding: "0.08rem 0.42rem", borderRadius: radii.pill, background: `${accent}15`, color: accent, fontFamily: fonts.body, fontSize: "0.6rem", fontWeight: 700 }}>{KIND_LABEL[kind]}</span>
            )}
          </div>
        </div>
        {/* Action */}
        {url && (
          <button
            onClick={() => onEmbed(isOpen ? null : lesson.id)}
            style={{ padding: "0.44rem 0.9rem", borderRadius: radii.md, background: isOpen ? `${accent}15` : gradients.goldButton, border: isOpen ? `1px solid ${accent}40` : "none", color: isOpen ? accent : "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.76rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0, boxShadow: isOpen ? "none" : shadows.goldGlow, transition: "all 0.15s" }}
          >
            {isOpen ? <><X size={12} /> סגור</> : <><Play size={11} fill="currentColor" /> {KIND_ACTION[kind]}</>}
          </button>
        )}
      </div>
      {/* Embed */}
      {isOpen && url && (
        <div style={{ borderTop: `1px solid rgba(139,111,71,0.08)`, background: "#f5f0e8", padding: "0.75rem" }}>
          <iframe
            src={url}
            allow="autoplay"
            style={{ width: "100%", height: embedHeight, border: "none", borderRadius: 8, display: "block" }}
            title={lesson.title}
          />
          {kind === "audio" && (
            <p style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: colors.textSubtle, margin: "0.4rem 0 0", textAlign: "center" }}>
              אם השמע לא מתחיל — לחץ על ה-Play בתוך הנגן
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── LockedPanel ────────────────────────────────────────────────────────────
function LockedPanel({ tab }: { tab: string }) {
  return (
    <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, padding: "3rem 2rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(139,111,71,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
        <Lock size={28} style={{ color: colors.goldDark, opacity: 0.7 }} />
      </div>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 0.5rem" }}>תוכן ה{tab} למנויים בלבד</h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.8, color: colors.textMuted, maxWidth: 380, margin: "0 auto 1.75rem" }}>
        שיעורי ההרחבה, המאמרים וההקלטות השבועיות פתוחים למנויי הפרק השבועי בלבד.
      </p>
      <Link to="/chapter-weekly" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.75rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.92rem", textDecoration: "none", boxShadow: shadows.goldGlow }}>
        <Heart size={14} fill="currentColor" />הצטרף לתכנית הפרק השבועי
      </Link>
      <div style={{ marginTop: "0.85rem" }}>
        <Link to="/portal" style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark, textDecoration: "underline" }}>כבר מנוי? התחבר לאזור האישי</Link>
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, padding: "3rem 2rem", border: `1px solid rgba(139,111,71,0.08)`, textAlign: "center" }}>
      <div style={{ color: colors.textSubtle, margin: "0 auto 1rem", width: "fit-content" }}>{icon}</div>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", color: colors.textMuted, margin: "0 0 0.5rem" }}>{title}</h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.84rem", color: colors.textSubtle, maxWidth: 360, margin: "0 auto" }}>{desc}</p>
    </div>
  );
}
