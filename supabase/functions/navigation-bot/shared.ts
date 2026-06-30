/**
 * navigation-bot/shared.ts — pure logic (no side effects, no serve()).
 *
 * Everything here is unit-testable in isolation (see test.ts). The serve()
 * handler in index.ts wires these together with Gemini + Supabase.
 *
 * Responsibilities:
 *   1. Hebrew text normalization + tokenization
 *   2. Content-index search (rabbis / series / topics) — REAL routes only
 *   3. Route validation against the live App.tsx route table + real ids/slugs
 *   4. System-prompt assembly (instructions + dynamic knowledge + retrieval)
 *   5. Gemini JSON parsing + response sanitization
 */

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE TABLE — authoritative, derived from src/App.tsx (2026-06-19 audit).
// Public navigation targets only — NO /admin, /design-*, /dev-pages, /auth,
// /checkout, /thank-you (not places to send a browsing visitor).
// ─────────────────────────────────────────────────────────────────────────────
export const STATIC_ROUTES = new Set<string>([
  "/",
  "/about",
  "/bible",
  "/chapter-weekly",
  "/community",
  "/contact",
  "/courses",
  "/daily-verse",
  "/daily-video",
  "/donate",
  "/dor-haplaot",
  "/favorites",
  "/history",
  "/kenes",
  "/kenes-archive",
  "/megilat-esther",
  "/memorial",
  "/memorial/saadia",
  "/parasha",
  "/portal",
  "/privacy-policy",
  "/profile",
  "/proposal",
  "/rabbis",
  "/roadmap",
  "/series",
  "/store",
  "/teachers",
  "/terms",
]);

// Dynamic-segment prefixes. Routes whose id/slug we CAN validate against the
// live index are checked there (see isValidRoute). The rest are prefix-only.
export const PREFIX_ROUTES = [
  "/rabbis/",
  "/series/",
  "/lessons/",
  "/bible/",
  "/topic/",
  "/category/",
  "/community/",
  "/store/",
  "/teachers/",
  "/course/",
];

// Canonical Tanach books that resolve at /bible/<book>. Slugs are the Hebrew
// names used by BibleBookPage. We validate /bible/<book> against this set.
export const BIBLE_BOOKS = new Set<string>([
  "בראשית", "שמות", "ויקרא", "במדבר", "דברים",
  "יהושע", "שופטים", "שמואל", "מלכים", "ישעיהו", "ירמיהו", "יחזקאל",
  "הושע", "יואל", "עמוס", "עובדיה", "יונה", "מיכה", "נחום", "חבקוק",
  "צפניה", "חגי", "זכריה", "מלאכי",
  "תהילים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת", "אסתר",
  "דניאל", "עזרא", "נחמיה", "עזרא ונחמיה", "דברי הימים",
]);

// ─────────────────────────────────────────────────────────────────────────────
// HEBREW NORMALIZATION
// Strips ניקוד + ta'amei mikra, geresh/gershayim, normalizes final letters,
// lowercases. Used both for the index keywords and the user query.
// ─────────────────────────────────────────────────────────────────────────────
const FINALS: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
// Single-letter inseparable prefixes worth stripping for a fuzzy alt-form.
const PREFIX_CHARS = new Set(["ה", "ו", "ב", "ל", "מ", "ש", "כ", "ד"]);

