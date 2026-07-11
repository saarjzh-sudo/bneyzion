/**
 * GlobalWeeklyNav — all-books accordion sidebar for the weekly program.
 *
 * Replaces the single-book <aside> in WeeklyBookDetail.
 * Each book is an accordion row: click to expand its chapters.
 * The current book is open by default.
 *
 * (11.7.2026 — level 15) Chapter rows are now built from REAL data via
 * useWeeklyProgramChapters (one query for the whole program), not from the
 * old 1..total_lessons proxy. This fixes:
 *   - נחמיה showed פרק א׳-ח׳ while the real chapters are 1,2,3,8,9,10,11,13;
 *   - אסתר showed פרק א׳-ה׳ instead of the pair units (פרקים א׳-ב׳ …);
 *   - the selected chapter was never highlighted because the proxy rows did
 *     not correspond to the page's activeNav (the bug in Saar's screenshot).
 * "done" (✓) now means the chapter really has a published weekly recording —
 * the same deterministic source-of-truth documented in
 * src/hooks/useWeeklyProgramChapters.ts.
 *
 * Mobile: on narrow viewports the grid collapses to 1 column (via CSS in
 * WeeklyBookDetail), so this aside stacks below main content — it stays
 * compact and scrollable.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useWeeklyBooks } from "@/hooks/useCommunity";
import { useWeeklyProgramChapters } from "@/hooks/useWeeklyProgramChapters";
import { colors, fonts } from "@/lib/designTokens";
import { SbRow, BOOK_ACCENTS, chapterRowLabel } from "./shared";

type NavItem = "intro" | number | string;

interface Props {
  /** slug of the currently-displayed book (e.g. "book-ezra") */
  currentSlug: string;
  /** currently-active nav item in the displayed book */
  activeNav: NavItem;
  /** called when user clicks a chapter row within the current book */
  onNavSelect: (item: NavItem) => void;
  /** accent color for the current book */
  accent: string;
}

export function GlobalWeeklyNav({ currentSlug, activeNav, onNavSelect, accent }: Props) {
  const navigate = useNavigate();
  const { data: books = [] } = useWeeklyBooks();
  const { data: chaptersMap } = useWeeklyProgramChapters(books.map((b) => b.id));

  // Which book accordion is open. Start with the current book on desktop;
  // (סער 10.7) בנייד האקורדיון נפתח סגור — הרשימה יושבת מתחת לתוכן ולא
  // דוחפת את הפרק למטה.
  const [expandedSlug, setExpandedSlug] = useState<string>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "" : currentSlug
  );

  function toggleBook(slug: string) {
    const willOpen = expandedSlug !== slug;
    setExpandedSlug(willOpen ? slug : "");
    // If opening a different book, navigate to it
    if (willOpen && slug !== currentSlug) {
      navigate(`/course/${slug}`);
    }
  }

  return (
    <aside
      style={{
        background: "white",
        borderInlineStart: `1px solid rgba(139,111,71,0.08)`,
        overflowY: "auto",
        position: "sticky",
        top: "var(--bz-header-h, 96px)",
        maxHeight: "calc(100vh - var(--bz-header-h, 96px))",
        // Mobile: when grid collapses to 1 col this becomes block-level
        // and the sticky/maxHeight still allow it to scroll if content is tall
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: `1px solid rgba(139,111,71,0.07)`,
          background: colors.parchment,
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.6rem",
            fontWeight: 700,
            color: accent,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "0.1rem",
          }}
        >
          תכנית הפרק השבועי
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.7rem",
            color: colors.textMuted,
          }}
        >
          {books.length} ספרים
        </div>
      </div>

      {/* ── Book accordions ── */}
      {books.map((book) => {
        const slug = book.program_slug ?? "";
        const bookAccent = BOOK_ACCENTS[slug] ?? colors.goldDark;
        const isCurrentBook = slug === currentSlug;
        const isOpen = expandedSlug === slug;

        // Real chapters with published content (see useWeeklyProgramChapters).
        const bookData = chaptersMap?.get(book.id);
        const chapters = bookData?.chapters ?? [];
        const chapterCount = chapters.length || (book.total_lessons ?? 0);

        return (
          <div key={slug}>
            {/* ── Book header row ── */}
            <button
              onClick={() => toggleBook(slug)}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.7rem 1rem",
                background: isCurrentBook
                  ? `${bookAccent}0a`
                  : "white",
                border: "none",
                borderBottom: `1px solid rgba(139,111,71,0.06)`,
                borderInlineEnd: isCurrentBook
                  ? `3px solid ${bookAccent}`
                  : "3px solid transparent",
                cursor: "pointer",
                textAlign: "right",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.82rem",
                  fontWeight: isCurrentBook ? 700 : 500,
                  color: isCurrentBook ? bookAccent : colors.textDark,
                  flex: 1,
                  textAlign: "right",
                }}
              >
                {book.title}
              </span>
              {chapterCount > 0 && (
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.6rem",
                    color: colors.textSubtle,
                    marginInlineStart: "0.4rem",
                    marginInlineEnd: "0.4rem",
                    flexShrink: 0,
                  }}
                >
                  {chapterCount}
                </span>
              )}
              <ChevronDown
                size={12}
                style={{
                  flexShrink: 0,
                  transition: "transform 0.15s",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  color: colors.textSubtle,
                }}
              />
            </button>

            {/* ── Chapter rows (only when accordion is open) ── */}
            {isOpen && (
              <>
                {/* Intro row — always shown first */}
                <SbRow
                  label="הקדמה"
                  subtitle=""
                  isActive={isCurrentBook && activeNav === "intro"}
                  accent={bookAccent}
                  done
                  onClick={() => {
                    if (isCurrentBook) {
                      onNavSelect("intro");
                    } else {
                      navigate(`/course/${slug}`);
                    }
                  }}
                />

                {/* Chapter rows — real bible_chapter numbers */}
                {chapters.map((ch) => {
                  const label = chapterRowLabel(slug, ch);
                  const isActive = isCurrentBook && activeNav === ch;
                  const taught = bookData?.taught.has(ch) ?? false;
                  return (
                    <SbRow
                      key={ch}
                      label={label}
                      subtitle=""
                      isActive={isActive}
                      accent={bookAccent}
                      done={taught}
                      onClick={() => {
                        if (isCurrentBook) {
                          onNavSelect(ch);
                        } else {
                          // Navigate to the other book, pass ?chapter=N
                          navigate(`/course/${slug}?chapter=${ch}`);
                        }
                      }}
                    />
                  );
                })}
              </>
            )}
          </div>
        );
      })}
    </aside>
  );
}
