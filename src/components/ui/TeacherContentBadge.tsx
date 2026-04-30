/**
 * TeacherContentBadge — shows a subtle "למורים" indicator when
 * audience_tags includes "teachers".
 *
 * variant="small"  → icon only (GraduationCap, with tooltip)
 * variant="full"   → icon + "למורים" text (default)
 *
 * Usage:
 *   <TeacherContentBadge tags={series.audience_tags} />
 *   <TeacherContentBadge tags={lesson.audience_tags} variant="small" />
 */
import { GraduationCap } from "lucide-react";
import { colors, fonts, radii } from "@/lib/designTokens";

interface TeacherContentBadgeProps {
  tags: string[] | null | undefined;
  variant?: "small" | "full";
  className?: string;
}

export function TeacherContentBadge({ tags, variant = "full", className }: TeacherContentBadgeProps) {
  if (!tags || !tags.includes("teachers")) return null;

  const isSmall = variant === "small";

  return (
    <span
      className={className}
      title="תוכן מתאים להוראה"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: isSmall ? "0.15rem 0.3rem" : "0.2rem 0.5rem",
        borderRadius: radii.pill,
        background: "rgba(196,162,101,0.14)",
        border: "1px solid rgba(139,111,71,0.22)",
        color: colors.goldDeep,
        fontFamily: fonts.body,
        fontSize: isSmall ? "0.6rem" : "0.68rem",
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
        flexShrink: 0,
        cursor: "default",
        userSelect: "none",
      }}
    >
      <GraduationCap size={isSmall ? 10 : 11} style={{ flexShrink: 0 }} />
      {!isSmall && <span>למורים</span>}
    </span>
  );
}
