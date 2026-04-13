import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Users, HeartHandshake, Mail, Flame, Crown, Heart, Smartphone } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal-color.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const Footer = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  return (
    <footer className="bg-card border-t border-border mt-auto section-gradient-warm">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Logo + Memorial */}
          <div className="md:col-span-1">
            <div className="mb-3">
              <img src={logoHorizontal} alt="בני ציון" width={200} height={64} className="h-16" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-display text-accent">לעילוי נשמת</span>
                <Flame className="h-3.5 w-3.5 text-accent" />
              </div>
              <Link to="/memorial" className="text-xs font-serif text-foreground/80 hover:text-primary transition-colors block">בן ציון חיים הנמן הי״ד</Link>
              <Link to="/memorial/saadia" className="text-xs font-serif text-foreground/80 hover:text-primary transition-colors block">סעדיה יעקב בן חיים הי״ד</Link>
              <p className="text-xs font-serif text-foreground/80">מעין פלסר ז״ל</p>
            </div>

            {/* Install button - only when available */}
            {installPrompt && (
              <button
                onClick={handleInstall}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                הוסף לסלולר 📱
              </button>
            )}
          </div>

          <div>
            <h4 className="font-serif font-bold text-sm mb-3 text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              התנ״ך
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/series" className="hover:text-primary transition-colors">סדרות</Link></li>
              <li><Link to="/rabbis" className="hover:text-primary transition-colors">רבנים</Link></li>
              <li><Link to="/parasha" className="hover:text-primary transition-colors">פרשת השבוע</Link></li>
              <li><Link to="/bible/bereshit" className="hover:text-primary transition-colors">ספרי התנ״ך</Link></li>
              <li><Link to="/store" className="hover:text-primary transition-colors">חנות</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-sm mb-3 text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              אודותינו
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary transition-colors">החזון</Link></li>
              <li><Link to="/community" className="hover:text-primary transition-colors flex items-center gap-1"><Crown className="h-3 w-3" />קהילת לומדים</Link></li>
              <li><Link to="/teachers" className="hover:text-primary transition-colors">אגף המורים</Link></li>
              <li><Link to="/kenes" className="hover:text-primary transition-colors">כנס ההודאה</Link></li>
              <li><Link to="/pricing" className="hover:text-primary transition-colors">מסלולים ומחירים</Link></li>
              <li><Link to="/memorial/saadia" className="hover:text-primary transition-colors flex items-center gap-1"><Heart className="h-3 w-3" />לזכר סעדיה הי״ד</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-sm mb-3 text-foreground flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-primary" />
              צור קשר
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-primary transition-colors">טופס יצירת קשר</Link></li>
              <li><Link to="/donate" className="hover:text-primary transition-colors">תרומה</Link></li>
              <li>
                <a href="mailto:office@bneyzion.co.il" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  office@bneyzion.co.il
                </a>
              </li>
              <li>
                <a href="https://wa.me/972527368607" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  052-736-8607
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/channel/UC-gctfj7VsEGFuznbq2y2jw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <YouTubeIcon className="h-3.5 w-3.5" />
                  ערוץ היוטיוב
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-border mt-6 pt-4 flex items-center justify-center gap-8 md:gap-12 pb-4">
          {[
            { value: "11,000+", label: "שיעורים" },
            { value: "200+", label: "רבנים ומרצים" },
            { value: "1,300+", label: "סדרות" },
            { value: "24/7", label: "גישה חופשית" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg md:text-xl font-heading text-primary">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} בני ציון – כל הזכויות שמורות</p>
          <p className="text-xs text-muted-foreground">
            נבנה ב<span className="text-accent mx-0.5">♥</span> ע״י{" "}
            <a href="https://wa.me/972526018772" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline underline-offset-2">סער חלק</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
