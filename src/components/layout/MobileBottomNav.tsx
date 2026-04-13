import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Heart, Menu, X, Flame } from "lucide-react";
import GlobalSearch from "@/components/search/GlobalSearch";

const navItems = [
  { label: "ראשי", href: "/" },
  { label: "אגף המורים", href: "/teachers" },
  { label: "רבנים", href: "/rabbis" },
  { label: "סדרות", href: "/series" },
  { label: "תנ״ך", href: "/bible/בראשית" },
  { label: "קהילה", href: "/community" },
  { label: "חנות", href: "/store" },
  { label: "פרשת השבוע", href: "/parasha" },
  { label: "אודותינו", href: "/about" },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute bottom-16 left-0 right-0 bg-background border-t border-border p-4 space-y-1 animate-fade-in max-h-[70vh] overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-primary hover:bg-secondary"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/memorial/saadia"
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-accent hover:bg-secondary rounded-lg transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <Flame className="h-4 w-4" />
              לזכר סעדיה הי״ד
            </Link>
          </nav>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-around h-16">
          {/* Home */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              isActive("/") && !menuOpen
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">ראשי</span>
          </Link>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors text-muted-foreground"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-medium">חיפוש</span>
          </button>

          {/* Favorites */}
          <Link
            to="/favorites"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              isActive("/favorites") && !menuOpen
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Heart className="h-5 w-5" />
            <span className="text-[10px] font-medium">מועדפים</span>
          </Link>

          {/* Menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              menuOpen ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="text-[10px] font-medium">תפריט</span>
          </button>
        </div>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};

export default MobileBottomNav;
