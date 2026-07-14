import {
  LayoutDashboard, BookOpen, Users2,
  Shield, Home, ShoppingBag, Mail, GraduationCap,
  BarChart3, Ticket, CreditCard,
  UserCheck, Upload, CalendarDays, Megaphone,
  MessageCircle, Heart, SlidersHorizontal, HelpCircle,
  Package, Bot,
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
  roles: AppRole[];
  /** התאמה מדויקת של הנתיב (לדשבורד /admin) */
  end?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ADMIN: AppRole[] = ["admin"];
const CREATOR: AppRole[] = ["admin", "creator"];

/**
 * סיידבר אדמין — 2 קבוצות (החלטת סער 2.7.2026):
 * "נתונים" ראשון (כולל מכירות), אחריו "תוכן אתר".
 * "הזמנות" הוסר מהניווט — כלול בעמוד "סליקות" (Orders ⊂ Payments).
 * "מיגרציה" + "השוואת תוכן" נשארים route-only לדיבאג (לא בניווט).
 *
 * ארגון מחדש 10.7.2026 (הוראת סער):
 * - "נתוני Monday" הוסר — אוחד לתוך הדשבורד הראשי (/admin).
 * - "הודעות" + "התראות" אוחדו לכניסה אחת "הודעות והתראות" (/admin/messages).
 * - "רבנים" → "רבנים ויוצרים" (הפאנל מנהל גם content_creators).
 * - שיעורים/סדרות/נושאים/דור-הפלאות/תוכן-יומי אוחדו ל"עריכת תוכן" (/admin/content);
 *   "העלאת תוכן" נשאר נפרד (flow יצירה). הראוטים הישנים חיים (route-only).
 * - "הגדרות" הוסר — כל ההגדרות (הנצחה + הדפסה) במרכז השליטה; /admin/settings מפנה לשם.
 */
const SECTIONS: NavSection[] = [
  {
    label: "נתונים",
    items: [
      { title: "דשבורד",        url: "/admin",               icon: LayoutDashboard, roles: ADMIN, end: true },
      // רמה 17: "משתמשים" = העמוד המאוחד (מנויים+תורמים+קונים לפי אימייל).
      // "מנויים" הישן נשאר נגיש ככלי-חירום דרך קישור בתוך העמוד המאוחד.
      { title: "משתמשים",       url: "/admin/users",         icon: UserCheck,   roles: ADMIN },
      { title: "סליקות",        url: "/admin/payments",      icon: CreditCard,  roles: ADMIN },
      // רמה 18: העמוד היה יתום — טבלת מעקב-משלוחים מלאה בלי שום קישור אליה
      { title: "הזמנות ומשלוחים", url: "/admin/orders",      icon: Package,     roles: ADMIN },
      { title: "הקדשות",        url: "/admin/dedications",   icon: Heart,       roles: ADMIN },
      { title: "אנליטיקס",      url: "/admin/analytics",     icon: BarChart3,   roles: ADMIN },
      { title: "קופונים",       url: "/admin/coupons",       icon: Ticket,      roles: ADMIN },
      { title: "הודעות והתראות", url: "/admin/messages",     icon: Mail,        roles: ADMIN },
      // רמה 14 (סער 10.7): שאלות ותשובות — "שאל את הרב" באתר → תור מסודר כאן
      { title: "שאל את הרב",    url: "/admin/questions",     icon: HelpCircle,  roles: ADMIN },
      { title: "שיחות בנצי",    url: "/admin/benzi-conversations", icon: MessageCircle, roles: ADMIN },
      // רמה 18: גם עמוד הידע של בנצי היה יתום (נגיש רק בהקלדת URL)
      { title: "הידע של בנצי",  url: "/admin/benzi",         icon: Bot,         roles: ADMIN },
    ],
  },
  {
    label: "תוכן אתר",
    items: [
      { title: "העלאת תוכן",     url: "/admin/upload",            icon: Upload,        roles: CREATOR },
      { title: "עריכת תוכן",     url: "/admin/content",           icon: BookOpen,      roles: CREATOR },
      { title: "רבנים ויוצרים",  url: "/admin/rabbis",            icon: Users2,        roles: CREATOR },
      { title: "קורסים", url: "/admin/community-courses", icon: GraduationCap, roles: CREATOR },
      { title: "מוצרים",         url: "/admin/products",          icon: ShoppingBag,   roles: ADMIN },
      { title: "כנסים",          url: "/admin/kenes",             icon: CalendarDays,  roles: ADMIN },
      { title: "באנרים ופופאפים", url: "/admin/promos",           icon: Megaphone,     roles: ADMIN },
      // "דף הבית" (/admin/homepage) הוסר מהניווט 8.7.2026 — מסך מיותר: כתב
      // site_settings.homepage_config שדף הבית החי (DesignPreviewHome) לא קורא כלל.
      // ניהול הבאנרים/פופאפים עבר ל"באנרים ופופאפים" (/admin/promos). הראוט נשאר route-only.
      // רמה 13: מרכז שליטה — עריכת נוסחי-האתר (הרב יואב: "עדיף מאשר שאשלח פניות")
      { title: "מרכז שליטה",    url: "/admin/control-center",    icon: SlidersHorizontal, roles: ADMIN },
    ],
  },
];

function canSee(item: NavItem, isAdmin: boolean, userRole: AppRole | null): boolean {
  if (isAdmin) return true;
  if (!userRole) return false;
  return item.roles.includes(userRole);
}

export function AdminSidebar() {
  const { user, signOut, isAdmin, userRole } = useAuth();

  const visibleSections = SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => canSee(i, isAdmin, userRole)) }))
    .filter((s) => s.items.length > 0);

  return (
    <Sidebar side="right" className="border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <img src={logoHorizontal} alt="בני ציון" className="h-16" />
      </div>

      <SidebarContent>
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="font-display text-xs">{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.end ?? false}
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
        ))}

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
