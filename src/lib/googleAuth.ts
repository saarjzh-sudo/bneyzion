/**
 * googleAuth — התחברות Google על הדומיין שלנו (Google Identity Services).
 *
 * למה: הזרימה הישנה (supabase.auth.signInWithOAuth) שולחת את הגולש דרך
 * pzvmwfexeiruelwiujxn.supabase.co — ולכן מסך ההסכמה של גוגל הציג את הכתובת
 * המפחידה הזו, וגוגל שלחה מייל "מסרת נתונים ל-pzvmwfexe…" (יפעת, 18.7).
 *
 * GIS מנפיק ID-token *על הדומיין שלנו* (bneyzion), בלי שום מעבר דרך supabase.co,
 * ואז מעבירים אותו ל-supabase.auth.signInWithIdToken — אותו חשבון, אותו סשן.
 * הגולש רואה "כניסה אל בני ציון", והאפליקציה המחוברת בחשבון גוגל נקראת "בני ציון".
 *
 * ⚠️ תלוי בהגדרת GCP: ה-Web Client ID חייב שהדומיינים שלנו יהיו ב-
 * "Authorized JavaScript origins". עד שזה מוגדר — getGoogleIdToken נכשל בשקט
 * וה-AuthContext נופל אוטומטית לזרימת ה-redirect הישנה (בלי לשבור התחברות).
 */

// מזהה לקוח ציבורי (נשלח ממילא לדפדפן בכל בקשת OAuth) — בטוח בקוד.
// Client חדש בפרויקט site-bz של סער (20.7.2026) — מסך consent "בני ציון", In production.
// הישן (746397450172, פרויקט tidy-rig שלא נגיש לנו) נשאר audience מוכר ב-Supabase לרולבק.
export const GOOGLE_CLIENT_ID =
  "1093150239727-rg1jcm3nhaua3snmi61v002ktniq36kk.apps.googleusercontent.com";

interface GoogleIdConfig {
  client_id: string;
  callback: (resp: { credential?: string }) => void;
  nonce?: string;
  auto_select?: boolean;
  use_fedcm_for_prompt?: boolean;
  cancel_on_tap_outside?: boolean;
}
interface PromptNotification {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
}
interface GoogleAccountsId {
  initialize: (c: GoogleIdConfig) => void;
  prompt: (cb?: (n: PromptNotification) => void) => void;
  cancel: () => void;
}
function gis(): GoogleAccountsId | undefined {
  return (window as unknown as { google?: { accounts?: { id?: GoogleAccountsId } } })
    .google?.accounts?.id;
}

let scriptPromise: Promise<void> | null = null;
function loadGisScript(): Promise<void> {
  if (gis()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("gis-script-failed")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** nonce: גוגל מטמיע את ה-hash ב-JWT, סופאבייס בודק מול ה-raw. */
async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw =
    (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

/**
 * מציג את One Tap של גוגל על הדומיין שלנו ומחזיר credential (JWT) + nonce גולמי.
 * דוחה אם: הסקריפט נחסם, ה-origin לא מורשה ב-GCP, One Tap דוכא, או timeout —
 * בכל אחד מהם ה-caller נופל לזרימת ה-redirect.
 */
export async function getGoogleIdToken(): Promise<{ credential: string; nonce: string }> {
  await loadGisScript();
  const id = gis();
  if (!id) throw new Error("gis-unavailable");
  const { raw, hashed } = await makeNonce();

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce: hashed,
      auto_select: false,
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: true,
      callback: (resp) => {
        if (resp?.credential) done(() => resolve({ credential: resp.credential!, nonce: raw }));
        else done(() => reject(new Error("no-credential")));
      },
    });

    id.prompt((n) => {
      if (n?.isNotDisplayed?.() || n?.isSkippedMoment?.()) {
        const reason = n.getNotDisplayedReason?.() || n.getSkippedReason?.() || "unknown";
        done(() => reject(new Error("prompt-unavailable:" + reason)));
      }
    });

    window.setTimeout(() => done(() => reject(new Error("gis-timeout"))), 9000);
  });
}
