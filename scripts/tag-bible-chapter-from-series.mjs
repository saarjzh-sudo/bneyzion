/**
 * tag-bible-chapter-from-series.mjs
 *
 * שלב 3 בתיוג bible_chapter:
 * לשיעורים שעדיין אין להם bible_chapter — לחלץ פרק מ-series.title
 *
 * מחשב bible_chapter לכל שיעור שיש לו series עם פרק בכותרת.
 * לא כותב bible_chapter שכבר קיים ב-lesson.
 * לא נוגע ב-audio_url / video_url / attachment_url / additional_attachments.
 *
 * הפעלה (dry-run):
 *   node scripts/tag-bible-chapter-from-series.mjs
 *
 * הפעלה (write לDB):
 *   node scripts/tag-bible-chapter-from-series.mjs --write
 */

// ============================================================
// Hebrew numeral → integer (same as tag-bible-chapter.mjs)
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

function hebrewToInt(raw) {
  if (!raw) return null;
  const s = raw.replace(/[״׳'"]/g, "").trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (GEMATRIA[s] !== undefined) return GEMATRIA[s];
  return null;
}

/**
 * Extract the FIRST chapter number from a title string.
 * Returns integer or null.
 *
 * Patterns (in order):
 * 1. Arabic digit after פרק: "פרק 12", "פרק (12)"
 * 2. Hebrew numeral after פרק (with optional geresh/gershayim): "פרק י\"ח", "פרק ד'"
 * 3. Range "פרקים א-ב" → first chapter
 * 4. "מזמור X" → chapter X
 * 5. "איכה פרק X" (book then chapter in title)
 */
function extractChapterFromSeriesTitle(title) {
  if (!title) return null;
  const t = title.trim();

  // Pattern 1: Arabic digit after פרק
  const arabicMatch = t.match(/פרק[ים]*\s*\(?(\d+)/);
  if (arabicMatch) {
    const n = parseInt(arabicMatch[1], 10);
    if (n > 0 && n < 200) return n;
  }

  // Pattern 2+3: Hebrew numeral after פרק (handles geresh, gershayim, ranges)
  // "פרק ד'", "פרק כ\"ב", "פרקים י-יב", "פרקים ו'-ז'"
  const hebrewAfterPerek = t.match(/פרק[ים]*\s+([א-ת0-9״׳'"-]+)/);
  if (hebrewAfterPerek) {
    const candidate = hebrewAfterPerek[1];
    const stripped = candidate.replace(/[״׳'"]/g, "").trim();
    // Handle range — take the FIRST chapter
    const rangeParts = stripped.split(/[-–]/);
    const n = hebrewToInt(rangeParts[0].trim());
    if (n && n > 0 && n < 200) return n;
  }

  // Pattern 4: "מזמור X"
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
// Config + Management API helper
// ============================================================
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_MGMT_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
if (!SUPABASE_ACCESS_TOKEN) {
  console.error("ERROR: set SUPABASE_MGMT_TOKEN env var before running.");
  process.exit(1);
}

const DRY_RUN = !process.argv.includes("--write");

async function queryDB(sql) {
  const res = await fetch(
    "https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query",
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

// ============================================================
// Main
// ============================================================
(async () => {
  console.log("=== Bible Chapter Tagger — via series.title ===");
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "WRITE"}`);

  // 1. Fetch all series that have a title (to extract chapter from)
  console.log("\nFetching series with potential chapter in title...");
  const seriesRows = await queryDB(`
    SELECT id, title
    FROM series
    WHERE title IS NOT NULL
    ORDER BY id
    LIMIT 5000
  `);
  console.log(`Fetched ${seriesRows.length} series`);

  // 2. Build a map: series_id → extracted chapter
  const seriesChapterMap = new Map();
  for (const s of seriesRows) {
    const ch = extractChapterFromSeriesTitle(s.title);
    if (ch !== null) {
      seriesChapterMap.set(s.id, ch);
    }
  }
  console.log(`Series with extractable chapter: ${seriesChapterMap.size}`);

  // 3. Fetch lessons WITHOUT bible_chapter that have a series_id in our map
  // We fetch in pages because there can be many
  const seriesIds = [...seriesChapterMap.keys()];
  console.log(`\nFetching lessons without bible_chapter in these series...`);

  // Build a comma-separated list for SQL IN clause
  const idsStr = seriesIds.map(id => `'${id}'`).join(",");
  const lessonsRows = await queryDB(`
    SELECT id, series_id, title
    FROM lessons
    WHERE bible_chapter IS NULL
      AND series_id IN (${idsStr})
    ORDER BY id
    LIMIT 20000
  `);
  console.log(`Fetched ${lessonsRows.length} lessons to process`);

  // 4. Match lesson → chapter from its series
  const updates = [];
  for (const lesson of lessonsRows) {
    const ch = seriesChapterMap.get(lesson.series_id);
    if (ch) {
      updates.push({ id: lesson.id, bible_chapter: ch, title: lesson.title, series_id: lesson.series_id });
    }
  }

  const pct = lessonsRows.length > 0
    ? ((updates.length / lessonsRows.length) * 100).toFixed(1)
    : "0";
  console.log(`\nResults:`);
  console.log(`  Total processed: ${lessonsRows.length}`);
  console.log(`  Will update:     ${updates.length} (${pct}%)`);
  console.log(`  No chapter found: ${lessonsRows.length - updates.length}`);

  // 5. Sample output
  console.log("\n--- Sample matches (first 25) ---");
  for (const u of updates.slice(0, 25)) {
    // Find series title for display
    const s = seriesRows.find(r => r.id === u.series_id);
    console.log(`  ch.${u.bible_chapter} ← series: "${s?.title}" → lesson: "${u.title.slice(0, 50)}"`);
  }

  if (DRY_RUN) {
    console.log("\nDry-run complete. Run with --write to apply.");

    // Estimate new total coverage
    const current = await queryDB(
      "SELECT COUNT(*) as with_chapter FROM lessons WHERE bible_chapter IS NOT NULL"
    );
    const currentCount = parseInt(current[0]?.with_chapter || 0);
    const totalLessons = await queryDB("SELECT COUNT(*) as total FROM lessons");
    const total = parseInt(totalLessons[0]?.total || 1);
    const newEstimate = currentCount + updates.length;
    console.log(
      `\nCurrent: ${currentCount}/${total} (${((currentCount / total) * 100).toFixed(1)}%)`
    );
    console.log(
      `After write: ~${newEstimate}/${total} (${((newEstimate / total) * 100).toFixed(1)}%)`
    );
    process.exit(0);
  }

  // 6. Write mode — batch UPDATE
  console.log(`\nWriting ${updates.length} updates in batches of 500...`);
  const BATCH_SIZE = 500;
  let totalUpdated = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const valuesClause = batch
      .map(u => `('${u.id}'::uuid, ${u.bible_chapter})`)
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

  console.log(`\n✓ Updated ${totalUpdated} lessons with bible_chapter (from series.title)`);

  // Verify
  const after = await queryDB(
    "SELECT COUNT(*) as with_chapter FROM lessons WHERE bible_chapter IS NOT NULL"
  );
  const total = await queryDB("SELECT COUNT(*) as total FROM lessons");
  const afterCount = parseInt(after[0]?.with_chapter || 0);
  const totalCount = parseInt(total[0]?.total || 1);
  console.log(
    `\nDB now: ${afterCount}/${totalCount} lessons with bible_chapter (${((afterCount / totalCount) * 100).toFixed(1)}%)`
  );
})();
