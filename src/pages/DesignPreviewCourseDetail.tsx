/**
 * /course/:slug — Weekly program course detail page v3 (data-driven).
 *
 * 2026-06-02: Rewritten from mock data to live DB queries.
 * slug "weekly-chapter" loads ספר עזרא from community_courses/community_course_lessons.
 * Progress bar reflects real chapter count. Sidebar: עזרא live, other 7 books locked.
 * Tab בסיס: Drive video + S3 audio + bible_verses reading + attachment.
 * Tab הרחבה: all-null rows → clean empty state.
 * Tab שיעור שבועי: Drive video + summary_html if present.
 *
 * Access gates (unchanged): בסיס open, הרחבה+שיעור שבועי require program:weekly-chapter tag.
 * Sandbox toggle (admin-only): מנוי / לא-מנוי — logic UNTOUCHED per iron rule.
 */
import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  Lock,
  Play,
  Headphones,
  FileText,
  ChevronRight,
  ChevronLeft,
  Heart,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCourseByProgramSlug,
  useChapterLayerMap,
  useBibleChapter,
} from "@/hooks/useCommunity";
import type { ChapterLayers, CommunityLesson } from "@/hooks/useCommunity";

type TabKey = "base" | "enrichment" | "weekly";

const HEB_NUMS = [
  "א","ב","ג","ד","ה","ו","ז","ח","ט","י","יא","יב","יג","יד",
  "טו","טז","יז","יח","יט","כ","כא","כב","כג","כד",
];
function chapterLabel(n: number) {
  return `פרק ${HEB_NUMS[n - 1] ?? String(n)}`;
}

const PLACEHOLDER_BOOKS = [
  { name: "דניאל",      chapters: 12 },
  { name: "איכה",       chapters: 5  },
  { name: "עזרא-נחמיה", chapters: 23 },
  { name: "אסתר",       chapters: 10 },
  { name: "חגי",        chapters: 2  },
  { name: "זכריה",      chapters: 14 },
  { name: "מלאכי",      chapters: 3  },
  { name: "יהושע",      chapters: 24 },
];

function driveEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m1 = url.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`;
  const m2 = url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  return null;
}

export default function DesignPreviewCourseDetail() {
  const { slug = "weekly-chapter" } = useParams<{ slug: string }>();
  const { hasAccess: realAccess, isLoading: accessLoading } =
    useUserAccess("program:weekly-chapter");
  const { isAdmin } = useAuth();

  // Sandbox preview toggle — UNTOUCHED per iron rule
  const [previewMode, setPreviewMode] = useState<"subscriber" | "locked">("subscriber");
  const hasAccess = isAdmin
    ? previewMode === "subscriber" || realAccess
    : realAccess;

  const programSlug = slug === "weekly-chapter" ? "weekly-chapter" : undefined;
  const { data: course, isLoading: courseLoading, error: courseError } =
    useCourseByProgramSlug(programSlug);
  const courseId = course?.id as string | undefined;
  const { data: layerMap, isLoading: lessonsLoading } = useChapterLayerMap(courseId);

  const chapterNumbers = layerMap?.chapterNumbers ?? [];
  const [activeChapterNum, setActiveChapterNum] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("base");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const resolvedChapter: number | null = useMemo(() => {
    if (activeChapterNum !== null) return activeChapterNum;
    return chapterNumbers.length > 0 ? chapterNumbers[0] : null;
  }, [activeChapterNum, chapterNumbers]);

  const activeChapterIdx =
    resolvedChapter !== null ? chapterNumbers.indexOf(resolvedChapter) : -1;
  const activeLayers: ChapterLayers | undefined =
    resolvedChapter !== null ? layerMap?.chapters.get(resolvedChapter) : undefined;

  const readingChapter =
    activeLayers?.base?.reading_chapter ?? resolvedChapter ?? undefined;
  const bibleBook = course?.title?.includes("עזרא") ? "עזרא" : undefined;
  const { data: verses, isLoading: versesLoading } = useBibleChapter(
    bibleBook,
    activeTab === "base" && readingChapter ? readingChapter : undefined,
  );

  const totalLiveChapters = chapterNumbers.length;
  // totalBookChapters = unique chapter count (NOT course.total_lessons which counts DB rows
  // including base+enrichment+weekly+intro+resources layers, e.g. 32 for a 10-chapter book).
  // Using totalLiveChapters here so progress shows "10/10 פרקים" not "10/32".
  const totalBookChapters = totalLiveChapters;
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
          <Link to="/courses" style={{ color: colors.goldDark, fontFamily: fonts.body, fontWeight: 700 }}>חזרה לקורסים</Link>
        </div>
      </DesignLayout>
    );
  }

  const bookTitle = course?.title ?? "ספר עזרא";
  const bookDesc = course?.description ?? "ספר עזרא — שיבת ציון, בניין הבית וחידוש הברית.";

  return (
    <DesignLayout sidebar={false}>
      {/* Top bar */}
      <div dir="rtl" style={{ background: gradients.warmDark, padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/courses" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontFamily: fonts.body, fontSize: "0.78rem", color: "rgba(232,213,160,0.6)", textDecoration: "none" }}>
            <ChevronLeft size={13} />הקורסים שלי
          </Link>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
          <div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: colors.goldShimmer, marginBottom: "0.2rem" }}>הפרק השבועי בתנ״ך</div>
            <h1 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.25rem", color: "white", margin: 0, lineHeight: 1.2 }}>
              {bookTitle}{resolvedChapter !== null && ` — ${chapterLabel(resolvedChapter)}`}
            </h1>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.2rem", color: colors.goldShimmer, lineHeight: 1 }}>{totalLiveChapters}/{totalBookChapters}</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.63rem", color: "rgba(255,255,255,0.5)" }}>פרקים פעילים</div>
          </div>
          <div style={{ width: 90, height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${totalBookChapters > 0 ? Math.round((totalLiveChapters / totalBookChapters) * 100) : 0}%`, height: "100%", background: gradients.goldButton, borderRadius: 3 }} />
          </div>
          <Link to="/portal" style={{ padding: "0.5rem 1rem", borderRadius: radii.md, border: "1.5px solid rgba(232,213,160,0.3)", background: "rgba(232,213,160,0.08)", color: colors.goldShimmer, fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.75rem", textDecoration: "none", whiteSpace: "nowrap" }}>האזור האישי</Link>
        </div>
      </div>

      {/* Admin toggle — UNTOUCHED */}
      {isAdmin && (
        <div dir="rtl" style={{ background: "rgba(45,31,14,0.97)", borderBottom: "1px solid rgba(232,213,160,0.15)", padding: "0.5rem 1.5rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <span style={{ fontFamily: fonts.body, fontSize: "0.68rem", color: "rgba(232,213,160,0.5)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>תצוגת אדמין</span>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "0.18rem", gap: "0.1rem" }}>
            {([{ key: "subscriber" as const, label: "מנוי" }, { key: "locked" as const, label: "לא-מנוי" }] as const).map((opt) => (
              <button key={opt.key} onClick={() => setPreviewMode(opt.key)} style={{ padding: "0.28rem 0.8rem", borderRadius: 16, border: "none", cursor: "pointer", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.72rem", background: previewMode === opt.key ? gradients.goldButton : "transparent", color: previewMode === opt.key ? "white" : "rgba(232,213,160,0.5)", transition: "all 0.18s" }}>{opt.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Two-column */}
      <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "min(300px, 32%) 1fr", minHeight: "calc(100vh - 220px)", background: colors.parchment }} className="course-detail-grid">

        {/* Sidebar */}
        <aside style={{ background: "white", borderInlineStart: `1px solid rgba(139,111,71,0.1)`, overflowY: "auto", position: "sticky", top: 96, maxHeight: "calc(100vh - 96px)" }}>
          <div style={{ padding: "1.25rem 1rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, background: colors.parchment }}>
            <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.2rem" }}>תוכן הקורס</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: colors.textMuted }}>{totalLiveChapters} פרקים פעילים · {PLACEHOLDER_BOOKS.length + 1} ספרים בתכנית</div>
          </div>

          {/* LIVE book */}
          <div style={{ borderBottom: `1px solid rgba(139,111,71,0.1)` }}>
            <button onClick={() => setSidebarExpanded((v) => !v)} style={{ width: "100%", padding: "0.85rem 1rem", background: "rgba(139,111,71,0.05)", border: "none", cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", gap: "0.6rem", borderInlineEnd: `3px solid ${colors.goldDark}` }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: gradients.goldButton, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${colors.goldDark}` }}>
                <Play size={12} fill="white" style={{ color: "white" }} />
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "0.85rem", color: colors.goldDark }}>{bookTitle}</div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle }}>{totalLiveChapters} פרקים פעילים · נוכחי</div>
              </div>
              <span style={{ color: colors.textSubtle, flexShrink: 0, transition: "transform 0.15s", transform: sidebarExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                <ChevronRight size={13} />
              </span>
            </button>
            {sidebarExpanded && (
              <div style={{ paddingBottom: "0.4rem" }}>
                {chapterNumbers.map((chNum) => {
                  const isActive = resolvedChapter === chNum;
                  const lrs = layerMap?.chapters.get(chNum);
                  const hasBase = !!lrs?.base;
                  return (
                    <button key={chNum} onClick={() => { setActiveChapterNum(chNum); setActiveTab("base"); }}
                      style={{ width: "100%", padding: "0.5rem 1rem 0.5rem 2rem", background: isActive ? "rgba(139,111,71,0.1)" : "none", borderInlineStart: isActive ? `3px solid ${colors.goldDark}` : "3px solid transparent", border: "none", borderTop: "none", borderBottom: "none", borderInlineEnd: "none", cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: 11, height: 11, borderRadius: "50%", border: `1.5px solid ${hasBase ? colors.goldDark : "rgba(139,111,71,0.2)"}`, background: isActive && hasBase ? colors.goldDark : "transparent", flexShrink: 0 }} />
                      <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: isActive ? colors.goldDark : hasBase ? colors.textDark : colors.textSubtle, fontWeight: isActive ? 700 : 400 }}>{chapterLabel(chNum)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Locked placeholders */}
          {PLACEHOLDER_BOOKS.map((pb) => (
            <div key={pb.name} style={{ borderBottom: `1px solid rgba(139,111,71,0.06)`, padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.6rem", opacity: 0.4 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(139,111,71,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={11} style={{ color: colors.textSubtle }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.85rem", color: colors.textDark }}>{pb.name}</div>
                <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", color: colors.textSubtle }}>{pb.chapters} פרקים · בקרוב</div>
              </div>
              <Lock size={12} style={{ color: colors.textSubtle, flexShrink: 0 }} />
            </div>
          ))}
        </aside>

        {/* Main */}
        <main style={{ padding: "2.5rem 2rem", maxWidth: 860 }}>
          {layerMap?.intro && <IntroSection lesson={layerMap.intro} />}

          {resolvedChapter !== null && (
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.22rem 0.65rem", borderRadius: radii.pill, background: "rgba(139,111,71,0.1)", color: colors.goldDark, fontFamily: fonts.body, fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                <Play size={11} fill="currentColor" />{bookTitle}
              </div>
              <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: colors.textDark, margin: "0 0 0.5rem" }}>{chapterLabel(resolvedChapter)}</h2>
              <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, margin: 0, lineHeight: 1.65 }}>{bookDesc}</p>
            </div>
          )}

          {chapterNumbers.length === 0 && !lessonsLoading && (
            <EmptyTabState icon={<BookOpen size={32} />} title="התכנים עדיין לא פורסמו" desc="שיעורי הפרק השבועי יפורסמו בהתאם ללוח הזמנים." />
          )}

          {resolvedChapter !== null && (
            <>
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ display: "flex", gap: "0.25rem", borderBottom: `2px solid rgba(139,111,71,0.1)` }}>
                  {([{ key: "base" as const, label: "בסיס", locked: false }, { key: "enrichment" as const, label: "הרחבה", locked: !hasAccess }, { key: "weekly" as const, label: "שיעור שבועי", locked: !hasAccess }] as const).map((tab) => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "0.75rem 1.25rem", background: "none", border: "none", cursor: "pointer", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.88rem", color: activeTab === tab.key ? colors.goldDark : tab.locked ? colors.textSubtle : colors.textMuted, borderBottom: activeTab === tab.key ? `2px solid ${colors.goldDark}` : "2px solid transparent", marginBottom: -2, display: "inline-flex", alignItems: "center", gap: "0.35rem", transition: "color 0.15s" }}>
                      {tab.locked && <Lock size={11} />}{tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "base" && <BaseTab layers={activeLayers} chapterNum={resolvedChapter} verses={verses} versesLoading={versesLoading} />}
              {activeTab === "enrichment" && <EnrichmentTab layers={activeLayers} hasAccess={hasAccess} />}
              {activeTab === "weekly" && <WeeklyTab layers={activeLayers} hasAccess={hasAccess} />}

              <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: `1px solid rgba(139,111,71,0.1)`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                {activeChapterIdx > 0 ? (
                  <button onClick={() => { setActiveChapterNum(chapterNumbers[activeChapterIdx - 1]); setActiveTab("base"); }} style={{ padding: "0.7rem 1.25rem", borderRadius: radii.md, background: "white", border: `1px solid rgba(139,111,71,0.15)`, cursor: "pointer", fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMid, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>הפרק הקודם ←</button>
                ) : <div />}
                {activeChapterIdx < chapterNumbers.length - 1 && (
                  <button onClick={() => { setActiveChapterNum(chapterNumbers[activeChapterIdx + 1]); setActiveTab("base"); }} style={{ padding: "0.7rem 1.5rem", borderRadius: radii.md, background: gradients.goldButton, border: "none", cursor: "pointer", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.9rem", color: "white", boxShadow: shadows.goldGlow, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>→ הפרק הבא</button>
                )}
              </div>
            </>
          )}

          {layerMap?.resources && <ResourcesSection lesson={layerMap.resources} />}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) { .course-detail-grid { grid-template-columns: 1fr !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </DesignLayout>
  );
}

function IntroSection({ lesson }: { lesson: CommunityLesson }) {
  const embedUrl = driveEmbedUrl(lesson.video_url);
  return (
    <div dir="rtl" style={{ marginBottom: "2.5rem", background: "white", borderRadius: radii.xl, border: `1px solid rgba(139,111,71,0.12)`, overflow: "hidden", boxShadow: shadows.cardSoft }}>
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, background: colors.parchment }}>
        <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.2rem" }}>פתיח הספר</div>
        <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.1rem", color: colors.textDark, margin: 0 }}>{lesson.title}</h3>
      </div>
      {embedUrl && (
        <div style={{ aspectRatio: "16/9", background: "#000" }}>
          <iframe src={embedUrl} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay" title={lesson.title} />
        </div>
      )}
      {lesson.description && <div style={{ padding: "1rem 1.5rem", fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, lineHeight: 1.7 }}>{lesson.description}</div>}
    </div>
  );
}

function ResourcesSection({ lesson }: { lesson: CommunityLesson }) {
  const embedUrl = lesson.presentation_url ? driveEmbedUrl(lesson.presentation_url) : null;
  if (!lesson.attachment_url && !embedUrl) return null;
  return (
    <div dir="rtl" style={{ marginTop: "2.5rem", padding: "1.25rem 1.5rem", background: "white", borderRadius: radii.xl, border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft }}>
      <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem" }}>עזרים</div>
      {lesson.attachment_url && (
        <a href={lesson.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: fonts.body, fontSize: "0.85rem", color: colors.goldDark, textDecoration: "none", fontWeight: 700 }}>
          <FileText size={16} />{lesson.title || "קובץ עזרים"}
        </a>
      )}
      {embedUrl && <div style={{ aspectRatio: "16/9", marginTop: "0.5rem" }}><iframe src={embedUrl} style={{ width: "100%", height: "100%", border: "none", borderRadius: radii.md }} title="עזרים" /></div>}
    </div>
  );
}

function BaseTab({ layers, chapterNum, verses, versesLoading }: { layers: ChapterLayers | undefined; chapterNum: number; verses: Array<{ verse: number; text_he: string }> | undefined; versesLoading: boolean }) {
  const base = layers?.base;
  if (!base) return <EmptyTabState icon={<Headphones size={32} />} title="תכני הבסיס טרם פורסמו" desc="הפרק עדיין לא הגיע בתוכנית — תכנים יפורסמו כשיגיע תורו." />;
  const videoEmbed = driveEmbedUrl(base.video_url);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {videoEmbed && (
        <div style={{ background: "white", borderRadius: radii.xl, overflow: "hidden", border: `2px solid ${colors.goldDark}`, boxShadow: "0 8px 24px rgba(139,111,71,0.12)" }}>
          <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.7rem", borderBottom: `1px solid rgba(139,111,71,0.08)` }}>
            <div style={{ width: 36, height: 36, borderRadius: radii.md, background: `${colors.goldDark}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: colors.goldDark }}><Play size={16} /></div>
            <div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.95rem", color: colors.textDark }}>{base.title}</div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>שיעור בסיס · הרב יואב אוריאל</div>
            </div>
          </div>
          <div style={{ aspectRatio: "16/9", background: "#000" }}><iframe src={videoEmbed} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay" title={base.title} /></div>
        </div>
      )}
      {base.audio_url && (
        <div style={{ background: "white", borderRadius: radii.xl, padding: "1.1rem 1.5rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: radii.md, background: `${colors.tealMain}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: colors.tealMain }}><Headphones size={16} /></div>
            <div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.9rem", color: colors.textDark }}>האזנה לשיעור</div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>אודיו MP3 · פתוח לכולם</div>
            </div>
          </div>
          <audio controls src={base.audio_url} style={{ width: "100%", direction: "ltr" }} />
        </div>
      )}
      {base.attachment_url && (
        <div style={{ background: "white", borderRadius: radii.xl, padding: "1.1rem 1.5rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: radii.md, background: "rgba(165,42,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#a52a2a" }}><FileText size={16} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.9rem", color: colors.textDark }}>דף הכוונה לפרק</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>PDF · פתוח להורדה</div>
          </div>
          <a href={base.attachment_url} target="_blank" rel="noopener noreferrer" style={{ padding: "0.48rem 0.85rem", borderRadius: radii.md, background: "transparent", border: "1px solid rgba(165,42,42,0.3)", color: "#a52a2a", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.78rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>הורד</a>
        </div>
      )}
      <BibleReading chapterNum={chapterNum} verses={verses} isLoading={versesLoading} />
    </div>
  );
}

function BibleReading({ chapterNum, verses, isLoading }: { chapterNum: number; verses: Array<{ verse: number; text_he: string }> | undefined; isLoading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (isLoading) return (
    <div style={{ background: "white", borderRadius: radii.xl, padding: "1.5rem", border: `1px solid rgba(139,111,71,0.1)`, display: "flex", alignItems: "center", gap: "0.75rem", color: colors.textMuted }}>
      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontFamily: fonts.body, fontSize: "0.85rem" }}>טוען את הפרק...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!verses || verses.length === 0) return null;
  const displayVerses = expanded ? verses : verses.slice(0, 3);
  return (
    <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, border: `1px solid rgba(139,111,71,0.1)`, overflow: "hidden", boxShadow: shadows.cardSoft }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid rgba(139,111,71,0.08)`, background: colors.parchment, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.15rem" }}>קריאת הפרק</div>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.9rem", color: colors.textDark }}>{chapterLabel(chapterNum)} · {verses.length} פסוקים</div>
        </div>
        <BookOpen size={18} style={{ color: colors.goldDark, opacity: 0.6 }} />
      </div>
      <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {displayVerses.map((v) => (
          <div key={v.verse} style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
            <span style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: colors.goldDark, minWidth: "1.5rem", flexShrink: 0, lineHeight: 1.8 }}>{v.verse}</span>
            <p style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: colors.textDark, lineHeight: 1.8, margin: 0 }}>{v.text_he}</p>
          </div>
        ))}
        {verses.length > 3 && (
          <button onClick={() => setExpanded((v) => !v)} style={{ marginTop: "0.5rem", padding: "0.55rem 1rem", borderRadius: radii.md, background: "transparent", border: `1px solid rgba(139,111,71,0.2)`, color: colors.goldDark, fontFamily: fonts.body, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", alignSelf: "flex-start" }}>
            {expanded ? "הצג פחות" : `הצג את כל ${verses.length} הפסוקים`}
          </button>
        )}
      </div>
    </div>
  );
}

function EnrichmentTab({ layers, hasAccess }: { layers: ChapterLayers | undefined; hasAccess: boolean }) {
  if (!hasAccess) return <LockedTabPanel tab="הרחבה" />;
  const enrichment = layers?.enrichment;
  if (!enrichment) return <EmptyTabState icon={<Play size={32} />} title="תכני ההרחבה יתווספו בקרוב" desc="שיעורי ההרחבה לפרק זה עדיין לא הועלו. הם יפורסמו בהמשך." />;
  const videoEmbed = driveEmbedUrl(enrichment.video_url);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {videoEmbed && (
        <div style={{ background: "white", borderRadius: radii.xl, overflow: "hidden", border: `2px solid ${colors.goldDark}`, boxShadow: "0 8px 24px rgba(139,111,71,0.12)" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid rgba(139,111,71,0.08)` }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.95rem", color: colors.textDark }}>{enrichment.title}</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>שיעור הרחבה · הרב יואב אוריאל</div>
          </div>
          <div style={{ aspectRatio: "16/9", background: "#000" }}><iframe src={videoEmbed} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay" title={enrichment.title} /></div>
        </div>
      )}
      {enrichment.attachment_url && (
        <a href={enrichment.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "white", borderRadius: radii.xl, border: `1px solid rgba(139,111,71,0.1)`, color: colors.textDark, fontFamily: fonts.body, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", boxShadow: shadows.cardSoft }}>
          <FileText size={16} style={{ color: "#a52a2a" }} />{enrichment.title} — קובץ
        </a>
      )}
    </div>
  );
}

function WeeklyTab({ layers, hasAccess }: { layers: ChapterLayers | undefined; hasAccess: boolean }) {
  if (!hasAccess) return <LockedTabPanel tab="שיעור שבועי" />;
  const weekly = layers?.weekly;
  if (!weekly) return <EmptyTabState icon={<Play size={32} />} title="הקלטת השיעור טרם פורסמה" desc="השיעור השבועי עדיין לא הגיע — ההקלטה תפורסם אחרי השיעור." />;
  const videoEmbed = driveEmbedUrl(weekly.video_url);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {videoEmbed ? (
        <div style={{ background: "white", borderRadius: radii.xl, overflow: "hidden", border: `2px solid ${colors.goldDark}`, boxShadow: "0 8px 24px rgba(139,111,71,0.12)" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid rgba(139,111,71,0.08)` }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.95rem", color: colors.textDark }}>{weekly.title}</div>
            <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textMuted }}>הקלטת השיעור השבועי</div>
          </div>
          <div style={{ aspectRatio: "16/9", background: "#000" }}><iframe src={videoEmbed} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay" title={weekly.title} /></div>
        </div>
      ) : <EmptyTabState icon={<Play size={32} />} title="הקלטת השיעור תפורסם בקרוב" desc="ההקלטה תעלה אחרי עריכה קלה." />}
      {weekly.summary_html && (
        <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, padding: "1.25rem 1.5rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft }}>
          <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, color: colors.goldDark, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>סיכום השיעור</div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.88rem", color: colors.textDark, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: weekly.summary_html }} />
        </div>
      )}
    </div>
  );
}

function LockedTabPanel({ tab }: { tab: string }) {
  return (
    <div dir="rtl" style={{ background: "white", borderRadius: radii.xl, padding: "3rem 2rem", border: `1px solid rgba(139,111,71,0.1)`, boxShadow: shadows.cardSoft, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(139,111,71,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
        <Lock size={28} style={{ color: colors.goldDark, opacity: 0.7 }} />
      </div>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.15rem", color: colors.textDark, margin: "0 0 0.5rem" }}>תוכן ה{tab} למנויים בלבד</h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", lineHeight: 1.8, color: colors.textMuted, maxWidth: 380, margin: "0 auto 1.75rem" }}>שיעורי ההרחבה, המצגות, המאמרים וההקלטות השבועיות פתוחים למנויי הפרק השבועי בלבד.</p>
      <Link to="/megilat-esther" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.75rem", borderRadius: radii.lg, background: gradients.goldButton, color: "white", fontFamily: fonts.accent, fontWeight: 700, fontSize: "0.92rem", textDecoration: "none", boxShadow: shadows.goldGlow }}>
        <Heart size={14} fill="currentColor" />הצטרף — ₪5 לחודש הראשון
      </Link>
      <div style={{ marginTop: "0.85rem" }}>
        <Link to="/portal" style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: colors.goldDark, textDecoration: "underline" }}>כבר מנוי? התחבר לאזור האישי</Link>
      </div>
    </div>
  );
}

function EmptyTabState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ background: "white", borderRadius: radii.xl, padding: "3rem 2rem", border: `1px solid rgba(139,111,71,0.08)`, textAlign: "center" }} dir="rtl">
      <div style={{ color: colors.textSubtle, margin: "0 auto 1rem", width: "fit-content" }}>{icon}</div>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", color: colors.textMuted, margin: "0 0 0.5rem" }}>{title}</h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.84rem", color: colors.textSubtle, maxWidth: 360, margin: "0 auto" }}>{desc}</p>
    </div>
  );
}
