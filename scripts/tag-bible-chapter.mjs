/**
 * tag-bible-chapter.mjs
 *
 * חילוץ bible_chapter מכותרות שיעורים (ו/או סדרות)
 * פטרן: "פרק X" כשX הוא מספר עברי (גמטריה) או ערבי
 *
 * הפעלה (dry-run):
 *   node scripts/tag-bible-chapter.mjs
 *
 * הפעלה (write לDB):
 *   node scripts/tag-bible-chapter.mjs --write
 */

// ============================================================
// Hebrew numeral → integer
// ============================================================
const GEMATRIA = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5,
  ו: 6, ז: 7, ח: 8, ט: 9, י: 10,
  יא: 11, יב: 12, יג: 13, יד: 14, טו: 15, טז: 16,
  יז: 17, יח: 18, יט: 19, כ: 20,
  כא: 21, כב: 22, כג: 23, כד: 24, כה: 25,
  כו: 26, כז: 27, כח: 28, כט: 29, ל: 30,
  לא: 31, לב: 32, לג: 33, לד: 34, לה: 35,
  לו: 36, לז: 37, לח: 38, לט: 39, מ: 40,
  מא: 41, מב: 42, מג: 43, מד: 44, מה: 45,
  מו: 46, מז: 47, מח: 48, מט: 49, נ: 50,
  נא: 51, נב: 52, נג: 53, נד: 54, נה: 55,
  נו: 56, נז: 57, נח: 58, נט: 59, ס: 60,
  סא: 61, סב: 62, סג: 63, סד: 64, סה: 65,
  סו: 66, סז: 67, סח: 68, סט: 69, ע: 70,
  עא: 71, עב: 72, עג: 73, עד: 74, עה: 75,
  עו: 76, עז: 77, עח: 78, עט: 79, פ: 80,
  פא: 81, פב: 82, פג: 83, פד: 84, פה: 85,
  פו: 86, פז: 87, פח: 88, פט: 89, צ: 90,
  צא: 91, צב: 92, צג: 93, צד: 94, צה: 95,
  צו: 96, צז: 97, צח: 98, צט: 99, ק: 100,
  קא: 101, קב: 102, קג: 103, קד: 104, קה: 105,
  קו: 106, קז: 107, קח: 108, קט: 109, קי: 110,
  קיא: 111, קיב: 112, קיג: 113, קיד: 114, קטו: 115,
  קטז: 116, קיז: 117, קיח: 118, קיט: 119, קכ: 120,
  קכא: 121, קכב: 122, קכג: 123, קכד: 124, קכה: 125,
  קכו: 126, קכז: 127, קכח: 128, קכט: 129, קל: 130,
  קלא: 131, קלב: 132, קלג: 133, קלד: 134, קלה: 135,
  קלו: 136, קלז: 137, קלח: 138, קלט: 139, קמ: 140,
  קמא: 141, קמב: 142, קמג: 143, קמד: 144, קמה: 145,
  קמו: 146, קמז: 147, קמח: 148, קמט: 149, קן: 150,
};

// Sort by string length descending so we match "קכא" before "א"
const SORTED_KEYS = Object.keys(GEMATRIA).sort((a, b) => b.length - a.length);

/**
 * Convert a Hebrew numeral string to integer.
 * Strips geresh/gershayim (׳/״) and quotes before matching.
 * Returns null if not a valid number.
 */
