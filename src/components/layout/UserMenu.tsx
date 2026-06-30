import { User, LogOut, Heart, History, Shield, UserCircle, Upload, BookOpen } from "lucide-react";
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

interface UserMenuProps {
  isTransparent?: boolean;
}

const UserMenu = ({ isTransparent }: UserMenuProps) => {
  const { user, isAdmin, isLoading, signOut } = useAuth();

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
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <WeeklyChapterInvite variant="menu" />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/portal" className="flex items-center gap-2 font-semibold text-primary">
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
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/admin/upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                העלאת תוכן
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/admin" className="flex items-center gap-2 text-primary">
                <Shield className="h-4 w-4" />
                ניהול האתר
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
