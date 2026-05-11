/**
 * TeachersLayout — production layout wrapper for the Teachers Wing.
 *
 * Composes:
 *   DesignHeader  (top, 96px)
 *   TeacherSidebar (right side in RTL, collapsible / mobile drawer)
 *   main content   (flex 1)
 *   DesignFooter   (bottom)
 *   DesignMobileBottomNav (mobile only)
 *
 * Hero is always "olive" variant for the Teachers Wing.
 * Does NOT use the general DesignSidebar — teachers get their own sidebar.
 *
 * Iron rules honored:
 *  - No transparentHeader (sidebar pages use solid header)
 *  - RTL logical CSS only
 *  - Mobile: drawer from header burger
 */
import { useState, type ReactNode } from "react";
import DesignHeader from "@/components/layout-v2/DesignHeader";
import DesignFooter from "@/components/layout-v2/DesignFooter";
import DesignMobileBottomNav from "@/components/layout-v2/DesignMobileBottomNav";
import TeacherSidebar from "./TeacherSidebar";
import { colors } from "@/lib/designTokens";

interface TeachersLayoutProps {
  children: ReactNode;
  /** Active series ID — passed through to TeacherSidebar for highlighting */
  activeSeriesId?: string;
}

export default function TeachersLayout({ children, activeSeriesId }: TeachersLayoutProps) {
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
        transparentOnTop={false}
        onSidebarToggle={() => setDrawerOpen((v) => !v)}
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
        <TeacherSidebar
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          activeSeriesId={activeSeriesId}
        />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px))",
          }}
          className="teachers-layout-main"
        >
          {children}
        </main>
      </div>

      <DesignFooter />
      <DesignMobileBottomNav />

      <style>{`
        @media (max-width: 768px) {
          .teachers-layout-main {
            padding-bottom: 64px !important;
          }
        }
      `}</style>
    </div>
  );
}
