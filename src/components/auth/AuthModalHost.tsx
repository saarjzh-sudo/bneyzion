/**
 * AuthModalHost — מודאל-ההתחברות הגלובלי של האתר.
 *
 * נפתח מכל מקום דרך openAuthModal() (ראה authModalStore). מציג כרטיס-התחברות
 * חם בשפת-האתר עם כפתור Google רשמי, שומר את יעד-החזרה, ומכבד נגישות מלאה:
 * role="dialog", aria-modal, מלכודת-פוקוס, Esc לסגירה, ולחיצה על הרקע סוגרת.
 *
 * רץ ב-root נפרד (לא בתוך עץ-האפליקציה), לכן אינו נשען על Context — ההתחברות
 * מופעלת ישירות דרך startGoogleSignIn.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, MessageSquare, TrendingUp, BookOpen, Sparkles } from "lucide-react";
import { colors, shadows } from "@/lib/designTokens";
import GoogleIcon from "./GoogleIcon";
import { startGoogleSignIn, currentReturnTarget } from "./googleSignIn";
import {
  subscribeAuthModal,
  getAuthModalState,
  closeAuthModal,
  type AuthModalState,
  type AuthModalVariant,
} from "./authModalStore";

const variantCopy: Record<
  AuthModalVariant,
  { Icon: typeof Sparkles; title: string; subtitle: string }
> = {
  general: {
    Icon: Sparkles,
    title: "כניסה לאזור האישי",
    subtitle: "התחברו עם Google ותמשיכו בדיוק מאיפה שעצרתם.",
  },
  progress: {
    Icon: TrendingUp,
    title: "רוצים לשמור את ההתקדמות?",
    subtitle: "התחברו, וכל שיעור שאתם לומדים יחכה לכם בכל מכשיר.",
  },
  favorites: {
    Icon: Heart,
    title: "לשמור את השיעור הזה?",
    subtitle: "התחברו, ותמצאו אותו כאן בכל פעם שתחזרו.",
  },
  comment: {
    Icon: MessageSquare,
    title: "רוצים להגיב?",
    subtitle: "התחברו כדי לכתוב ולהיות חלק מהשיח.",
  },
  enroll: {
    Icon: BookOpen,
    title: "מצטרפים לסדרה?",
    subtitle: "התחברו ונתחיל לעקוב אחרי מה שלמדתם.",
  },
};

const TITLE_ID = "auth-modal-title";
const DESC_ID = "auth-modal-desc";

export default function AuthModalHost() {
  const [modal, setModal] = useState<AuthModalState>(getAuthModalState);
  const [signingIn, setSigningIn] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => subscribeAuthModal(setModal), []);

  // ניהול פוקוס: לשמור פוקוס קודם, להעביר לכפתור הראשי, ולהחזיר בסגירה.
  useEffect(() => {
    if (modal.open) {
      lastFocused.current = document.activeElement as HTMLElement | null;
      // נעילת גלילת-רקע
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => primaryRef.current?.focus(), 30);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = prevOverflow;
      };
    } else {
      lastFocused.current?.focus?.();
    }
  }, [modal.open]);

  // Esc לסגירה + מלכודת-פוקוס על Tab.
  useEffect(() => {
    if (!modal.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeAuthModal();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal.open]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      const next = modal.next ?? currentReturnTarget();
      await startGoogleSignIn(next);
    } finally {
      setSigningIn(false);
    }
  };

  const copy = variantCopy[modal.variant];
  const Icon = copy.Icon;

  return (
    <AnimatePresence>
      {modal.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAuthModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(26,19,8,0.55)",
            backdropFilter: "blur(4px)",
          }}
          dir="rtl"
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            aria-describedby={DESC_ID}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 420,
              background: "#FFFFFF",
              borderRadius: 18,
              padding: "36px 30px 30px",
              boxShadow: shadows.modal,
              border: `1px solid ${colors.parchmentDeep}`,
              textAlign: "center",
            }}
          >
            {/* כפתור סגירה */}
            <button
              onClick={closeAuthModal}
              aria-label="סגירה"
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9,
                border: "none",
                background: "transparent",
                color: colors.textMuted,
                cursor: "pointer",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.parchmentDark;
                e.currentTarget.style.color = colors.textDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = colors.textMuted;
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>

            {/* אייקון לפי הקשר */}
            <div
              style={{
                width: 52,
                height: 52,
                margin: "0 auto 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                background: colors.parchment,
                color: colors.goldDark,
                border: `1px solid ${colors.parchmentDeep}`,
              }}
            >
              <Icon size={24} strokeWidth={2} aria-hidden="true" />
            </div>

            <h2
              id={TITLE_ID}
              style={{
                fontFamily: 'Kedem, "Frank Ruhl Libre", serif',
                fontSize: 25,
                fontWeight: 700,
                color: colors.navyDeep,
                lineHeight: 1.25,
                marginBottom: 8,
              }}
            >
              {copy.title}
            </h2>
            <p
              id={DESC_ID}
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: 15.5,
                color: colors.textMuted,
                lineHeight: 1.6,
                marginBottom: 26,
                maxWidth: 320,
                marginInline: "auto",
              }}
            >
              {copy.subtitle}
            </p>

            {/* כפתור Google */}
            <button
              ref={primaryRef}
              onClick={handleSignIn}
              disabled={signingIn}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "14px 24px",
                borderRadius: 11,
                border: `1px solid ${colors.parchmentDeep}`,
                background: "#FFFFFF",
                fontFamily: "Ploni, system-ui, sans-serif",
                fontSize: 16,
                fontWeight: 600,
                color: colors.navyDeep,
                cursor: signingIn ? "wait" : "pointer",
                opacity: signingIn ? 0.6 : 1,
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                if (signingIn) return;
                e.currentTarget.style.borderColor = colors.goldDark;
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(139,111,71,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.parchmentDeep;
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
              }}
            >
              <GoogleIcon size={20} />
              <span>{signingIn ? "מתחבר..." : "כניסה עם Google"}</span>
            </button>

            <p
              style={{
                fontFamily: "Ploni, sans-serif",
                fontSize: 12.5,
                color: colors.textSubtle,
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              הפרטים שלכם נשמרים אצלכם בלבד.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
