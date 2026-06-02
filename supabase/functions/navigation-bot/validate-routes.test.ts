/**
 * Unit tests for the navigation-bot route validation logic.
 * Run with: deno test --allow-env supabase/functions/navigation-bot/validate-routes.test.ts
 *
 * These tests do NOT call Gemini or Supabase — they test the whitelist logic only.
 * Created: 2026-06-02, branch fix/benzi-valid-links
 */

import {
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

// ─── Copy the validation functions from index.ts (DRY for testing) ──────────

const STATIC_ROUTES = new Set([
  "/",
  "/teachers",
  "/chapter-weekly",
  "/megilat-esther",
  "/proposal",
  "/thank-you",
  "/portal",
  "/courses",
  "/portal-old",
  "/roadmap",
  "/auth",
  "/portal-login",
  "/design-my-courses",
  "/rabbis",
  "/parasha",
  "/profile",
  "/favorites",
  "/history",
  "/memorial",
  "/memorial/saadia",
  "/contact",
  "/donate",
  "/checkout",
  "/kenes",
  "/kenes-2026-05",
  "/kenes-archive",
  "/dor-haplaot",
  "/daily-verse",
  "/daily-video",
  "/community",
  "/store",
  "/about",
  "/terms",
  "/privacy-policy",
]);

const PREFIX_ROUTES = [
  "/lessons/",
  "/rabbis/",
  "/teachers/series/",
  "/teachers/lesson/",
  "/bible/",
  "/series/",
  "/store/",
  "/community/",
  "/course/",
];

function isValidRoute(route: string): boolean {
  if (!route || typeof route !== "string") return false;
  const clean = route.split("?")[0].split("#")[0];
  if (STATIC_ROUTES.has(clean)) return true;
  for (const prefix of PREFIX_ROUTES) {
    if (clean.startsWith(prefix) && clean.length > prefix.length) return true;
  }
  return false;
}

function sanitizeRoute(route: string): string {
  return isValidRoute(route) ? route : "/";
}

function sanitizeCtas(
  ctas: Array<{ label: string; route: string; icon?: string }>
): Array<{ label: string; route: string; icon?: string }> {
  if (!Array.isArray(ctas)) return [];
  return ctas
    .filter((c) => c && typeof c.label === "string" && c.label.trim())
    .map((c) => ({ ...c, route: sanitizeRoute(c.route) }))
    .filter((c) => c.route !== "/")
    .slice(0, 3);
}

// ─── TESTS: isValidRoute ─────────────────────────────────────────────────────

Deno.test("isValidRoute — static routes accepted", () => {
  const validStatic = [
    "/",
    "/rabbis",
    "/parasha",
    "/teachers",
    "/chapter-weekly",
    "/megilat-esther",
    "/portal",
    "/donate",
    "/contact",
    "/store",
    "/about",
    "/terms",
    "/daily-verse",
    "/memorial/saadia",
    "/kenes-2026-05",
  ];
  for (const r of validStatic) {
    assertEquals(isValidRoute(r), true, `Expected valid: ${r}`);
  }
});

Deno.test("isValidRoute — prefix routes accepted", () => {
  const validPrefixed = [
    "/rabbis/yoav-uriel",
    "/rabbis/reuven-sasson",
    "/lessons/abc-123",
    "/series/some-uuid-here",
    "/bible/bereshit",
    "/bible/tehilim",
    "/store/sefer-yehoshua",
    "/teachers/series/abc",
    "/teachers/lesson/xyz",
    "/community/456",
    "/course/weekly-chapter",
  ];
  for (const r of validPrefixed) {
    assertEquals(isValidRoute(r), true, `Expected valid: ${r}`);
  }
});

Deno.test("isValidRoute — invented/removed routes rejected", () => {
  const invalidRoutes = [
    "/how-to-learn-tanach",
    "/study-aids",
    "/pricing",
    "/bible-book/esther",
    "/bible-book/bereshit",
    "/series",          // was removed 27.5.2026
    "",
    "/admin",
    "/design-courses",
    "/design-portal",
    "/rabbis/",         // prefix with no slug
    "/lessons/",        // prefix with no id
  ];
  for (const r of invalidRoutes) {
    assertFalse(isValidRoute(r), `Expected invalid: ${r}`);
  }
});

Deno.test("isValidRoute — query strings and hashes stripped", () => {
  assertEquals(isValidRoute("/rabbis/yoav-uriel?tab=series"), true);
  assertEquals(isValidRoute("/parasha#intro"), true);
  assertEquals(isValidRoute("/how-to-learn-tanach?ref=bot"), false);
});

// ─── TESTS: sanitizeRoute ────────────────────────────────────────────────────

Deno.test("sanitizeRoute — valid route passes through", () => {
  assertEquals(sanitizeRoute("/parasha"), "/parasha");
  assertEquals(sanitizeRoute("/rabbis/yoav-uriel"), "/rabbis/yoav-uriel");
  assertEquals(sanitizeRoute("/"), "/");
});

Deno.test("sanitizeRoute — invalid route becomes /", () => {
  assertEquals(sanitizeRoute("/how-to-learn-tanach"), "/");
  assertEquals(sanitizeRoute("/pricing"), "/");
  assertEquals(sanitizeRoute("/study-aids"), "/");
  assertEquals(sanitizeRoute("/bible-book/esther"), "/");
  assertEquals(sanitizeRoute(""), "/");
});

// ─── TESTS: sanitizeCtas ────────────────────────────────────────────────────

Deno.test("sanitizeCtas — valid CTAs pass through", () => {
  const ctas = [
    { label: "לפרשת השבוע", route: "/parasha", icon: "book" },
    { label: "לרבנים", route: "/rabbis", icon: "compass" },
  ];
  const result = sanitizeCtas(ctas);
  assertEquals(result.length, 2);
  assertEquals(result[0].route, "/parasha");
  assertEquals(result[1].route, "/rabbis");
});

Deno.test("sanitizeCtas — invalid route CTAs are dropped (not replaced)", () => {
  const ctas = [
    { label: "כלים", route: "/study-aids", icon: "sparkle" },
    { label: "מחירים", route: "/pricing", icon: "sparkle" },
    { label: "פרשה", route: "/parasha", icon: "book" },
  ];
  const result = sanitizeCtas(ctas);
  assertEquals(result.length, 1, "Only 1 valid CTA should remain");
  assertEquals(result[0].route, "/parasha");
});

Deno.test("sanitizeCtas — max 3 buttons enforced", () => {
  const ctas = [
    { label: "א", route: "/parasha" },
    { label: "ב", route: "/rabbis" },
    { label: "ג", route: "/donate" },
    { label: "ד", route: "/contact" },
    { label: "ה", route: "/about" },
  ];
  const result = sanitizeCtas(ctas);
  assertEquals(result.length, 3);
});

Deno.test("sanitizeCtas — empty array returns empty", () => {
  assertEquals(sanitizeCtas([]).length, 0);
});

Deno.test("sanitizeCtas — non-array returns empty", () => {
  // deno-lint-ignore no-explicit-any
  assertEquals(sanitizeCtas(null as any), []);
});

Deno.test("sanitizeCtas — all invalid CTAs returns empty", () => {
  const ctas = [
    { label: "מחירים", route: "/pricing" },
    { label: "כלים", route: "/study-aids" },
  ];
  assertEquals(sanitizeCtas(ctas).length, 0);
});

// ─── TESTS: known-bad routes from live bot audit (2026-06-02) ───────────────

Deno.test("Known-bad routes from live audit are rejected", () => {
  const knownBad = [
    "/how-to-learn-tanach",  // Test 2 — "איך ללמוד תנ\"ך"
    "/study-aids",            // Test 2, Test 4
    "/pricing",               // Test 3 — "כמה עולה המנוי"
    "/bible-book/esther",     // Test 9 — "מגילת אסתר"
  ];
  for (const r of knownBad) {
    assertFalse(isValidRoute(r), `Route from live audit should be invalid: ${r}`);
  }
});

Deno.test("Known-good routes from live audit are accepted", () => {
  const knownGood = [
    "/parasha",          // Test 1
    "/rabbis/yoav-uriel", // Test 6
    "/store",            // Test 7
    "/portal",           // Test 8
    "/donate",           // Test 5
    "/contact",          // should be suggested for contact queries
    "/teachers",         // Test 4
    "/chapter-weekly",   // subscription program page
    "/megilat-esther",   // product page
    "/community",        // Test 12
  ];
  for (const r of knownGood) {
    assertEquals(isValidRoute(r), true, `Route should be valid: ${r}`);
  }
});
