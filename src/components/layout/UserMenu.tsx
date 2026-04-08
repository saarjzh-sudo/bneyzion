import { useState } from "react";
import { User, LogOut, Heart, History, Shield, UserCircle, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  isTransparent?: boolean;
}

const UserMenu = ({ isTransparent }: UserMenuProps) => {
  const { user, isAdmin, isLoading, signInWithGoogle, signOut } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

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
        disabled={signingIn}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display transition-all ${
          isTransparent
            ? "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        } ${signingIn ? "opacity-50 cursor-wait" : ""}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {signingIn ? "מתחבר..." : "התחברות"}
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
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/profile" className="flex items-center gap-2">
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
