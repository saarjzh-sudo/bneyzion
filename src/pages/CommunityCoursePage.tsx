/**
 * CommunityCoursePage — נגן קורס רגיל (רמה 18ב, סער 15.7.2026).
 *
 * "הייתי משקיע יותר בעיצוב — למעלה ההדר של האתר, סיידבר של השיעורים,
 *  ושהנושא הראשון ייפתח — כמו סקולר."
 *
 * המבנה: הדר האתר (DesignLayout) → הירו קורס → סיידבר-תכנית-לימודים
 * (נושאים מתקפלים, הראשון פתוח, סימוני ✓) + אזור נגן שמציג את השיעור
 * הנבחר (וידאו / שמע / קובץ / טקסט) עם הקודם/הבא ו"סמן כנלמד".
 * קורסי-ספר של הפרק-השבועי (program_slug) ממשיכים להפנות לדף הספר.
 */
import { sanitizeHtml } from "@/lib/sanitize";
import { useParams, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCourseLessons } from "@/hooks/useCommunity";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Lock, Play, Headphones, Paperclip, FileText,
  ChevronDown, CheckCircle2, Circle, ArrowRight, ArrowLeft, BookOpen,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSEO } from "@/hooks/useSEO";
import { useEffect, useMemo, useState } from "react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useCourseProgress, useToggleLessonComplete } from "@/hooks/useCourseProgress";

interface SectionGroup {
  title: string;
  lessons: any[];
}

function mediaIcon(l: any) {
  if (l.video_url) return <Play size={13} style={{ color: colors.goldDark }} />;
  if (l.audio_url) return <Headphones size={13} style={{ color: "#3a8a85" }} />;
  if (l.attachment_url) return <Paperclip size={13} style={{ color: "#a52a2a" }} />;
  return <FileText size={13} style={{ color: colors.textSubtle }} />;
}

const CommunityCoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["community-course", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_courses").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
  // גישה לפי הקורס עצמו (2.7.2026, החלטת סער): קורס פתוח — לכל משתמש מחובר;
  // קורס סגור — לפי הרשמה (course_enrollments) של הקורס הזה.
  const { data: enrollment, isLoading: enrollLoading } = useQuery({
    queryKey: ["course-enrollment", id, user?.id],
    enabled: !!id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("id")
        .eq("course_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(id);
  const { completedIds, canTrack } = useCourseProgress(id);
  const toggleComplete = useToggleLessonComplete(id);

  // ── תכנית הלימודים: נושאים לפי section_title (סדר לפי מספרי השיעורים) ──
  const sections = useMemo<SectionGroup[]>(() => {
    const out: SectionGroup[] = [];
    for (const l of lessons ?? []) {
      const t = String((l as any).section_title || "").trim() || "שיעורי הקורס";
      const last = out[out.length - 1];
      if (last && last.title === t) last.lessons.push(l);
      else out.push({ title: t, lessons: [l] });
    }
    return out;
  }, [lessons]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // כמו סקולר: הנושא הראשון נפתח, והשיעור הראשון נבחר אוטומטית
  useEffect(() => {
    if (!sections.length || selectedId) return;
    setOpenSections(new Set([sections[0].title]));
    setSelectedId(sections[0].lessons[0]?.id ?? null);
  }, [sections, selectedId]);

  const flat = useMemo(() => (lessons ?? []) as any[], [lessons]);
  const selectedIdx = flat.findIndex((l) => l.id === selectedId);
  const selected = selectedIdx >= 0 ? flat[selectedIdx] : null;

  const selectLesson = (l: any) => {
    setSelectedId(l.id);
    const sec = String(l.section_title || "").trim() || "שיעורי הקורס";
    setOpenSections((prev) => new Set(prev).add(sec));
    document.getElementById("course-player-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useSEO({
    title: course?.title,
    description: course?.description ?? undefined,
    image: course?.image_url ?? undefined,
  });

  // קורס-ספר של הפרק השבועי → דף הספר (מבנה פרק+שכבות)
  if (courseLoading) {
    return (
      <DesignLayout sidebar={false}>
        <div className="max-w-5xl mx-auto p-8 space-y-4" dir="rtl">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </DesignLayout>
    );
  }
  if (course && (course as any).program_slug) {
    return <Navigate to={`/course/${(course as any).program_slug}`} replace />;
  }
  if (!authLoading && !user) return <Navigate to="/auth?redirect=/portal" replace />;

  const courseIsOpen = !course?.access_type || course.access_type === "open";
  const isMember = courseIsOpen || !!enrollment;
  const isLoading = authLoading || lessonsLoading || (!courseIsOpen && enrollLoading);

  if (isLoading) {
    return (
      <DesignLayout sidebar={false}>
        <div className="max-w-5xl mx-auto p-8 space-y-4" dir="rtl">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </DesignLayout>
    );
  }

  if (!isMember) {
    return (
      <DesignLayout sidebar={false}>
        <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
          <Card className="max-w-md border-2 border-gold/30 shadow-lg">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-gold/15 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-gold" />
              </div>
              <h2 className="text-xl font-heading text-primary">הקורס עוד לא פתוח לך</h2>
              <p className="text-sm text-muted-foreground">אפשר להכיר את הקורס ולהצטרף אליו בדף הקורס</p>
              <Button asChild><Link to={`/community/${id}`}>לדף הקורס</Link></Button>
            </CardContent>
          </Card>
        </div>
      </DesignLayout>
    );
  }

  const total = flat.length;
  const done = completedIds.size;
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const isSelectedDone = selected ? completedIds.has(selected.id) : false;

  return (
    <DesignLayout sidebar={false}>
      <div dir="rtl">
        {/* ── הירו הקורס ── */}
        <div style={{ background: gradients.mahoganyHero, padding: "2.2rem 1.5rem 1.8rem" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <Link
              to="/portal"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.8rem", color: "rgba(232,213,160,0.85)", textDecoration: "none", marginBottom: "0.8rem" }}
            >
              <ArrowRight size={14} />
              חזרה לפורטל
            </Link>
            <div style={{ display: "flex", gap: "1.4rem", alignItems: "center", flexWrap: "wrap" }}>
              {course?.image_url && (
                <img
                  src={course.image_url}
                  alt=""
                  style={{ width: 108, height: 76, objectFit: "cover", borderRadius: radii.lg, border: "1px solid rgba(232,213,160,0.35)", boxShadow: shadows.cardSoft }}
                />
              )}
              <div style={{ flex: 1, minWidth: 260 }}>
                <h1 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", color: "white", margin: 0, lineHeight: 1.15 }}>
                  {course?.title}
                </h1>
                {course?.description && (
                  <p style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: "rgba(255,255,255,0.75)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
                    {course.description}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginTop: "0.8rem", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 700, color: colors.goldShimmer, background: "rgba(232,213,160,0.12)", border: "1px solid rgba(232,213,160,0.3)", borderRadius: radii.pill, padding: "0.25rem 0.8rem" }}>
                    {total} שיעורים · {sections.length} נושאים
                  </span>
                  {canTrack && total > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: 140, height: 6, background: "rgba(255,255,255,0.18)", borderRadius: 999, overflow: "hidden", display: "inline-block" }}>
                        <span style={{ display: "block", width: `${pct}%`, height: "100%", background: gradients.goldButton, borderRadius: 999, transition: "width 0.3s" }} />
                      </span>
                      <span style={{ fontFamily: fonts.body, fontSize: "0.75rem", color: "rgba(255,255,255,0.8)" }}>
                        {done} מתוך {total} נלמדו
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── סיידבר תכנית-לימודים + נגן ── */}
        <div id="course-player-top" style={{ maxWidth: 1180, margin: "0 auto", padding: "1.75rem 1.5rem 3.5rem" }}>
          <div className="course-player-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem", alignItems: "start" }}>
            {/* Sidebar — תכנית הלימודים */}
            <aside
              className="course-curriculum"
              style={{ position: "sticky", top: "5.5rem", maxHeight: "calc(100vh - 7rem)", overflowY: "auto", background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.14)", boxShadow: shadows.cardSoft }}
              aria-label="תכנית הלימודים"
            >
              <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid rgba(139,111,71,0.12)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BookOpen size={15} style={{ color: colors.goldDark }} />
                <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "0.95rem", color: colors.textDark }}>תכנית הלימודים</span>
              </div>
              {sections.map((sec) => {
                const open = openSections.has(sec.title);
                const secDone = sec.lessons.filter((l) => completedIds.has(l.id)).length;
                return (
                  <div key={sec.title} style={{ borderBottom: "1px solid rgba(139,111,71,0.08)" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(sec.title)) next.delete(sec.title);
                          else next.add(sec.title);
                          return next;
                        })
                      }
                      aria-expanded={open}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.1rem", background: open ? "rgba(196,162,101,0.08)" : "none", border: "none", cursor: "pointer", fontFamily: fonts.body, textAlign: "start" }}
                    >
                      <ChevronDown size={14} style={{ color: colors.goldDark, transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontWeight: 700, fontSize: "0.85rem", color: colors.textDark }}>{sec.title}</span>
                      <span style={{ fontSize: "0.68rem", color: colors.textMuted, flexShrink: 0 }}>
                        {canTrack ? `${secDone}/${sec.lessons.length}` : sec.lessons.length}
                      </span>
                    </button>
                    {open && (
                      <div>
                        {sec.lessons.map((l) => {
                          const isSel = l.id === selectedId;
                          const isDone = completedIds.has(l.id);
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => selectLesson(l)}
                              aria-current={isSel ? "true" : undefined}
                              style={{
                                width: "100%", display: "flex", alignItems: "center", gap: "0.55rem",
                                padding: "0.55rem 1.1rem 0.55rem 0.8rem", border: "none", cursor: "pointer",
                                background: isSel ? "rgba(196,162,101,0.16)" : "none",
                                borderInlineStart: isSel ? `3px solid ${colors.goldDark}` : "3px solid transparent",
                                fontFamily: fonts.body, textAlign: "start", transition: "background 0.12s",
                              }}
                            >
                              {isDone
                                ? <CheckCircle2 size={15} style={{ color: "#2E7D32", flexShrink: 0 }} />
                                : <Circle size={15} style={{ color: "rgba(139,111,71,0.3)", flexShrink: 0 }} />}
                              <span style={{ flex: 1, minWidth: 0, fontSize: "0.8rem", color: isSel ? colors.textDark : colors.textMid, fontWeight: isSel ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {l.title}
                              </span>
                              {mediaIcon(l)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </aside>

            {/* Main — הנגן */}
            <main style={{ minWidth: 0 }}>
              {selected ? (
                <div style={{ background: "white", borderRadius: radii.xl, border: "1px solid rgba(139,111,71,0.12)", boxShadow: shadows.cardSoft, overflow: "hidden" }}>
                  <div style={{ padding: "1.4rem 1.7rem 1rem" }}>
                    <div style={{ fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 700, color: colors.goldDeep, marginBottom: "0.3rem" }}>
                      {String(selected.section_title || "").trim() || "שיעורי הקורס"} · שיעור {selected.lesson_number}
                    </div>
                    <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.35rem", color: colors.textDark, margin: 0, lineHeight: 1.25 }}>
                      {selected.title}
                    </h2>
                    {selected.description && (
                      <p style={{ fontFamily: fonts.body, fontSize: "0.88rem", color: colors.textMuted, margin: "0.4rem 0 0", lineHeight: 1.6 }}>
                        {selected.description}
                      </p>
                    )}
                  </div>

                  <div style={{ padding: "0 1.7rem 1.4rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {selected.video_url && (
                      <div style={{ aspectRatio: "16/9", borderRadius: radii.lg, overflow: "hidden", background: "black", border: "1px solid rgba(139,111,71,0.15)" }}>
                        <iframe src={selected.video_url} style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen title={selected.title} />
                      </div>
                    )}

                    {selected.audio_url && (
                      <div style={{ borderRadius: radii.lg, background: "rgba(58,138,133,0.07)", border: "1px solid rgba(58,138,133,0.2)", padding: "0.9rem 1.1rem", display: "flex", alignItems: "center", gap: "0.9rem" }}>
                        <Headphones size={20} style={{ color: "#3a8a85", flexShrink: 0 }} />
                        <audio controls src={selected.audio_url} style={{ width: "100%", height: 38 }} />
                      </div>
                    )}

                    {selected.attachment_url && (() => {
                      const url: string = String(selected.attachment_url);
                      const lower = url.toLowerCase();
                      const isPdf = lower.includes(".pdf");
                      const isWord = lower.includes(".doc") || lower.includes(".docx");
                      const encoded = encodeURIComponent(url);
                      const isDrivePreview = url.includes("drive.google.com");
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontFamily: fonts.body, fontSize: "0.83rem", fontWeight: 700, color: colors.textDark }}>
                              <Paperclip size={14} style={{ color: colors.goldDark }} />
                              {isPdf ? "PDF מצורף" : isWord ? "מסמך מצורף" : "קובץ מצורף"}
                            </span>
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 700, color: colors.goldDeep, textDecoration: "underline" }}>
                              פתיחה בלשונית חדשה ↗
                            </a>
                          </div>
                          <div style={{ borderRadius: radii.lg, overflow: "hidden", border: "1px solid rgba(139,111,71,0.15)" }}>
                            <iframe
                              src={isDrivePreview || isPdf ? url : `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`}
                              style={{ width: "100%", height: "62vh", minHeight: 380, border: "none", display: "block" }}
                              loading="lazy"
                              title={selected.title}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {selected.content_html && (
                      <div
                        className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:font-heading prose-headings:text-primary leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.content_html ?? "") }}
                      />
                    )}
                  </div>

                  {/* פס פעולה: נלמד + ניווט */}
                  <div style={{ borderTop: "1px solid rgba(139,111,71,0.1)", background: "rgba(250,246,240,0.6)", padding: "0.9rem 1.7rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    {canTrack ? (
                      <button
                        type="button"
                        onClick={() => toggleComplete.mutate({ lessonId: selected.id, completed: !isSelectedDone })}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.55rem 1.2rem",
                          borderRadius: radii.md, border: isSelectedDone ? "1px solid rgba(46,125,50,0.4)" : "none",
                          background: isSelectedDone ? "rgba(46,125,50,0.08)" : gradients.goldButton,
                          color: isSelectedDone ? "#2E7D32" : "white",
                          fontFamily: fonts.body, fontWeight: 700, fontSize: "0.83rem", cursor: "pointer",
                        }}
                      >
                        {isSelectedDone ? <><CheckCircle2 size={15} /> נלמד — לחיצה מבטלת</> : <><Circle size={15} /> סמן שסיימתי את השיעור</>}
                      </button>
                    ) : <span />}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {selectedIdx > 0 && (
                        <button type="button" onClick={() => selectLesson(flat[selectedIdx - 1])}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.55rem 1rem", borderRadius: radii.md, background: "white", border: "1px solid rgba(139,111,71,0.2)", fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMid, cursor: "pointer" }}>
                          <ArrowRight size={14} /> הקודם
                        </button>
                      )}
                      {selectedIdx < flat.length - 1 && (
                        <button type="button" onClick={() => selectLesson(flat[selectedIdx + 1])}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.55rem 1.2rem", borderRadius: radii.md, background: gradients.goldButton, border: "none", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.8rem", color: "white", cursor: "pointer", boxShadow: shadows.goldGlow }}>
                          השיעור הבא <ArrowLeft size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "white", borderRadius: radii.xl, border: "1px dashed rgba(139,111,71,0.25)", padding: "3rem", textAlign: "center", fontFamily: fonts.body, color: colors.textMuted }}>
                  אין עדיין שיעורים בקורס
                </div>
              )}
            </main>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .course-player-grid { grid-template-columns: 1fr !important; }
            .course-curriculum { position: static !important; max-height: none !important; order: 2; }
            .course-player-grid > main { order: 1; }
          }
        `}</style>
      </div>
    </DesignLayout>
  );
};

export default CommunityCoursePage;
