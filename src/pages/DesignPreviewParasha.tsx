/**
 * /design-parasha — Sandbox redesign of the weekly parasha page.
 *
 * Differences from the production ParashaPage.tsx:
 * 1. Uses DesignLayout (v2 shell) — DesignHeader + DesignSidebar + DesignFooter
 * 2. Hero has 3 live CTA buttons (replacing the static image banner)
 * 3. Sticky horizontal TOC (table of contents) with IntersectionObserver
 * 4. Each section has an id and a "back to top" anchor
 * 5. Article cards instead of raw prose — editorial feel
 *
 * SANDBOX RULE: Do NOT edit the production ParashaPage.tsx
 */

import { sanitizeHtml } from "@/lib/sanitize";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Headphones,
  Sparkles,
  BookOpen,
  ChevronUp,
  ArrowLeft,
  Printer,
  GraduationCap,
  Music,
} from "lucide-react";
import DesignLayout from "@/components/layout-v2/DesignLayout";
import { useParasha } from "@/hooks/useParasha";
import { getParashaVerse } from "@/lib/parashaCalendar";
import LessonDialog from "@/components/lesson/LessonDialog";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { colors, fonts, gradients, shadows } from "@/lib/designTokens";

// ── Helpers ────────────────────────────────────────────────────────────────

function extractPullQuote(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, "").trim();
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (s.length > 40 && s.length < 220) return s;
  }
  return sentences[0]?.substring(0, 200) || null;
}

function splitContentInHalf(html: string): [string, string] {
  const parts = html.split(/(?<=<\/p>|<\/div>|<\/h[2-6]>)/gi).filter((p) => p.trim());
  if (parts.length <= 2) return [html, ""];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(""), parts.slice(mid).join("")];
}

function fmtDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.round(seconds / 60);
  return `${m} דק׳`;
}

// ── TOC section definitions ────────────────────────────────────────────────
interface TocItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// ── CTA button definitions ─────────────────────────────────────────────────
interface CtaCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  anchor?: string; // in-page anchor (# jump)
  href?: string; // external link
  color: string; // accent bg
}

// ── Component ──────────────────────────────────────────────────────────────

