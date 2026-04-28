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
            marginTop: overlapHero ? -96 : 0,
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px))",
          }}
          className="design-layout-main"
        >
          {children}
        </main>
      </div>

      <DesignFooter />
      <DesignMobileBottomNav />

      <style>{`
        @media (max-width: 768px) {
          .design-layout-main {
            padding-bottom: 64px !important;
          }
        }
      `}</style>
    </div>
  );
}
