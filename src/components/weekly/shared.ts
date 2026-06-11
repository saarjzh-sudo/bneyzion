/**
 * shared.ts — shared constants & the SbRow component for weekly-program pages.
 *
 * Extracted from WeeklyBookDetail.tsx so GlobalWeeklyNav can import them
 * without creating a circular dependency.
 */

import { colors, fonts } from "@/lib/designTokens";
import { Clock } from "lucide-react";
import React from "react";

// ── Hebrew numerals (index 0 = א = chapter 1) ─────────────────────────────
export const HEB_NUMS = [
  "א","ב","ג","ד","ה","ו","ז","ח","ט","י",
  "יא","יב","יג","יד","טו","טז","יז","יח","יט","כ",
  "כא","כב","כג","כד",
];

// ── Book accent colors ─────────────────────────────────────────────────────
export const BOOK_ACCENTS: Record<string, string> = {
  "book-ezra":                    "#8B6F47",
  "book-nehemiah":                "#5B6E3A",
  "book-daniel":                  "#6B4E8B",
  "book-esther":                  "#A52A2A",
  "book-haggai-zechariah-malachi":"#3A7A85",
  "book-lamentations":            "#7A5A3A",
};

// ── SbRow ──────────────────────────────────────────────────────────────────
// A sidebar navigation row — shared between WeeklyBookDetail and GlobalWeeklyNav.
export interface SbRowProps {
  label: string;
  subtitle: string;
  isActive: boolean;
  done: boolean;
  accent: string;
  onClick: () => void;
}

export function SbRow({ label, subtitle, isActive, done, accent, onClick }: SbRowProps) {
  return React.createElement(
    "button",
    {
      onClick,
      style: {
        width: "100%",
        padding: "0.7rem 1rem",
        background: isActive ? `${accent}0d` : "none",
        border: "none",
        borderBottom: `1px solid rgba(139,111,71,0.05)`,
        borderInlineEnd: isActive ? `3px solid ${accent}` : "3px solid transparent",
        cursor: "pointer",
        textAlign: "right" as const,
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
      } as React.CSSProperties,
    },
    React.createElement(
      "div",
      {
        style: {
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: done ? `${accent}18` : "rgba(139,111,71,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
      },
      done
        ? React.createElement("span", { style: { fontSize: "0.52rem", color: accent, fontWeight: 900 } }, "✓")
        : React.createElement(Clock, { size: 9, style: { color: colors.textSubtle } })
    ),
    React.createElement(
      "div",
      { style: { flex: 1, textAlign: "right" as const, minWidth: 0 } },
      React.createElement(
        "div",
        {
          style: {
            fontFamily: fonts.body,
            fontWeight: isActive ? 700 : 500,
            fontSize: "0.82rem",
            color: isActive ? accent : colors.textDark,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        },
        label
      ),
      subtitle
        ? React.createElement(
            "div",
            {
              style: {
                fontFamily: fonts.body,
                fontSize: "0.6rem",
                color: colors.textSubtle,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            },
            subtitle
          )
        : null
    )
  );
}