const DesignPreviewParasha = () => {
  const { parasha, chumash, lessons, audioLessons, articleSeries, riddle, isLoading } =
    useParasha();

  const verse = getParashaVerse(parasha);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("");
  const tocRef = useRef<HTMLDivElement>(null);
  const [tocSticky, setTocSticky] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const articlesWithContent = useMemo(
    () => articleSeries.filter((s) => s.lessonContent),
    [articleSeries]
  );

  const hasAudio = audioLessons.length > 0;
  const hasRiddle = !!(riddle?.content);
  const hasLessons = lessons.length > 0;

  // Build TOC from available content
  const tocItems = useMemo<TocItem[]>(() => {
    const items: TocItem[] = [];
    articlesWithContent.forEach((a, i) => {
      items.push({
        id: `article-${i}`,
        label: a.title,
        icon: <FileText className="h-3.5 w-3.5" />,
      });
    });
    if (hasRiddle) {
      items.push({
        id: "riddle",
        label: "חידות לשולחן השבת",
        icon: <Sparkles className="h-3.5 w-3.5" />,
      });
    }
    if (hasAudio || hasLessons) {
      items.push({
        id: "audio",
        label: "שיעורי שמע",
        icon: <Headphones className="h-3.5 w-3.5" />,
      });
    }
    return items;
  }, [articlesWithContent, hasRiddle, hasAudio, hasLessons]);

  // 3 CTA cards at hero
  const ctaCards = useMemo<CtaCard[]>(() => {
    const cards: CtaCard[] = [
      {
        id: "kriaa",
        icon: <Music className="h-7 w-7" />,
        title: "קריאה בטעמים",
        subtitle: hasAudio
          ? `${audioLessons.length} הקלטות קריאה`
          : "קריאה בטעמים ועם ביאור",
        anchor: "audio",
        color: colors.goldDark,
      },
      {
        id: "riddle",
        icon: <Sparkles className="h-7 w-7" />,
        title: "חידות לשולחן השבת",
        subtitle: hasRiddle ? "חידות מגרות לילדים ולמבוגרים" : "חידות לפרשת השבוע",
        anchor: hasRiddle ? "riddle" : undefined,
        color: colors.tealMain,
      },
      {
        id: "teachers",
        icon: <GraduationCap className="h-7 w-7" />,
        title: "חומרי לימוד למורים",
        subtitle: "כלי הוראה ותכנים אטומיים",
        href: "/teachers",
        color: colors.oliveDark,
      },
    ];
    return cards;
  }, [hasAudio, hasRiddle, audioLessons.length]);

  // Sticky TOC on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!tocRef.current) return;
      const rect = tocRef.current.getBoundingClientRect();
      setTocSticky(rect.top <= 96);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver for active section highlight
  useEffect(() => {
    if (tocItems.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 }
    );
    tocItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [tocItems]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerH = 96;
    const tocH = 56;
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - tocH - 16;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <DesignLayout sidebar={false}>
      {/* ═══════════════════════════════════════════════════════════════
          HERO — parchment variant with title, verse, 3 CTA cards
          ═══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: `linear-gradient(180deg, ${colors.textDark} 0%, #2A1A0A 60%, ${colors.mahogany} 100%)`,
          paddingTop: "4rem",
          paddingBottom: "0",
        }}
        className="relative overflow-hidden"
      >
        {/* Subtle diagonal texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.6) 40px,
              rgba(255,255,255,0.6) 41px
            )`,
          }}
          aria-hidden
        />

        <div className="container max-w-4xl relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-6 print:mb-2">
            <nav className="flex items-center gap-1.5 text-sm text-white/55">
              <Link to="/" className="hover:text-white/90 transition-colors">
                דף הבית
              </Link>
              <ArrowLeft className="h-3 w-3 rotate-180" />
              <span className="text-white/80">פרשת השבוע</span>
            </nav>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-sm text-white/55 hover:text-white transition-colors print:hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              הדפסה
            </button>
          </div>

          {/* Title block */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="text-center mb-2"
          >
            <p
              className="text-sm uppercase tracking-widest mb-3"
              style={{ color: colors.goldShimmer, fontFamily: fonts.body, opacity: 0.75 }}
            >
              פרשת השבוע
            </p>
            <h1
              className="text-4xl md:text-6xl mb-2 leading-tight"
              style={{ fontFamily: fonts.display, color: "#fff", textShadow: "0 2px 24px rgba(0,0,0,0.55)" }}
            >
              פרשת {parasha}
            </h1>
            {chumash && (
              <p
                className="text-base mt-1"
                style={{ color: colors.goldShimmer, fontFamily: fonts.body, opacity: 0.75 }}
              >
                חומש {chumash}
              </p>
            )}
          </motion.div>

          {/* Featured verse */}
          {verse && (
            <motion.blockquote
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-5 max-w-2xl mx-auto text-center text-base md:text-lg leading-relaxed print:mt-3"
              style={{ fontFamily: fonts.display, color: "rgba(255,255,255,0.78)" }}
            >
              ״{verse.text}״
              <span
                className="block text-xs mt-2"
                style={{ color: colors.goldShimmer, opacity: 0.65, fontFamily: fonts.body }}
              >
                [{verse.reference}]
              </span>
            </motion.blockquote>
          )}

          {/* 3 CTA Cards ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="grid grid-cols-3 gap-3 mt-8 pb-0 print:hidden"
          >
            {ctaCards.map((card) => {
              const inner = (
                <div
                  className="group relative flex flex-col items-center text-center gap-3 rounded-t-2xl px-4 py-5 cursor-pointer transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.13)",
                    borderBottom: "none",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = `rgba(255,255,255,0.13)`;
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Icon circle */}
                  <div
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${card.color}28`, border: `1.5px solid ${card.color}55` }}
                  >
                    <span style={{ color: card.color }}>{card.icon}</span>
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm md:text-base leading-tight"
                      style={{ fontFamily: fonts.body, color: "#fff" }}
                    >
                      {card.title}
                    </p>
                    <p
                      className="text-xs mt-0.5 leading-snug hidden md:block"
                      style={{ color: "rgba(255,255,255,0.55)", fontFamily: fonts.body }}
                    >
                      {card.subtitle}
                    </p>
                  </div>
                  {/* Gold bottom-stroke on hover */}
                  <div
                    className="absolute bottom-0 inset-x-0 h-0.5 rounded-b opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: card.color }}
                  />
                </div>
              );

              if (card.href) {
                return (
                  <Link to={card.href} key={card.id}>
                    {inner}
                  </Link>
                );
              }
              return (
                <button
                  key={card.id}
                  onClick={() => card.anchor && scrollTo(card.anchor)}
                  className="text-inherit bg-transparent border-0 p-0"
                >
                  {inner}
                </button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STICKY TOC — horizontal chip strip
          ═══════════════════════════════════════════════════════════════ */}
      {tocItems.length > 0 && (
        <div
          ref={tocRef}
          className="print:hidden"
          style={{
            position: tocSticky ? "sticky" : "relative",
            top: tocSticky ? 96 : undefined,
            zIndex: 40,
            background: colors.parchmentDark,
            borderBottom: `1px solid rgba(139,111,71,0.18)`,
            boxShadow: tocSticky ? shadows.navScroll : "none",
            transition: "box-shadow 0.2s ease",
          }}
        >
          <div className="container max-w-4xl">
            <div
              className="flex items-center gap-1 overflow-x-auto py-2.5 scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              <span
                className="text-xs shrink-0 ml-1 mr-2 font-medium"
                style={{ color: colors.textSubtle, fontFamily: fonts.body }}
              >
                תוכן:
              </span>
              {tocItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 shrink-0"
                    style={{
                      fontFamily: fonts.body,
                      background: isActive ? colors.goldDark : "transparent",
                      color: isActive ? "#fff" : colors.textMuted,
                      border: isActive
                        ? `1px solid ${colors.goldDark}`
                        : `1px solid rgba(139,111,71,0.22)`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(139,111,71,0.1)";
                        (e.currentTarget as HTMLButtonElement).style.color = colors.textDark;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color = colors.textMuted;
                      }
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="py-10 md:py-14 print:py-4 print:bg-transparent"
        style={{ background: colors.parchment }}
      >
        <div className="container max-w-3xl" dir="rtl">

          {/* ── Loading skeleton ── */}
          {isLoading && (
            <div className="space-y-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-amber-100 rounded-lg w-1/3 mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-amber-50 rounded w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty state ── */}
          {!isLoading &&
            articlesWithContent.length === 0 &&
            audioLessons.length === 0 &&
            lessons.length === 0 && (
              <div
                className="text-center py-20 rounded-2xl"
                style={{ background: colors.parchmentDark, border: `1px solid rgba(139,111,71,0.12)` }}
              >
                <FileText
                  className="h-12 w-12 mx-auto mb-4"
                  style={{ color: colors.textSubtle }}
                />
                <p style={{ color: colors.textMuted, fontFamily: fonts.body }}>
                  אין תכנים זמינים כרגע לפרשת {parasha}
                </p>
              </div>
            )}

          {/* ══ Article sections ══ */}
          {articlesWithContent.map((article, i) => (
            <motion.article
              key={`${article.title}-${i}`}
              id={`article-${i}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="mb-2 scroll-mt-40 print:break-inside-avoid"
            >
              {/* Ornamental divider between articles */}
              {i > 0 && (
                <div
                  className="flex items-center gap-4 my-10 print:my-4"
                  aria-hidden
                >
                  <div
                    className="flex-1 h-px"
                    style={{ background: `rgba(139,111,71,0.2)` }}
                  />
                  <span style={{ color: colors.goldDark, fontSize: 18 }}>◆</span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: `rgba(139,111,71,0.2)` }}
                  />
                </div>
              )}

              {/* Section header */}
              <header
                className="flex items-start gap-4 mb-6 print:mb-3"
                style={{
                  borderBottom: `2px solid rgba(139,111,71,0.15)`,
                  paddingBottom: "1rem",
                }}
              >
                <div
                  className="w-1.5 rounded-full shrink-0 mt-1 print:hidden"
                  style={{
                    height: "2.5rem",
                    background: gradients.goldButton,
                  }}
                />
                <div className="flex-1">
                  <h2
                    className="text-xl md:text-2xl leading-tight"
                    style={{ fontFamily: fonts.display, color: colors.textDark }}
                  >
                    {article.title}
                  </h2>
                  <p
                    className="text-sm mt-1"
                    style={{ color: colors.textMuted, fontFamily: fonts.body }}
                  >
                    {article.rabbi}
                  </p>
                </div>
                {/* Open full lesson link if available */}
                {article.lessonId && (
                  <Link
                    to={`/lessons/${article.lessonId}`}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors print:hidden"
                    style={{
                      border: `1px solid rgba(139,111,71,0.3)`,
                      color: colors.goldDark,
                      fontFamily: fonts.body,
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.background =
                        "rgba(139,111,71,0.1)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")
                    }
                  >
                    <BookOpen className="inline h-3 w-3 ml-1" />
                    קרא עוד
                  </Link>
                )}
              </header>

              {/* Article body with pull-quote */}
              {(() => {
                const quote = extractPullQuote(article.lessonContent!);
                const [firstHalf, secondHalf] = splitContentInHalf(article.lessonContent!);
                return (
                  <>
                    <div
                      className="parasha-drop-cap prose prose-xl max-w-none leading-loose
                        prose-headings:font-heading prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-3
                        prose-p:mb-5 prose-p:text-foreground
                        prose-strong:text-foreground prose-strong:font-bold
                        prose-blockquote:border-accent/40 prose-blockquote:text-foreground/80 prose-blockquote:font-serif
                        print:prose-base print:leading-snug"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(firstHalf) }}
                    />
                    {quote && secondHalf && (
                      <aside
                        className="my-8 px-6 py-5 rounded-xl print:border-r-2 print:bg-transparent"
                        style={{
                          background: `linear-gradient(135deg, rgba(139,111,71,0.06), rgba(196,162,101,0.04))`,
                          borderRight: `4px solid ${colors.goldDark}`,
                          fontFamily: fonts.display,
                          color: colors.textMid,
                          fontSize: "1.125rem",
                          lineHeight: 1.75,
                          fontStyle: "italic",
                        }}
                        aria-label="ציטוט מודגש"
                      >
                        {quote}
                      </aside>
                    )}
                    {secondHalf && (
                      <div
                        className="prose prose-xl max-w-none leading-loose
                          prose-headings:font-heading prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-3
                          prose-p:mb-5 prose-p:text-foreground
                          prose-strong:text-foreground prose-strong:font-bold
                          prose-blockquote:border-accent/40 prose-blockquote:text-foreground/80 prose-blockquote:font-serif
                          print:prose-base print:leading-snug"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(secondHalf) }}
                      />
                    )}
                  </>
                );
              })()}

              {/* Back to top anchor */}
              <div className="flex justify-start mt-6 print:hidden">
                <button
                  onClick={scrollToTop}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: colors.textSubtle, fontFamily: fonts.body }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = colors.goldDark)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = colors.textSubtle)
                  }
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  חזרה לראש הדף
                </button>
              </div>
            </motion.article>
          ))}

          {/* ══ Riddle section ══ */}
          {hasRiddle && (
            <motion.div
              id="riddle"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="mt-10 scroll-mt-40 print:break-inside-avoid"
            >
              <div
                className="flex items-center gap-4 my-10 print:my-4"
                aria-hidden
              >
                <div
                  className="flex-1 h-px"
                  style={{ background: `rgba(139,111,71,0.2)` }}
                />
                <span style={{ color: colors.goldDark, fontSize: 18 }}>◆</span>
                <div
                  className="flex-1 h-px"
                  style={{ background: `rgba(139,111,71,0.2)` }}
                />
              </div>

              {/* Riddle header card */}
              <div
                className="flex items-center gap-4 mb-6 rounded-xl px-5 py-4"
                style={{
                  background: `linear-gradient(135deg, rgba(45,125,125,0.08), rgba(45,125,125,0.03))`,
                  border: `1px solid rgba(45,125,125,0.2)`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `rgba(45,125,125,0.15)` }}
                >
                  <Sparkles className="h-5 w-5" style={{ color: colors.tealMain }} />
                </div>
                <div>
                  <h2
                    className="text-xl md:text-2xl leading-tight"
                    style={{ fontFamily: fonts.display, color: colors.textDark }}
                  >
                    חידות לשולחן השבת
                  </h2>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: colors.textMuted, fontFamily: fonts.body }}
                  >
                    פרשת {parasha}
                  </p>
                </div>
              </div>

              <div
                className="prose prose-xl max-w-none leading-loose
                  prose-headings:font-heading prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-3
                  prose-p:mb-5 prose-p:text-foreground
                  prose-strong:text-foreground prose-strong:font-bold
                  prose-ol:pr-6 prose-ul:pr-6
                  print:prose-base print:leading-snug"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(riddle!.content ?? "") }}
              />

              <div className="flex justify-start mt-6 print:hidden">
                <button
                  onClick={scrollToTop}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: colors.textSubtle, fontFamily: fonts.body }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = colors.goldDark)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = colors.textSubtle)
                  }
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  חזרה לראש הדף
                </button>
              </div>
            </motion.div>
          )}

          {/* ══ Audio & lessons section ══ */}
          {(hasAudio || hasLessons) && (
            <motion.div
              id="audio"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="mt-10 scroll-mt-40 print:hidden"
            >
              <div
                className="flex items-center gap-4 my-10"
                aria-hidden
              >
                <div
                  className="flex-1 h-px"
                  style={{ background: `rgba(139,111,71,0.2)` }}
                />
                <span style={{ color: colors.goldDark, fontSize: 18 }}>◆</span>
                <div
                  className="flex-1 h-px"
                  style={{ background: `rgba(139,111,71,0.2)` }}
                />
              </div>

              {/* Audio section header */}
              <div
                className="flex items-center gap-4 mb-6 rounded-xl px-5 py-4"
                style={{
                  background: `linear-gradient(135deg, rgba(139,111,71,0.08), rgba(139,111,71,0.03))`,
                  border: `1px solid rgba(139,111,71,0.18)`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `rgba(139,111,71,0.14)` }}
                >
                  <Headphones className="h-5 w-5" style={{ color: colors.goldDark }} />
                </div>
                <div>
                  <h2
                    className="text-xl md:text-2xl leading-tight"
                    style={{ fontFamily: fonts.display, color: colors.textDark }}
                  >
                    שיעורי שמע ותכנים נוספים
                  </h2>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: colors.textMuted, fontFamily: fonts.body }}
                  >
                    {audioLessons.length + lessons.length} פריטים
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...audioLessons, ...lessons].map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className="group flex items-center gap-3 px-4 py-3.5 rounded-xl text-right transition-all duration-150"
                    style={{
                      background: colors.parchmentDark,
                      border: `1px solid rgba(139,111,71,0.14)`,
                      boxShadow: shadows.cardSoft,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = shadows.cardHover;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(139,111,71,0.35)`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = colors.parchmentDark;
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = shadows.cardSoft;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(139,111,71,0.14)`;
                    }}
                  >
                    {/* Media type icon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `rgba(139,111,71,0.1)` }}
                    >
                      {lesson.audio_url ? (
                        <Headphones className="h-4 w-4" style={{ color: colors.goldDark }} />
                      ) : (
                        <FileText className="h-4 w-4" style={{ color: colors.goldDark }} />
                      )}
                    </div>

                    {/* Title + rabbi */}
                    <div className="flex-1 min-w-0 text-right">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ fontFamily: fonts.body, color: colors.textDark }}
                      >
                        {lesson.title}
                      </p>
                      {lesson.rabbi_name && (
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{ color: colors.textMuted, fontFamily: fonts.body }}
                        >
                          {lesson.rabbi_name}
                        </p>
                      )}
                    </div>

                    {/* Duration pill */}
                    {lesson.duration && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-md shrink-0"
                        style={{
                          background: `rgba(139,111,71,0.1)`,
                          color: colors.textMuted,
                          fontFamily: fonts.body,
                        }}
                      >
                        {fmtDuration(lesson.duration)}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-start mt-6">
                <button
                  onClick={scrollToTop}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: colors.textSubtle, fontFamily: fonts.body }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = colors.goldDark)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = colors.textSubtle)
                  }
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  חזרה לראש הדף
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Lesson dialog (production component) */}
      {selectedLessonId && (
        <LessonDialog
          lessonId={selectedLessonId}
          open={!!selectedLessonId}
          onOpenChange={(open) => !open && setSelectedLessonId(null)}
        />
      )}
    </DesignLayout>
  );
};

export default DesignPreviewParasha;
