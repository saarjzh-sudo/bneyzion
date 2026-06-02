/**
 * AdminLayout — shared shell for all /admin/* pages.
 * Upgraded header: branded top bar with gold accent line.
 * RTL. CSS-only. No framer-motion.
 */

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#FAF6F0]" dir="rtl">
        <AdminSidebar />
        <main className="flex-1 overflow-auto min-w-0">
          {/* Top header bar */}
          <header
            className="h-14 border-b flex items-center justify-start px-4 sticky top-0 z-20"
            style={{
              background: "#fff",
              borderBottomColor: "#E8D5A0",
              boxShadow: "0 1px 0 0 rgba(196,162,101,0.15)",
            }}
            dir="rtl"
          >
            <SidebarTrigger className="text-[#6B5C4A] hover:text-[#1A2744] transition-colors" />
            {/* gold accent line at top */}
            <div
              className="absolute top-0 inset-x-0 h-0.5"
              style={{ background: "linear-gradient(90deg, #1A2744, #C4A265, #1A2744)" }}
            />
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
