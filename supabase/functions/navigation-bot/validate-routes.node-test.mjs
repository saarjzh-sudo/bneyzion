/**
 * Node.js port of validate-routes tests (no deno.land imports).
 * Run with: node supabase/functions/navigation-bot/validate-routes.node-test.mjs
 * Created: 2026-06-02, branch fix/benzi-valid-links
 */

// ─── Copy validation logic from index.ts ────────────────────────────────────

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

function isValidRoute(route) {
  if (!route || typeof route !== "string") return false;
  const clean = route.split("?")[0].split("#")[0];
  if (STATIC_ROUTES.has(clean)) return true;
  for (const prefix of PREFIX_ROUTES) {
    if (clean.startsWith(prefix) && clean.length > prefix.length) return true;
  }
  return false;
}

function sanitizeRoute(route) {
  return isValidRoute(route) ? route : "/";
}

function sanitizeCtas(ctas) {
  if (!Array.isArray(ctas)) return [];
  return ctas
    .filter((c) => c && typeof c.label === "string" && c.label.trim())
    .map((c) => ({ ...c, route: sanitizeRoute(c.route) }))
    .filter((c) => c.route !== "/")
    .slice(0, 3);
}

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    process.stdout.write(`  PASS: ${name}\n`);
    passed++;
  } catch (e) {
    process.stdout.write(`  FAIL: ${name}\n    ${e.message}\n`);
    failures.push(name + ": " + e.message);
    failed++;
  }
}

function assertEquals(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertFalse(a, msg) {
  if (a !== false) throw new Error(msg || `Expected false, got ${JSON.stringify(a)}`);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log("\n=== navigation-bot route validation tests (Node.js) ===\n");

// isValidRoute — static routes
test("isValidRoute — static routes accepted", () => {
  const validStatic = [
    "/", "/rabbis", "/parasha", "/teachers", "/chapter-weekly",
    "/megilat-esther", "/portal", "/donate", "/contact", "/store",
    "/about", "/terms", "/daily-verse", "/memorial/saadia", "/kenes-2026-05",
  ];
  for (const r of validStatic) {
    assertEquals(isValidRoute(r), true, `Expected valid: ${r}`);
  }
});

test("isValidRoute — prefix routes accepted", () => {
  const validPrefixed = [
    "/rabbis/yoav-uriel", "/rabbis/reuven-sasson", "/lessons/abc-123",
    "/series/some-uuid-here", "/bible/bereshit", "/bible/tehilim",
    "/store/sefer-yehoshua", "/teachers/series/abc", "/teachers/lesson/xyz",
    "/community/456", "/course/weekly-chapter",
  ];
  for (const r of validPrefixed) {
    assertEquals(isValidRoute(r), true, `Expected valid: ${r}`);
  }
});

test("isValidRoute — invented/removed routes rejected", () => {
  const invalidRoutes = [
    "/how-to-learn-tanach", "/study-aids", "/pricing",
    "/bible-book/esther", "/bible-book/bereshit",
    "/series",  // removed 27.5.2026
    "",
    "/admin",
    "/design-courses",
    "/design-portal",
    "/rabbis/",    // prefix with no slug
    "/lessons/",  // prefix with no id
  ];
  for (const r of invalidRoutes) {
    assertFalse(isValidRoute(r), `Expected invalid: ${r}`);
  }
});

test("isValidRoute — query strings and hashes stripped", () => {
  assertEquals(isValidRoute("/rabbis/yoav-uriel?tab=series"), true);
  assertEquals(isValidRoute("/parasha#intro"), true);
  assertEquals(isValidRoute("/how-to-learn-tanach?ref=bot"), false);
});

test("sanitizeRoute — valid routes pass through", () => {
  assertEquals(sanitizeRoute("/parasha"), "/parasha");
  assertEquals(sanitizeRoute("/rabbis/yoav-uriel"), "/rabbis/yoav-uriel");
  assertEquals(sanitizeRoute("/"), "/");
});

test("sanitizeRoute — invalid routes become /", () => {
  assertEquals(sanitizeRoute("/how-to-learn-tanach"), "/");
  assertEquals(sanitizeRoute("/pricing"), "/");
  assertEquals(sanitizeRoute("/study-aids"), "/");
  assertEquals(sanitizeRoute("/bible-book/esther"), "/");
  assertEquals(sanitizeRoute(""), "/");
});

test("sanitizeCtas — valid CTAs pass through", () => {
  const ctas = [
    { label: "לפרשת השבוע", route: "/parasha", icon: "book" },
    { label: "לרבנים", route: "/rabbis", icon: "compass" },
  ];
  const result = sanitizeCtas(ctas);
  assertEquals(result.length, 2);
  assertEquals(result[0].route, "/parasha");
  assertEquals(result[1].route, "/rabbis");
});

test("sanitizeCtas — invalid route CTAs are dropped", () => {
  const ctas = [
    { label: "כלים", route: "/study-aids", icon: "sparkle" },
    { label: "מחירים", route: "/pricing", icon: "sparkle" },
    { label: "פרשה", route: "/parasha", icon: "book" },
  ];
  const result = sanitizeCtas(ctas);
  assertEquals(result.length, 1, "Only 1 valid CTA should remain");
  assertEquals(result[0].route, "/parasha");
});

test("sanitizeCtas — max 3 buttons enforced", () => {
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

test("sanitizeCtas — empty array returns empty", () => {
  assertEquals(sanitizeCtas([]).length, 0);
});

test("sanitizeCtas — non-array returns empty", () => {
  assertEquals(sanitizeCtas(null).length, 0);
});

test("sanitizeCtas — all invalid CTAs returns empty", () => {
  const ctas = [
    { label: "מחירים", route: "/pricing" },
    { label: "כלים", route: "/study-aids" },
  ];
  assertEquals(sanitizeCtas(ctas).length, 0);
});

test("Known-bad routes from live audit (2026-06-02) are rejected", () => {
  const knownBad = [
    "/how-to-learn-tanach",  // T02 — "איך ללמוד תנ\"ך"
    "/study-aids",            // T02, T04
    "/pricing",               // T03 — "כמה עולה המנוי"
    "/bible-book/esther",     // T09 — "מגילת אסתר"
  ];
  for (const r of knownBad) {
    assertFalse(isValidRoute(r), `Should be invalid: ${r}`);
  }
});

test("Known-good routes from live audit are accepted", () => {
  const knownGood = [
    "/parasha", "/rabbis/yoav-uriel", "/store", "/portal", "/donate",
    "/contact", "/teachers", "/chapter-weekly", "/megilat-esther", "/community",
  ];
  for (const r of knownGood) {
    assertEquals(isValidRoute(r), true, `Should be valid: ${r}`);
  }
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} PASS / ${failed} FAIL ===`);
if (failures.length > 0) {
  console.log("Failures:");
  for (const f of failures) console.log("  -", f);
}

process.exit(failed > 0 ? 1 : 0);
