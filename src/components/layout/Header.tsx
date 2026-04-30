import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Search, Flame } from "lucide-react";
import logoColor from "@/assets/logo-horizontal-color.png";
import logoBright from "@/assets/logo-horizontal-bright.png";
import GlobalSearch from "@/components/search/GlobalSearch";
import UserMenu from "@/components/layout/UserMenu";

const navItems = [
  { label: "ראשי",             href: "/"                 },
  { label: "פרשת השבוע",       href: "/parasha"          },
  { label: "אודותינו",         href: "/about"            },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // On homepage before scroll: transparent with white text
  // On homepage after scroll or other pages: solid background
  const isTransparent = isHome && !isScrolled;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        isTransparent
          ? "bg-transparent border-b border-transparent"
          : "bg-card/80 backdrop-blur-lg border-b border-border"
      }`}
    >
      <div className="container flex items-center h-24 mx-auto relative">
        {/* Logo — rightmost (start in RTL) */}
        <Link to="/" className="flex items-center gap-2 shrink-0 md:w-40">
          <img
            src={isTransparent ? logoBright : logoColor}
            alt="בני ציון"
            className="h-16 md:h-20 w-auto object-contain transition-all duration-300"
          />
        </Link>

        {/* Nav — absolutely centered so it stays centered regardless of logo/actions width */}
        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`text-sm font-medium transition-colors whitespace-nowrap ${
                isTransparent
                  ? "text-white/80 hover:text-white"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/memorial/saadia"
            className={`text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              isTransparent
                ? "text-accent/90 hover:text-accent"
                : "text-accent hover:text-accent/80"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            לזכר סעדיה הי״ד
          </Link>
        </nav>

        {/* Actions — leftmost (end in RTL) */}
        <div className="flex items-center gap-1 md:w-40 justify-end ms-auto">
          <button
            className={`p-2.5 rounded-xl transition-all ${
              isTransparent
                ? "text-white/70 hover:text-white hover:bg-white/10"
                : "text-muted-foreground hover:text-primary hover:bg-secondary"
            }`}
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </button>
          <UserMenu isTransparent={isTransparent} />
          <button
            className={`p-2.5 md:hidden ${
              isTransparent ? "text-white/70" : "text-muted-foreground"
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-card/95 backdrop-blur-lg p-4 space-y-1 animate-fade-in">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/memorial/saadia"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-accent hover:bg-secondary rounded-lg transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <Flame className="h-4 w-4" />
            לזכר סעדיה הי״ד
          </Link>
        </nav>
      )}

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};

export default Header;
