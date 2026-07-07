// Static config for the Bnei Zion site navigator bot
// Path in repo: src/components/bot/botConfig.ts

import type { OpeningButton } from "./types";

export const BOT_CONFIG = {
  // Supabase Edge Function endpoint
  // Use the runtime-resolved URL from src/integrations/supabase/client.ts
  edgeFunctionPath: "/functions/v1/navigation-bot",

  // First-visit popup delay (ms)
  firstVisitDelayMs: 3000,

  // localStorage keys
  storage: {
    sessionId: "bz_bot_session_id",
    firstVisitShown: "bz_bot_first_visit_shown",
    history: "bz_bot_history",
  },

  // Window for showing upcoming מועד banners (days before moed)
  moedWindowDays: 20,

  // Branding — 7.7.2026 (הרב יואב): נרטיב "מלווה במסע", פחות בוט-שעונה-על-שאלות
  botName: "בנצי",
  botTagline: "המלווה שלך במסע התנ״ך",
  // Short line shown in the closed launcher pill (below the name)
  botShortTagline: "בוא נמצא את הצעד הבא שלך",
  botAvatar: "/benzi-avatar.png", // round avatar, falls back to gold letter-avatar "בנ" if missing

  // Welcome message (shown above the persona picker)
  welcomeMessage: "שלום, אני בנצי. כל מי שנכנס לכאן נמצא במסע משלו בתנ״ך — בוא נמצא יחד את הצעד הבא שלך. מה מעניין אותך היום?",
} as const;

// ============================================================
// 5 opening buttons (replaces the legacy "I have a Tanach question
// → free chat" button per Yoav's iron rule, 1.5.2026)
// ============================================================
export const OPENING_BUTTONS: OpeningButton[] = [
  {
    id: "parasha",
    label: "פרשת השבוע",
    icon: "book",
    prompt: "מה פרשת השבוע ואיפה אפשר ללמוד עליה?",
  },
  {
    id: "search",
    label: "חפש שיעור או סדרה",
    icon: "search",
    prompt: "אני רוצה לחפש משהו באתר. אפשר?",
  },
  {
    id: "how-to-learn",
    label: "איך לומדים תנ\"ך",
    icon: "compass",
    prompt: "אני רוצה ללמוד תנ\"ך — מאיפה להתחיל?",
    followUp: {
      question: "מה הרקע שלך בתנ\"ך?",
      options: [
        { label: "מתחיל לגמרי", persona: "secular", nextPrompt: "אני מתחיל לגמרי. תכוון אותי לסדרה הכי בסיסית." },
        { label: "רקע בסיסי", persona: "shai", nextPrompt: "יש לי רקע בסיסי בתנ\"ך. תכוון אותי לסדרה ברמה בינונית." },
        { label: "לומד גמרא", persona: "roy", nextPrompt: "אני לומד גמרא ורוצה להתמקצע בתנ\"ך. סדרה מעמיקה?" },
      ],
    },
  },
  {
    id: "teacher",
    label: "אני מורה / מחנך",
    icon: "graduation",
    prompt: "אני מורה לתנ\"ך — מה יש לכם בשבילי?",
    followUp: {
      question: "באיזה מסגרת אתה מלמד?",
      options: [
        { label: "חמ\"ד", persona: "teacher", nextPrompt: "אני מורה בחמ\"ד. תכוון אותי לחומרי המורים שלכם." },
        { label: "ממלכתי", persona: "teacher", nextPrompt: "אני מורה בממלכתי. תכוון אותי לחומרי המורים שלכם." },
        { label: "רב / מרצה", persona: "rabbi", nextPrompt: "אני רב/מרצה. תכוון אותי לחומרים מעמיקים." },
      ],
    },
  },
  {
    id: "explore",
    label: "סתם גולש — מה יש פה?",
    icon: "sparkle",
    prompt: "אני סתם נכנסתי. מה יש פה באתר?",
  },
];
