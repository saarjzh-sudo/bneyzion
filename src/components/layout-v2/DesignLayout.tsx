/**
 * DesignLayout — sandbox wrapper that pairs the new v2 Header + Sidebar +
 * Footer + MobileBottomNav. Once the redesign is approved this becomes
 * the drop-in replacement for `Layout.tsx`.
 *
 * NEW (v2.1): Added unified collapsible Sidebar on the right (RTL).
 *   - Desktop ≥1024px: sidebar shows inline, can be collapsed to icons
 *   - Below 1024px: sidebar becomes off-canvas drawer triggered from
 *     the header burger menu
 *
 * Pages can opt out of the sidebar with `sidebar={false}` (e.g. for
 * fully immersive pages like /design-lesson-popup).
 */
import { useState, type ReactNode } from "react";

import DesignHeader from "./DesignHeader";
import DesignFooter from "./DesignFooter";
import DesignMobileBottomNav from "./DesignMobileBottomNav";
import { PromoProvider } from "@/components/promo";
import ImageBannerSlot from "@/components/promo/ImageBannerSlot";
import AccessibilityWidget from "@/components/a11y/AccessibilityWidget";
import DesignSidebar from "./DesignSidebar";
import { colors } from "@/lib/designTokens";

interface DesignLayoutProps {
  children: ReactNode;
  /** If true, header is transparent before scroll (for overlapping dark hero). */
  transparentHeader?: boolean;
  /** If true, hero overlaps the header (negative top margin on main). */
  overlapHero?: boolean;
  /** Set to false to hide the sidebar entirely (default: true). */
  sidebar?: boolean;
}

export default function DesignLayout({
  children,
  transparentHeader = false,
  overlapHero = false,
  sidebar = true,
}: DesignLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: colors.parchment,
      }}
    >
      <DesignHeader
        transparentOnTop={transparentHeader}
        onSidebarToggle={sidebar ? () => setDrawerOpen((v) => !v) : undefined}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          minHeight: 0,
          alignItems: "stretch",
        }}
      >
        {sidebar && (
          <DesignSidebar drawerOpen={drawerOpen} onDrawerClose={() => setDrawerOpen(false)} />
        )}
        <main
          style={{
            flex: 1,
            minWidth: 0, // prevents grid blowout
            // הגנה מה-SDK של Grow/משולם: gs.min.js מזריק stylesheet גלובלי
            // (main{max-width:560px;margin:40px auto;padding:0 20px}) בעת אתחול
            // תשלום. inline style גובר עליו — לכן כל המידות מוגדרות כאן במפורש.
            width: "100%",
            maxWidth: "none",
            margin: overlapHero ? "-96px 0 0" : 0,
            padding: "0 0 calc(env(safe-area-inset-bottom, 0px))",
          }}
          className="design-layout-main"
        >
          {children}
        </main>
      </div>

      {/* 8.7 (סער): באנר-תמונה בעמודי התוכן — מעל הפוטר, בזרימת העמוד (לא צף) */}
      <ImageBannerSlot placement="content" />

      <DesignFooter />
      {/* 7.7.2026 (הרב יואב): 'ניווט' בשורה התחתונה פותח את סיידבר-הניווט במובייל
          (ההמבורגר והחיפוש העליונים הוסתרו במובייל — אין יותר תפריטים כפולים). */}
      <DesignMobileBottomNav onNavigatorOpen={sidebar ? () => setDrawerOpen(true) : undefined} />

      {/* 8.7.2026: פופאפים + לשונית נגישות בכל ה-layouts (היו רק ב-Layout הישן —
          דף הבית ועמודי הסדרות לא קיבלו אותם בכלל) */}
      <PromoProvider />
      <AccessibilityWidget />

      <style>{`
        @media (max-width: 767px) {
          .design-layout-main {
            padding-bottom: 72px !important;
          }
        }
      `}</style>
    </div>
  );
}
