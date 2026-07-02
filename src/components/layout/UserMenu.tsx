import { User, LogOut, Heart, History, UserCircle, BookOpen, ShieldQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { openAuthModal } from "@/components/auth/authModalStore";
import { currentReturnTarget } from "@/components/auth/googleSignIn";
import WeeklyChapterInvite from "@/components/auth/WeeklyChapterInvite";
import { roleMeta, adminLinksFor } from "@/components/auth/roleMeta";

interface UserMenuProps {
  isTransparent?: boolean;
}

const UserMenu = ({ isTransparent }: UserMenuProps) => {
  const { user, isAdmin, userRole, isLoading, signOut } = useAuth();

  // פותח את מודאל-ההתחברות הגלובלי במקום לנווט החוצה, ושומר את יעד-החזרה.
  const handleSignIn = () => openAuthModal({ next: currentReturnTarget() });

  if (isLoading) {
    return (
      <div className={`p-2.5 rounded-xl ${isTransparent ? "text-white/40" : "text-muted-foreground/40"}`}>
        <User className="h-5 w-5 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60 ${
          isTransparent
            ? "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        <span className="flex items-center justify-center bg-white rounded-[5px] p-0.5">
          <GoogleIcon size={14} />
        </span>
        התחברות
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0];

  // תפקיד לתצוגה: admin גובר; אחרת ה-role מה-DB (ברירת-מחדל "משתמש רשום").
  const effectiveRole = isAdmin ? "admin" : userRole ?? "user";
  const role = roleMeta[effectiveRole];
  const adminLinks = adminLinksFor(isAdmin, userRole);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 p-1.5 rounded-xl transition-all ${
            isTransparent
              ? "hover:bg-white/10"
              : "hover:bg-secondary"
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover border-2 border-accent/30"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-display ${
              isTransparent ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
            }`}>
              {displayName?.charAt(0)}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-sm font-display text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <span
            className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-display ${role.badgeClass}`}
          >
            <role.Icon className="h-3 w-3" aria-hidden="true" />
            {role.label}
          </span>
        </div>
        <WeeklyChapterInvite variant="menu" />
        <DropdownMenuItem asChild className="cursor-pointer">
          {/* דף הקורסים — לא הפורטל. מי שאין לו גישה רואה את הקורסים ויכול לרכוש. */}
          <Link to="/design-my-courses" className="flex items-center gap-2 font-semibold text-primary">
            <BookOpen className="h-4 w-4" />
            הקורסים שלי
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/portal" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            האזור האישי
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            שיעורים שמורים
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            היסטוריית צפייה
          </Link>
        </DropdownMenuItem>
        {adminLinks.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <p className="px-3 pt-1 pb-0.5 text-[11px] text-muted-foreground font-display">אזור הצוות</p>
            {adminLinks.map((link) => (
              <DropdownMenuItem key={link.to} asChild className="cursor-pointer">
                <Link to={link.to} className={`flex items-center gap-2 ${link.primary ? "text-primary font-semibold" : ""}`}>
                  <link.Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        {/* משתמש רגיל בלי גישת-ניהול — נתיב מסודר לבקש גישה */}
        {!isAdmin && adminLinks.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/contact?subject=access" className="flex items-center gap-2 text-muted-foreground">
                <ShieldQuestion className="h-4 w-4" />
                בקשת גישת ניהול
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
          <LogOut className="h-4 w-4 ml-2" />
          התנתקות
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
