import {
  LayoutDashboard, BookOpen, Users2, FolderOpen, Tag, ArrowLeftRight,
  Shield, Home, Settings, ShoppingBag, Mail, GitCompare, GraduationCap,
  BarChart3, Bell, PanelTop, ClipboardList, Ticket, HeartPulse, CreditCard,
  UserCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal-color.png";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  /**
   * Which roles can see this item.
   * ["admin"] → admin only.
   * ["admin", "creator"] → admin + creator.
   */
  roles: AppRole[];
}

// ─── Content items — admin + creator ───────────────────────────
const CONTENT_ITEMS: NavItem[] = [
  { title: "שיעורים",        url: "/admin/lessons",           icon: BookOpen,      roles: ["admin", "creator"] },
  { title: "רבנים",          url: "/admin/rabbis",            icon: Users2,        roles: ["admin", "creator"] },
  { title: "סדרות",          url: "/admin/series",            icon: FolderOpen,    roles: ["admin", "creator"] },
  { title: "נושאים",         url: "/admin/topics",            icon: Tag,           roles: ["admin", "creator"] },
  { title: "קורסים - קהילה", url: "/admin/community-courses", icon: GraduationCap, roles: ["admin", "creator"] },
  { title: "בריאות תוכן",   url: "/admin/content-health",    icon: HeartPulse,    roles: ["admin", "creator"] },
];

// ─── Management items — admin only ─────────────────────────────
const MANAGEMENT_ITEMS: NavItem[] = [
  { title: "דשבורד",   url: "/admin",               icon: LayoutDashboard, roles: ["admin"] },
  { title: "מנויים",   url: "/admin/subscribers",   icon: UserCheck,       roles: ["admin"] },
  { title: "משתמשים",  url: "/admin/users",          icon: Shield,          roles: ["admin"] },
  { title: "מוצרים",   url: "/admin/products",       icon: ShoppingBag,     roles: ["admin"] },
  { title: "הזמנות",   url: "/admin/orders",         icon: ClipboardList,   roles: ["admin"] },
  { title: "סליקות",   url: "/admin/payments",       icon: CreditCard,      roles: ["admin"] },
  { title: "קופונים",  url: "/admin/coupons",        icon: Ticket,          roles: ["admin"] },
  { title: "אנליטיקס", url: "/admin/analytics",      icon: BarChart3,       roles: ["admin"] },
  { title: "הודעות",   url: "/admin/messages",       icon: Mail,            roles: ["admin"] },
  { title: "התראות",   url: "/admin/notifications",  icon: Bell,            roles: ["admin"] },
  { title: "דף הבית",  url: "/admin/homepage",       icon: PanelTop,        roles: ["admin"] },
  { title: "הגדרות",   url: "/admin/settings",       icon: Settings,        roles: ["admin"] },
];

// NOTE: "מיגרציה" (/admin/migration) and "השוואת תוכן" (/admin/content-compare)
// intentionally removed from nav (wave-2 cleanup). Routes remain in App.tsx for
// direct-URL debug access.

function canSeeItem(item: NavItem, isAdmin: boolean, userRole: AppRole | null): boolean {
  if (isAdmin) return true;
  if (!userRole) return false;
  return item.roles.includes(userRole);
}

export function AdminSidebar() {
  const { user, signOut, isAdmin, userRole } = useAuth();

  const visibleContent    = CONTENT_ITEMS.filter((i) => canSeeItem(i, isAdmin, userRole));
  const visibleManagement = MANAGEMENT_ITEMS.filter((i) => canSeeItem(i, isAdmin, userRole));

  return (
    <Sidebar side="right" className="border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <img src={logoHorizontal} alt="בני ציון" className="h-16" />
      </div>

      <SidebarContent>
        {/* Content section — admin + creator */}
        {visibleContent.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-display text-xs">תוכן</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleContent.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={false}
                        className="hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 ml-2" />
                        <span className="font-display text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management section — admin only */}
        {visibleManagement.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-display text-xs">ניהול</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleManagement.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin"}
                        className="hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 ml-2" />
                        <span className="font-display text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/" className="hover:bg-sidebar-accent/50 transition-colors">
                    <Home className="h-4 w-4 ml-2" />
                    <span className="font-display text-sm">חזרה לאתר</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.user_metadata?.full_name || user?.email}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 shrink-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
