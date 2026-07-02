/**
 * startGoogleSignIn — מתחיל זרימת OAuth של Google ושומר לאן לחזור אחריה.
 *
 * זה אותו היגיון בדיוק כמו `signInWithGoogle` ב-AuthContext, אבל כפונקציה
 * עצמאית — כדי שהמודאל הגלובלי (שמורכב ב-root נפרד, בלי גישה ל-context)
 * יוכל להפעיל התחברות מכל מקום באתר.
 *
 * שמירת-יעד-חזרה: אם מועבר `next`, Google → Supabase → /portal-login?next=ENCODED,
 * וה-effect ב-PortalLogin מעביר את המשתמש אוטומטית ליעד אחרי ההתחברות.
 */
import { supabase } from "@/integrations/supabase/client";

/** נתיבים שאסור לחזור אליהם אחרי התחברות (ימנעו לולאה). */
function sanitizeNext(next?: string): string | undefined {
  if (!next) return undefined;
  if (
    next.startsWith("/portal-login") ||
    next.startsWith("/auth") ||
    next === "/"
  ) {
    return undefined;
  }
  return next;
}

export async function startGoogleSignIn(next?: string): Promise<void> {
  const safeNext = sanitizeNext(next);
  const origin = window.location.origin;
  const redirectTo = safeNext
    ? `${origin}/portal-login?next=${encodeURIComponent(safeNext)}`
    : origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) {
    console.error("Sign-in failed:", error);
    return;
  }
  if (data?.url) window.location.href = data.url;
}

/** היעד הנוכחי של המשתמש, מנוקה מנתיבי-התחברות, לשמירת-חזרה. */
export function currentReturnTarget(): string | undefined {
  return sanitizeNext(window.location.pathname + window.location.search);
}
