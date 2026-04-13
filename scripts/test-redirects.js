#!/usr/bin/env node
/**
 * Redirect test script for bneyzion
 * Tests that all vercel.json redirects return 301 and land on the correct destination.
 *
 * Usage:
 *   node scripts/test-redirects.js                         # tests against bneyzion.vercel.app
 *   node scripts/test-redirects.js https://bneyzion.co.il  # tests against a custom base URL
 */

const BASE_URL = process.argv[2] || "https://bneyzion.vercel.app";

// Map of: old path (Hebrew, decoded) → expected destination path
const REDIRECT_TESTS = [
  // Main pages
  { from: "/אודותינו",           to: "/about" },
  { from: "/אודותינו/",          to: "/about" },
  { from: "/צור-קשר",            to: "/contact" },
  { from: "/צור-קשר/",           to: "/contact" },
  { from: "/תרומות",             to: "/donate" },
  { from: "/תרומות/",            to: "/donate" },
  { from: "/חנות-הספרים",        to: "/store" },
  { from: "/חנות-הספרים/",       to: "/store" },
  { from: "/חנות-הספרים/הוצאת-בני-ציון-מכלל-יופי",                              to: "/store" },
  { from: "/חנות-הספרים/הוצאת-בני-ציון-מכלל-יופי/מכלל-יופי-מגילת-אסתר",       to: "/store" },
  { from: "/חנות-הספרים/הוצאת-בני-ציון-מכלל-יופי/מכלל-יופי-מגילת-אסתר/",      to: "/store" },
  { from: "/חנות-הספרים/הוצאת-בני-ציון-מכלל-יופי/מכלל-יופי-מגילת-איכה/",      to: "/store" },
  { from: "/חנות-הספרים/הוצאת-בני-ציון-מכלל-יופי/מכלל-יופי-מגילת-קהלת/",      to: "/store" },
  { from: "/חנות-הספרים/הוצאת-בני-ציון-מכלל-יופי/מכלל-יופי-מגילת-רות/",       to: "/store" },
  { from: "/חנות-הספרים/הוצאת-בני-ציון-מכלל-יופי/מכלל-יופי-שיר-השירים/",      to: "/store" },
  { from: "/אגף-המורים",         to: "/teachers" },
  { from: "/אגף-המורים/",        to: "/teachers" },
  { from: "/בן-ציון-חיים-הנמן-היד", to: "/memorial" },
  { from: "/בן-ציון-חיים-הנמן-היד/", to: "/memorial" },
  { from: "/פרשת-השבוע",         to: "/parasha" },
  { from: "/פרשת-השבוע/",        to: "/parasha" },
  { from: "/רבנים",              to: "/rabbis" },
  { from: "/רבנים/",             to: "/rabbis" },
  { from: "/כנס",                to: "/kenes" },
  { from: "/כנס/",               to: "/kenes" },
  // New paths added
  { from: "/דרך-לימוד-התנך",     to: "/series" },
  { from: "/דרך-לימוד-התנך/",    to: "/series" },
  { from: "/מקורות-על-חשיבות-לימוד-תנך", to: "/series" },
  { from: "/מקורות-על-חשיבות-לימוד-תנך/", to: "/series" },
  // Series archive + sub-paths
  { from: "/מאגר-השיעורים-והמאמרים",         to: "/series" },
  { from: "/מאגר-השיעורים-והמאמרים/",        to: "/series" },
  { from: "/מאגר-השיעורים-והמאמרים/נושאים",    to: "/series" },
  { from: "/מאגר-השיעורים-והמאמרים/נושאים/",   to: "/series" },
  { from: "/מאגר-השיעורים-והמאמרים/הפטרות",    to: "/series" },
  { from: "/מאגר-השיעורים-והמאמרים/הפטרות/",   to: "/series" },
  { from: "/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך",  to: "/series" },
  { from: "/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/", to: "/series" },
  // Content categories → /series
  { from: "/תורה",     to: "/series" },
  { from: "/נביאים",   to: "/series" },
  { from: "/כתובים",   to: "/series" },
  { from: "/משנה",     to: "/series" },
  { from: "/גמרא",     to: "/series" },
  { from: "/הלכה",     to: "/series" },
  { from: "/מחשבה",    to: "/series" },
  { from: "/מועדים",   to: "/series" },
  { from: "/חגים",     to: "/series" },
  { from: "/מגילות",   to: "/series" },
  { from: "/מדרשים",   to: "/series" },
  { from: "/שיעורים",  to: "/series" },
  { from: "/מאמרים",   to: "/series" },
  { from: "/אמונה-ומוסר", to: "/series" },
];

let passed = 0;
let failed = 0;
const failures = [];

async function testRedirect({ from, to }) {
  const encodedFrom = encodeURI(from);
  const url = `${BASE_URL}${encodedFrom}`;

  try {
    const res = await fetch(url, { redirect: "manual" });
    const status = res.status;
    const location = res.headers.get("location") || "";

    const isRedirect = status === 301 || status === 308;
    const locationPath = location.startsWith("http") ? new URL(location).pathname : location;
    const destinationMatch = locationPath === to || locationPath === `${to}/`;

    if (isRedirect && destinationMatch) {
      console.log(`  ✓  ${from}  →  ${to}`);
      passed++;
    } else {
      const msg = isRedirect
        ? `wrong destination: got "${locationPath}", expected "${to}"`
        : `expected 301/308, got ${status}`;
      console.log(`  ✗  ${from}  [${msg}]`);
      failures.push({ from, to, status, location });
      failed++;
    }
  } catch (err) {
    console.log(`  ✗  ${from}  [network error: ${err.message}]`);
    failures.push({ from, to, error: err.message });
    failed++;
  }
}

async function main() {
  console.log(`\nTesting redirects against: ${BASE_URL}`);
  console.log("─".repeat(60));

  for (const test of REDIRECT_TESTS) {
    await testRedirect(test);
  }

  console.log("─".repeat(60));
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

  if (failures.length > 0) {
    console.log("Failures:");
    failures.forEach(f => console.log(`  ${f.from} → ${f.to}  (${f.error || `${f.status} ${f.location}`})`));
    process.exit(1);
  }
}

main();
