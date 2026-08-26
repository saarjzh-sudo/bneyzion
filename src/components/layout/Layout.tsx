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
import CampaignBanner from "@/components/common/CampaignBanner";
import { PromoProvider } from "@/components/promo";
import { colors } from "@/lib/designTokens";
import SkipToContent, { MAIN_CONTENT_ID } from "@/components/a11y/SkipToContent";
import AccessibilityWidget from "@/components/a11y/AccessibilityWidget";

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
      {/* T09 — single global promo injection point (banner / conference strip
          above the header; popup renders fixed, suppressed on product+learning). */}
      <SkipToContent />
      <PromoProvider />
      {/* 25.8 (הרב יואב): רצועת קמפיין דקה מעל ה-header, נגללת עם הדף (לא sticky).
          ה-header (DesignHeader) נשאר sticky ותמיד גלוי, ר' הערת אביה 24.8. */}
      <CampaignBanner />
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
          id={MAIN_CONTENT_ID}
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
      {/* 7.7.2026 (הרב יואב): 'ניווט' בשורה התחתונה פותח את סיידבר-הניווט במובייל */}
      <DesignMobileBottomNav onNavigatorOpen={sidebar ? () => setDrawerOpen(true) : undefined} />

      <style>{`
        @media (max-width: 768px) {
          .layout-main {
            padding-bottom: 64px !important;
          }
        }
      `}</style>

      {/* CookieConsent עבר ל-App root — מוצג בכל האתר מהעמוד הראשון (הערת אלי 19.7) */}
      <AccessibilityWidget />
    </div>
  );
};

export default Layout;
