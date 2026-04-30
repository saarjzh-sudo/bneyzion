/**
 * Layout — production wrapper.
 *
 * UPDATED 2026-04-30: Replaced legacy Header/Footer/MobileBottomNav with the
 * approved v2 Design components and wired in the global DesignSidebar.
 * The sidebar is now available on ALL production pages.
 *
 * Backup tag before this change: backup-pre-sidebar-rollout-2026-04-30
 */
import { useState } from "react";
import DesignHeader from "@/components/layout-v2/DesignHeader";
import DesignFooter from "@/components/layout-v2/DesignFooter";
import DesignMobileBottomNav from "@/components/layout-v2/DesignMobileBottomNav";
import DesignSidebar from "@/components/layout-v2/DesignSidebar";
import { colors } from "@/lib/designTokens";

interface LayoutProps {
  children: React.ReactNode;
  /** Hide the sidebar (e.g. checkout, auth, admin pages). Default: true */
  sidebar?: boolean;
}

const Layout = ({ children, sidebar = true }: LayoutProps) => {
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
          <DesignSidebar
            drawerOpen={drawerOpen}
            onDrawerClose={() => setDrawerOpen(false)}
          />
        )}
        <main
          className="layout-main"
          style={{
            flex: 1,
            minWidth: 0,
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>
      </div>

      <DesignFooter />
      <DesignMobileBottomNav />

      <style>{`
        @media (max-width: 768px) {
          .layout-main {
            padding-bottom: 64px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
