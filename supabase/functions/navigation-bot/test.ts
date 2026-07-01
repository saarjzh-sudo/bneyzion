/**
 * Local verification harness for navigation-bot.
 * Run:
 *   GEMINI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   deno run --allow-net --allow-env supabase/functions/navigation-bot/test.ts
 *
 * Part A: pure-logic unit assertions (offline).
 * Part B: live index + real searches + real Gemini round-trips (network).
 */

import {
  buildContentIndex,
  buildSafeResponse,
  buildSystemPrompt,
  type ContentIndex,
  formatRetrieval,
  isValidRoute,
  normalizeHe,
  parseModelJson,
  sanitizeSuggestions,
  searchIndex,
  tokenize,
} from "./shared.ts";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

// ── Part A — pure logic ──────────────────────────────────────────────────────
console.log("\n— A. pure logic —");
// final letters are normalized to base form (ף→פ, ם→מ) so search is robust
ok(normalizeHe('הָרַב יוֹסֵף קַלְנֶר') === "הרב יוספ קלנר", "normalize strips niqqud + folds finals");
ok(normalizeHe("שלום") === normalizeHe("שָׁלוֹם"), "niqqud-insensitive equality");
ok(tokenize("של הרב קלנר").includes("קלנר"), "tokenize keeps content word");
ok(tokenize("הרב").includes("רב"), "tokenize yields prefix-stripped alt form");

const demo: ContentIndex = buildContentIndex(
  [{ name: "הרב יוסף קלנר", slug: "yvsp-klnr", lesson_count: 32 },
   { name: "הרב יואב אוריאל", slug: "yvav-vryal", lesson_count: 500 }],
  [{ id: "abc-123", title: "מגילת אסתר", bible_book: "אסתר", lesson_count: 12 }],
  [{ name: "דוד המלך", slug: "theme-דוד-המלך" }, { name: "נושאים", slug: "themes-root" }],
);
ok(searchIndex(demo, "שיעורים של הרב קלנר")[0]?.route === "/rabbis/yvsp-klnr", "search finds rabbi by last name");
ok(searchIndex(demo, "מגילת אסתר")[0]?.route === "/series/abc-123", "search finds series");
ok(searchIndex(demo, "דוד המלך")[0]?.route === "/topic/theme-דוד-המלך", "search finds topic");
ok(!demo.topicSlugs.has("themes-root"), "themes-root excluded from index");

ok(isValidRoute("/rabbis/yvsp-klnr", demo), "valid: real rabbi slug");
ok(!isValidRoute("/rabbis/yosef-kelner", demo), "INVALID: hallucinated rabbi slug rejected");
ok(isValidRoute("/series/abc-123", demo), "valid: real series id");
ok(!isValidRoute("/series/made-up-id", demo), "INVALID: hallucinated series id rejected");
ok(isValidRoute("/bible/בראשית", demo), "valid: real bible book");
ok(!isValidRoute("/bible/Genesis", demo), "INVALID: wrong bible book rejected");
ok(isValidRoute("/parasha", demo), "valid: static route");
ok(!isValidRoute("/design-my-courses", demo), "INVALID: sandbox route rejected");
ok(!isValidRoute("/pricing", demo), "INVALID: nonexistent route rejected");

const sanitized = buildSafeResponse({
  reply_text: "בדיקה",
  cta_buttons: [
    { label: "רב אמיתי", route: "/rabbis/yvsp-klnr" },
    { label: "רב מומצא", route: "/rabbis/ghost-rabbi" },
    { label: "מחיר", route: "/pricing" },
  ],
  route_suggestion: "/series/made-up-id",
}, demo);
ok(sanitized.cta_buttons.length === 1, "safeResponse drops hallucinated CTAs (keeps only real)");
ok(sanitized.route_suggestion === "/", "safeResponse neutralizes hallucinated route_suggestion");

// suggestions: trims, dedupes, drops junk, caps at 4
ok(sanitizeSuggestions(["כמה עולה?", "  כמה עולה?  ", "יש שיעור לפרשה?"]).length === 2, "suggestions dedupe (case/space-insensitive)");
ok(sanitizeSuggestions(["a", "", 5, null, "שאלה תקינה"]).join("|") === "שאלה תקינה", "suggestions drop too-short/non-string");
ok(sanitizeSuggestions(["ש1רה","ש2רה","ש3רה","ש4רה","ש5רה","ש6רה"]).length === 4, "suggestions capped at 4");
ok(sanitizeSuggestions("not an array") .length === 0, "suggestions non-array → empty");

// ── Part B — live ────────────────────────────────────────────────────────────
const GEMINI = Deno.env.get("GEMINI_API_KEY");
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (GEMINI && SB_URL && SB_KEY) {
  console.log("\n— B. live index —");
  const sel = async (path: string) => {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    return await r.json();
  };
  const [rabbis, series, topics] = await Promise.all([
    sel("rabbis?select=name,slug,lesson_count&status=eq.active&order=lesson_count.desc&limit=2000"),
    sel("series?select=id,title,bible_book,lesson_count&status=eq.active&audience_tags=cs.%7Bgeneral%7D&audience_tags=not.cs.%7Bteachers%7D&order=lesson_count.desc&limit=3000"),
    sel("topics?select=name,slug&order=name&limit=2000"),
  ]);
  const index = buildContentIndex(rabbis, series, topics);
  console.log(`  index: ${rabbis.length} rabbis, ${series.length} series, ${topics.length} topics`);
  ok(index.items.length > 1500, "live index built (>1500 items)");

  for (const q of ["הרב יוסף קלנר", "מגילת אסתר", "דוד וגלית", "שמואל"]) {
    const m = searchIndex(index, q, 3);
    console.log(`  search "${q}": ${m.map((x) => `${x.label} ${x.route}`).join(" | ") || "(none)"}`);
    ok(m.length > 0, `live search returns results for "${q}"`);
    ok(m.every((x) => isValidRoute(x.route, index)), `all routes for "${q}" are valid`);
  }

  console.log("\n— B. live Gemini (the query that crashed the old bot) —");
  const hardQ = "כמה עולה תכנית הפרק השבועי ומה לומדים עכשיו במגילת אסתר? יש שיעורים של הרב יוסף קלנר?";
  const matches = searchIndex(index, hardQ, 8);
  const sys = buildSystemPrompt(null, "שלח לך", "תכנית הפרק השבועי: 110 ₪/חודש בהנחיית הרב יואב אוריאל.", formatRetrieval(matches));
  const payload = {
    system_instruction: { parts: [{ text: sys }] },
    contents: [{ role: "user", parts: [{ text: hardQ }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 768 } },
  };
  const t0 = Date.now();
  const gr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const gd = await gr.json();
  const raw = gd?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const finish = gd?.candidates?.[0]?.finishReason;
  console.log(`  finishReason=${finish}  latency=${Date.now() - t0}ms  rawLen=${raw.length}`);
  const parsed = parseModelJson(raw);
  ok(finish === "STOP", "gemini finished cleanly (no MAX_TOKENS truncation)");
  ok(parsed !== null, "model output parses as JSON (the old crash is gone)");
  const safe = buildSafeResponse(parsed, index);
  console.log("  reply:", safe.reply_text);
  console.log("  ctas:", JSON.stringify(safe.cta_buttons));
  ok(safe.reply_text !== "לא הצלחתי כרגע — אפשר לנסות שוב בעוד רגע?", "got a real answer, not the fallback");
  ok(safe.cta_buttons.every((c) => isValidRoute(c.route, index)), "every returned CTA route is real");
} else {
  console.log("\n— B skipped (set GEMINI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) —");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail > 0) Deno.exit(1);