export function normalizeHe(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFC");
  s = s.replace(/[֑-ׇ]/g, "");          // niqqud + ta'amei mikra
  s = s.replace(/[""'׳״`’‘]/g, "");                // geresh / gershayim / quotes
  s = s.replace(/[|/\\\-_,.;:!?()[\]{}<>]+/g, " "); // punctuation → space
  s = s.replace(/[א-ת]/g, (c) => FINALS[c] ?? c); // final letters → base
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  return s;
}

/** Significant query tokens (len ≥ 2). Each token also yields a prefix-stripped
 *  alt form ("בלק" stays, "הרב" → also "רב") so we match "של הרב קלנר". */
export function tokenize(input: string): string[] {
  const norm = normalizeHe(input);
  const out = new Set<string>();
  for (const raw of norm.split(" ")) {
    if (raw.length < 2) continue;
    out.add(raw);
    if (raw.length >= 3 && PREFIX_CHARS.has(raw[0])) out.add(raw.slice(1));
  }
  return [...out];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT INDEX
// ─────────────────────────────────────────────────────────────────────────────
export type IndexItemType = "rabbi" | "series" | "topic";

export interface IndexItem {
  type: IndexItemType;
  label: string;     // human label shown to the model
  route: string;     // REAL route (/rabbis/<slug>, /series/<id>, /topic/<slug>)
  hay: string;       // normalized searchable text
  count: number;     // lesson_count — used as a tiebreak weight
}

export interface ContentIndex {
  items: IndexItem[];
  rabbiSlugs: Set<string>;
  seriesIds: Set<string>;
  topicSlugs: Set<string>;
}

interface RawRabbi { name: string; slug: string; lesson_count?: number | null }
interface RawSeries { id: string; title: string; bible_book?: string | null; lesson_count?: number | null }
interface RawTopic { name: string; slug: string }

export function buildContentIndex(
  rabbis: RawRabbi[],
  series: RawSeries[],
  topics: RawTopic[],
): ContentIndex {
  const items: IndexItem[] = [];
  const rabbiSlugs = new Set<string>();
  const seriesIds = new Set<string>();
  const topicSlugs = new Set<string>();

  for (const r of rabbis) {
    if (!r?.slug || !r?.name) continue;
    rabbiSlugs.add(r.slug);
    items.push({
      type: "rabbi",
      label: r.name,
      route: `/rabbis/${r.slug}`,
      hay: normalizeHe(r.name),
      count: r.lesson_count ?? 0,
    });
  }
  for (const s of series) {
    if (!s?.id || !s?.title) continue;
    seriesIds.add(s.id);
    const label = s.bible_book ? `${s.title} (${s.bible_book})` : s.title;
    items.push({
      type: "series",
      label,
      route: `/series/${s.id}`,
      hay: normalizeHe(`${s.title} ${s.bible_book ?? ""}`),
      count: s.lesson_count ?? 0,
    });
  }
  for (const t of topics) {
    if (!t?.slug || !t?.name) continue;
    if (t.slug === "themes-root") continue; // the sidebar root, not a content page
    topicSlugs.add(t.slug);
    items.push({
      type: "topic",
      label: t.name,
      route: `/topic/${t.slug}`,
      hay: normalizeHe(t.name),
      count: 0,
    });
  }
  return { items, rabbiSlugs, seriesIds, topicSlugs };
}

/** Keyword search over the index. Returns the top `limit` matches.
 *  Scoring: +2 per query token that is a substring of the item, +1 extra if the
 *  whole normalized query is a substring (phrase match), small log-weight by
 *  lesson_count so the canonical "הרב יוסף קלנר" beats a one-off mention. */
export function searchIndex(index: ContentIndex, query: string, limit = 8): IndexItem[] {
  const toks = tokenize(query);
  if (toks.length === 0) return [];
  const normQ = normalizeHe(query);

  const scored: Array<{ item: IndexItem; score: number }> = [];
  for (const item of index.items) {
    let score = 0;
    let hits = 0;
    for (const t of toks) {
      if (item.hay.includes(t)) {
        score += t.length >= 3 ? 2 : 1;
        hits++;
      }
    }
    if (hits === 0) continue;
    if (normQ.length >= 3 && item.hay.includes(normQ)) score += 3; // phrase bonus
    score += Math.min(Math.log10((item.count || 0) + 1), 2);       // popularity, capped
    // Require a real signal: at least one ≥3-char token hit, or a phrase hit.
    if (score < 2) continue;
    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE VALIDATION — prefix table + real id/slug existence (the precision win)
// ─────────────────────────────────────────────────────────────────────────────
export function isValidRoute(route: string, index?: ContentIndex | null): boolean {
  if (!route || typeof route !== "string") return false;
  const clean = route.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (STATIC_ROUTES.has(clean)) return true;

  // Routes we CAN verify against live content — reject hallucinated ids/slugs.
  if (clean.startsWith("/rabbis/")) {
    const slug = clean.slice("/rabbis/".length);
    return index ? index.rabbiSlugs.has(slug) : slug.length > 0;
  }
  if (clean.startsWith("/series/")) {
    const id = clean.slice("/series/".length);
    return index ? index.seriesIds.has(id) : id.length > 0;
  }
  if (clean.startsWith("/topic/")) {
    const slug = clean.slice("/topic/".length);
    return index ? index.topicSlugs.has(slug) : slug.length > 0;
  }
  if (clean.startsWith("/bible/")) {
    const book = decodeURIComponent(clean.slice("/bible/".length));
    return BIBLE_BOOKS.has(book);
  }

  // Remaining dynamic routes — prefix-only (ids we can't cheaply verify here).
  for (const prefix of PREFIX_ROUTES) {
    if (clean.startsWith(prefix) && clean.length > prefix.length) return true;
  }
  return false;
}

export function sanitizeRoute(route: string, index?: ContentIndex | null): string {
  return isValidRoute(route, index) ? route : "/";
}

export interface Cta { label: string; route: string; icon?: string }

export function sanitizeCtas(ctas: unknown, index?: ContentIndex | null): Cta[] {
  if (!Array.isArray(ctas)) return [];
  return (ctas as Cta[])
    .filter((c) => c && typeof c.label === "string" && c.label.trim())
    .map((c) => ({ ...c, route: sanitizeRoute(c.route, index) }))
    .filter((c) => c.route !== "/")
    .slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────
export const FALLBACK_KNOWLEDGE = `
זהות האתר:
אתר בני ציון — פרויקט לימוד תנ"ך שייסד הרב יואב אוריאל.
12,718+ שיעורים, 200+ רבנים, 1,400+ סדרות.

הרב יואב אוריאל — המייסד:
ראש ומייסד תנועת "בני ציון". מחבר "מכלל יופי". מרצה 15+ שנה.
מנהל תכנית הפרק השבועי (/chapter-weekly).

תכנית הפרק השבועי:
שיעור זום שבועי בהנחיית הרב יואב, 110 ₪/חודש, ללא התחייבות.
`.trim();

export function formatRetrieval(matches: IndexItem[]): string {
  if (!matches.length) return "";
  const lines = matches.map((m) => {
    const tag = m.type === "rabbi" ? "רב" : m.type === "series" ? "סדרה" : "נושא";
    const cnt = m.count ? ` — ${m.count} שיעורים` : "";
    return `- [${tag}] "${m.label}"${cnt} → ${m.route}`;
  });
  return `
═══════════════════════════════
תוצאות חיפוש מהאתר (נתיבים אמיתיים)
═══════════════════════════════
אלו פריטים אמיתיים מהאתר שתואמים לשאלה. כשאתה מפנה לדף של רב / סדרה / נושא —
השתמש אך ורק ב-route מהרשימה הזו. אל תמציא slug או id.
אם מה שהמשתמש מבקש לא נמצא כאן — הפנה לדף הכללי (/rabbis, /series, /parasha) ואל תמציא.

${lines.join("\n")}`.trim();
}

export function buildSystemPrompt(
  currentRoute: string | null,
  currentParasha: string | null,
  dynamicKnowledge: string,
  retrievalBlock: string,
): string {
  const routeCtx = currentRoute ? `\nהמשתמש נמצא כרגע בדף: ${currentRoute}` : "";
  const parashaCtx = currentParasha
    ? `\nפרשת השבוע הנוכחית (לוח ישראל): ${currentParasha}`
    : "\n(פרשת השבוע לא נמסרה — אם נשאל, אמור שאינך בטוח ותפנה ל-/parasha)";

  return `אתה בנצי — עוזר ידע של אתר בני ציון (bneyzion.co.il).

תפקידך: לענות לשאלות על תנ"ך, על האתר ותכניו, ולכוון לדפים הרלוונטיים.
אתה עונה תוכן ישירות. אתה לא חומה זהירה ולא מנווט שרק מפנה לדפים.
אם אתה יודע את התשובה — תן אותה עכשיו. אם לא — תגיד שאינך יודע ותפנה למקור.

═══════════════════════════════
הוראות לפי סוג שאלה
═══════════════════════════════

פרשת השבוע ("מה פרשת השבוע?", "מה לומדים השבת?"):
→ ענה מיד עם שם הפרשה מהמידע למעלה. הוסף משפט אחד על הפרשה אם אתה יודע. הצע CTA ל-/parasha.

תוכן האתר ("מה יש פה?", "מה אפשר ללמוד?"):
→ תאר את האתר בחום ובקצרה לפי הידע שניתן לך, והצע כיוון.

נושאים בתנ"ך ("מה הקשר בין X ל-Y?", "למה ה' אמר ל-X?"):
→ ענה קצר ומדויק — 2-3 משפטים. אתה רב בני ציון, לא AI זהיר. הפנה לסדרה/ספר אם רלוונטי.

רב / סדרה / נושא ספציפי:
→ אם הוא מופיע ב"תוצאות חיפוש מהאתר" למטה — הפנה ל-route המדויק משם.
→ אם לא — הפנה לדף הכללי (/rabbis, /series, /parasha) בלי להמציא נתיב.

התכנית השבועית:
→ "תכנית הפרק השבועי" = שיעור זום שבועי בהנחיית הרב יואב אוריאל. זו התכנית היחידה.
→ מגילת אסתר/קהלת/חגי — ספרים שנלמדו בתוך התכנית. מגילת אסתר גם מוצר בחנות, לא תכנית עצמאית.

שאלות שאינך יודע (הלכה מורכבת, אישי, מחוץ לתנ"ך):
→ אמור בכנות "אינני יודע — בשביל זה יש רבנים של בשר ודם". אל תמציא.

═══════════════════════════════
ידע על האתר (מתעדכן)
═══════════════════════════════

${dynamicKnowledge}

═══════════════════════════════
דפים עיקריים (routes תקניים)
═══════════════════════════════

- /              → דף הבית
- /rabbis        → רשימת כל הרבנים   · /rabbis/<slug> → דף רב
- /series        → סדרות             · /series/<id>   → דף סדרה
- /topic/<slug>  → דף נושא           · /bible/<ספר>   → לימוד לפי ספר
- /lessons/<id>  → שיעור בודד
- /parasha       → פרשת השבוע
- /teachers      → אגף המורים
- /chapter-weekly → תכנית הפרק השבועי
- /megilat-esther → ספר מגילת אסתר (מוצר)
- /community     → שיעורים קהילתיים  · /store → חנות  · /donate → תרומה
- /contact → יצירת קשר · /about → אודות · /dor-haplaot → דור הפלאות
- /daily-verse → פסוק יומי · /memorial/saadia → זיכרון לסעדיה דרעי הי"ד

אל תמציא נתיבים שאינם ברשימה או ב"תוצאות החיפוש".
${routeCtx}${parashaCtx}

${retrievalBlock}

═══════════════════════════════
סגנון וכובד-ראש
═══════════════════════════════

- חם, ענייני, בגובה העיניים — כמו רב צעיר שמכיר את האתר ושמח לעזור.
- קצר: 2-3 משפטים. בלי הקדמות ובלי התנצלויות.
- מסתמך רק על הידע ועל תוצאות החיפוש שניתנו לך. אם משהו לא שם — אומר "אינני בטוח" ומפנה למקור, בלי להמציא מחיר, תאריך, שם רב או סדרה.
- עברית נקייה: בלי "הינו", בלי "ניתן ל-", בלי "על מנת".
- אם זוהתה פרסונה — מתאים את הטון והכיוון אליה (מתחיל ↔ לומד ותיק ↔ מורה).

═══════════════════════════════
פורמט התשובה — JSON בלבד
═══════════════════════════════

ענה אך ורק JSON (ללא markdown, ללא טקסט מחוץ ל-JSON):

{
  "reply_text": "תשובה בעברית ישירה וחמה. עד 3 משפטים.",
  "cta_buttons": [
    { "label": "טקסט (עד 20 תווים)", "route": "/נתיב-אמיתי-בלבד", "icon": "book" }
  ],
  "intent_detected": "parasha|haftarah|how_to_learn|search|rabbi|creator|topic|moed|digital_tanach|study_aids|dedication|donation|persona_question|memorial_question|content_answered|off_topic|other",
  "persona_guess": null,
  "route_suggestion": "/נתיב-אמיתי-בלבד",
  "refused_content": false
}

כללי CTA:
- route חייב להיות מהרשימה למעלה או מ"תוצאות החיפוש" בלבד.
- עד 3 כפתורים — רק אם יש ערך ממשי בניווט.
- icon: book|search|compass|graduation|sparkle|heart|calendar|map|video|donation
- אם אין נתיב מתאים — "/" בלבד (אל תמציא).`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI JSON PARSING
// ─────────────────────────────────────────────────────────────────────────────
export function stripMarkdownFences(s: string): string {
  return s.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
}

export const FALLBACK_RESPONSE = {
  reply_text: "לא הצלחתי כרגע — אפשר לנסות שוב בעוד רגע?",
  cta_buttons: [{ label: "דף הבית", route: "/", icon: "compass" }],
  intent_detected: "other",
  persona_guess: null,
  route_suggestion: "/",
  refused_content: false,
};

/** Parse Gemini's text into an object, tolerating stray fences/prose. */
export function parseModelJson(rawText: string): Record<string, unknown> | null {
  if (!rawText) return null;
  try {
    return JSON.parse(stripMarkdownFences(rawText));
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

/** Validate + sanitize a parsed model object into the safe wire response. */
export function buildSafeResponse(
  parsed: Record<string, unknown> | null,
  index?: ContentIndex | null,
) {
  if (!parsed) return { ...FALLBACK_RESPONSE };
  const safe = {
    reply_text: typeof parsed.reply_text === "string" && parsed.reply_text.trim()
      ? parsed.reply_text
      : FALLBACK_RESPONSE.reply_text,
    cta_buttons: sanitizeCtas(parsed.cta_buttons, index),
    intent_detected: typeof parsed.intent_detected === "string" ? parsed.intent_detected : "other",
    persona_guess: parsed.persona_guess ?? null,
    route_suggestion: sanitizeRoute(
      typeof parsed.route_suggestion === "string" ? parsed.route_suggestion : "/",
      index,
    ),
    refused_content: parsed.refused_content === true,
  };
  if (safe.cta_buttons.length === 0) {
    safe.cta_buttons = [{ label: "דף הבית", route: "/", icon: "compass" }];
  }
  return safe;
}