function hebrewToInt(raw) {
  if (!raw) return null;
  // Strip quotes, geresh, gershayim, and common punctuation
  const s = raw.replace(/[״׳'"]/g, "").trim();
  // Try Arabic number first
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  // Try Hebrew
  if (GEMATRIA[s] !== undefined) return GEMATRIA[s];
  // Multi-part: e.g. "קכ" = 120 — already in table; but try decomposing if not found
  // Simple decomposition for values not in table: hundreds + tens + units
  // We handle up to ~150 which covers all biblical chapters
  return null;
}

/**
 * Extract the FIRST chapter number from a title string.
 * Returns integer or null.
 *
 * Patterns tried (in order):
 * 1. Arabic digit after פרק: "פרק 12", "פרק (12)"
 * 2. Hebrew numeral after פרק: "פרק יב", "פרק י\"ב" (with gershayim)
 * 3. Range: "פרקים א-ב" → first chapter
 * 4. "מזמור X" → chapter X (תהלים)
 */
function extractChapter(title) {
  if (!title) return null;
  const t = title.trim();

  // Pattern 1: "פרק" followed by arabic digits (possibly in parens)
  const arabicMatch = t.match(/פרק[ים]*\s*\(?(\d+)/);
  if (arabicMatch) {
    const n = parseInt(arabicMatch[1], 10);
    if (n > 0 && n < 200) return n;
  }

  // Pattern 2: "פרק" or "פרקים" followed by Hebrew numeral
  // Capture everything after פרק until a non-Hebrew char
  const hebrewAfterPerek = t.match(/פרק[ים]*\s+([א-ת״׳'"-]+)/);
  if (hebrewAfterPerek) {
    const candidate = hebrewAfterPerek[1];
    // Strip geresh/gershayim and try
    const stripped = candidate.replace(/[״׳'"]/g, "").trim();
    // Handle range: "א-ב", "לח-לט"
    const rangeParts = stripped.split(/[-–]/);
    const n = hebrewToInt(rangeParts[0].trim());
    if (n && n > 0 && n < 200) return n;
  }

  // Pattern 3: "מזמור X" — תהלים chapter
  const mizmor = t.match(/מזמור\s+([א-ת״׳'"\d]+)/);
  if (mizmor) {
    const stripped = mizmor[1].replace(/[״׳'"]/g, "").trim();
    if (/^\d+$/.test(stripped)) {
      const n = parseInt(stripped, 10);
      if (n > 0 && n < 200) return n;
    }
    const n = hebrewToInt(stripped);
    if (n && n > 0 && n < 200) return n;
  }

  return null;
}

// ============================================================
// Main — Fetch lessons, compute, update
// ============================================================
const SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
// Read from env — never hardcode tokens in source
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_MGMT_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
if (!SUPABASE_ACCESS_TOKEN) {
  console.error("ERROR: set SUPABASE_MGMT_TOKEN env var before running.");
  process.exit(1);
}

const DRY_RUN = !process.argv.includes("--write");

async function queryDB(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const json = await res.json();
  if (json.message && json.message.includes("ERROR")) {
    throw new Error(`SQL error: ${json.message}`);
  }
  return json;
}

(async () => {
  console.log("=== Bible Chapter Tagger ===");
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "WRITE"}`);

  // Fetch all lessons without bible_chapter (that have titles)
  console.log("\nFetching lessons without bible_chapter...");
  const rows = await queryDB(`
    SELECT id, title, bible_book
    FROM lessons
    WHERE bible_chapter IS NULL AND title IS NOT NULL
    ORDER BY id
    LIMIT 20000
  `);

  console.log(`Fetched ${rows.length} lessons to process`);

  const updates = [];
  let skipped = 0;

  for (const row of rows) {
    const chapter = extractChapter(row.title);
    if (chapter !== null) {
      updates.push({ id: row.id, bible_chapter: chapter, title: row.title, bible_book: row.bible_book });
    } else {
      skipped++;
    }
  }

  const pct = ((updates.length / rows.length) * 100).toFixed(1);
  console.log(`\nResults:`);
  console.log(`  Total processed: ${rows.length}`);
  console.log(`  Will update:     ${updates.length} (${pct}%)`);
  console.log(`  No match:        ${skipped}`);

  // Sample matches
  console.log("\n--- Sample matches (first 30) ---");
  for (const u of updates.slice(0, 30)) {
    console.log(`  ch.${u.bible_chapter} [${u.bible_book || "?"}] ${u.title}`);
  }

  // Sample non-matches with "פרק" in title
  const missedWithPerek = rows
    .filter((r) => !updates.find((u) => u.id === r.id) && r.title.includes("פרק"))
    .slice(0, 15);
  if (missedWithPerek.length > 0) {
    console.log("\n--- Missed despite having פרק (first 15) ---");
    for (const r of missedWithPerek) {
      console.log(`  [${r.bible_book || "?"}] ${r.title}`);
    }
  }

  if (DRY_RUN) {
    console.log("\nDry-run complete. Run with --write to apply.");
    process.exit(0);
  }

  // Write mode — batch UPDATE via Management API SQL
  console.log(`\nWriting ${updates.length} updates in batches of 500...`);
  const BATCH_SIZE = 500;
  let totalUpdated = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    // Build a VALUES list for a single UPDATE ... FROM (VALUES ...) AS v(id, chapter)
    const valuesClause = batch
      .map((u) => `('${u.id}'::uuid, ${u.bible_chapter})`)
      .join(",\n  ");

    const sql = `
      UPDATE lessons AS l
      SET bible_chapter = v.chapter
      FROM (VALUES
        ${valuesClause}
      ) AS v(id, chapter)
      WHERE l.id = v.id AND l.bible_chapter IS NULL
    `;

    await queryDB(sql);
    totalUpdated += batch.length;
    process.stdout.write(`  ${totalUpdated} / ${updates.length}\r`);
  }

  console.log(`\n✓ Updated ${totalUpdated} lessons with bible_chapter`);

  // Verify
  const after = await queryDB(
    "SELECT COUNT(*) as with_chapter FROM lessons WHERE bible_chapter IS NOT NULL"
  );
  console.log(`\nDB now has ${after[0]?.with_chapter} lessons with bible_chapter`);
})();
