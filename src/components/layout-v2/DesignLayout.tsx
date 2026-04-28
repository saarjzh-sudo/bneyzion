/**
 * DesignLayout — sandbox wrapper that pairs the new v2 Header + Footer +
 * MobileBottomNav. Drop-in replacement for `Layout.tsx` once the redesign
 * is rolled out.
 *
 * Usage on sandbox pages:
 *   <DesignLayout transparentHeader>
 *     <DesignPageHero variant="mahogany" title="..." />
 *     ...content...
 *   </DesignLayout>
 *
 * `transparentHeader` is for pages where the hero overlaps under the nav
 * (typically dark heroes). Default: false (solid parchment header).
 */
import { type ReactNode } from "react";

import DesignHeader from "./DesignHeader";
import DesignFooter from "./DesignFooter";
import DesignMobileBottomNav from "./DesignMobileBottomNav";
import { colors } from "@/lib/designTokens";

interface DesignLayoutProps {
  children: ReactNode;
  /** If true, header is transparent before scroll (use with overlapping dark hero). */
  transparentHeader?: boolean;
  /** If true, hero will overlap the header (negative top margin on main). */
  overlapHero?: boolean;
}

export default function DesignLayout({
  children,
  transparentHeader = false,
  overlapHero = false,
}: DesignLayoutProps) {
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
      <DesignHeader transparentOnTop={transparentHeader} />
      <main
        style={{
          flex: 1,
          // 64 = mobile bottom nav height
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px))",
          marginTop: overlapHero ? -96 : 0,
        }}
        className="design-layout-main"
      >
        {children}
      </main>
      <DesignFooter />
      <DesignMobileBottomNav />

      {/* Mobile-only bottom padding so the bottom nav doesn't cover content */}
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
