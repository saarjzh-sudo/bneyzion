import { LayoutDashboard, BookOpen, Users2, FolderOpen, Tag, ArrowLeftRight, Shield, Home, Settings, ShoppingBag, Mail, GitCompare, GraduationCap, BarChart3, Bell, PanelTop, ClipboardList, Ticket, HeartPulse } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
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

const navItems = [
  { title: "דשבורד", url: "/admin", icon: LayoutDashboard },
  { title: "שיעורים", url: "/admin/lessons", icon: BookOpen },
  { title: "רבנים", url: "/admin/rabbis", icon: Users2 },
  { title: "סדרות", url: "/admin/series", icon: FolderOpen },
  { title: "נושאים", url: "/admin/topics", icon: Tag },
  { title: "מוצרים", url: "/admin/products", icon: ShoppingBag },
  { title: "הזמנות", url: "/admin/orders", icon: ClipboardList },
  { title: "קופונים", url: "/admin/coupons", icon: Ticket },
  { title: "קורסים - קהילה", url: "/admin/community-courses", icon: GraduationCap },
  { title: "מיגרציה", url: "/admin/migration", icon: ArrowLeftRight },
  { title: "אנליטיקס", url: "/admin/analytics", icon: BarChart3 },
  { title: "השוואת תוכן", url: "/admin/content-compare", icon: GitCompare },
  { title: "הודעות", url: "/admin/messages", icon: Mail },
  { title: "התראות", url: "/admin/notifications", icon: Bell },
  { title: "משתמשים", url: "/admin/users", icon: Shield },
  { title: "דף הבית", url: "/admin/homepage", icon: PanelTop },
  { title: "בריאות תוכן", url: "/admin/content-health", icon: HeartPulse },
  { title: "הגדרות", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { user, signOut } = useAuth();

  return (
    <Sidebar side="right" className="border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <img src={logoHorizontal} alt="בני ציון" className="h-16" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-display text-xs">ניהול</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
