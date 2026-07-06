/**
 * SkipToContent — "דלג לתוכן הראשי" link, required for WCAG 2.1 AA (2.4.1
 * Bypass Blocks) and Israeli Standard 5568.
 *
 * Visually hidden until keyboard focus reaches it (first Tab stop), then
 * jumps the user past the header/sidebar straight to `<main>`.
 *
 * ⚠️ Needs a matching `id="main-content"` on the `<main>` element in
 * `Layout.tsx` (production) and `DesignLayout.tsx` (sandbox) — see
 * SHARED-FILE PATCHES NEEDED. This component only renders the link itself.
 */
import { colors, fonts, radii } from "@/lib/designTokens";

const MAIN_CONTENT_ID = "main-content";

export default function SkipToContent() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="bnz-skip-link"
      style={{
        position: "absolute",
        insetInlineStart: "1rem",
        top: "-100px",
        zIndex: 3000,
        background: colors.textDark,
        color: "#fff",
        fontFamily: fonts.body,
        fontWeight: 700,
        fontSize: "0.95rem",
        padding: "0.75rem 1.25rem",
        borderRadius: radii.md,
        textDecoration: "none",
        transition: "top 0.15s ease",
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = "0.75rem";
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = "-100px";
      }}
    >
      דלג לתוכן הראשי
    </a>
  );
}

export { MAIN_CONTENT_ID };
