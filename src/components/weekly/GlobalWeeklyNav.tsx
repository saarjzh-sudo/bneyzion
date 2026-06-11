/**
 * GlobalWeeklyNav — all-books accordion sidebar for the weekly program.
 *
 * Replaces the single-book <aside> in WeeklyBookDetail.
 * Each book is an accordion row: click to expand its chapters.
 * The current book is open by default.
 *
 * Mobile: on narrow viewports the grid collapses to 1 column (via CSS in
 * WeeklyBookDetail), so this aside stacks above main content — it stays
 * compact and scrollable.
 *
 * Critique #6+#20 addressed: SbRow, BOOK_ACCENTS, HEB_NUMS imported from
 * shared.ts — no circular dependency.
 * Critique #10 addressed: aside has maxHeight + overflowY; on mobile the
 * grid collapses to a single column so the aside stacks naturally.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useWeeklyBooks } from "@/hooks/useCommunity";
import { colors, fonts } from "@/lib/designTokens";
import { SbRow, BOOK_ACCENTS, HEB_NUMS } from "./shared";

type NavItem = "intro" | number | string;

interface Props {
  /** slug of the currently-displayed book (e.g. "book-ezra") */
  currentSlug: string;
  /** currently-active nav item in the displayed book */
  activeNav: NavItem;
  /** called when user clicks a chapter/sub-book row within the current book */
  onNavSelect: (item: NavItem) => void;
  /** accent color for the current book */
  accent: string;
}

export function GlobalWeeklyNav({ currentSlug, activeNav, onNavSelect, accent }: Props) {
  const navigate = useNavigate();
  const { data: books = [] } = useWeeklyBooks();

  // Which book accordion is open. Start with the current book.
  const [expandedSlug, setExpandedSlug] = useState<string>(currentSlug);

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
        top: 96,
        maxHeight: "calc(100vh - 96px)",
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
        const chapterCount = book.total_lessons ?? book.lesson_count ?? 0;

        // Build chapter list for this book
        // We use a numeric range 1..chapterCount as a proxy.
        // WeeklyBookDetail uses bible_chapter data from DB; here we show the
        // same count so the sidebar "matches" the chapter count badge.
        const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

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

                {/* Chapter rows */}
                {chapters.map((ch) => {
                  const label = `פרק ${HEB_NUMS[ch - 1] ?? ch}`;
                  const isActive = isCurrentBook && activeNav === ch;
                  return (
                    <SbRow
                      key={ch}
                      label={label}
                      subtitle=""
                      isActive={isActive}
                      accent={bookAccent}
                      done
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
