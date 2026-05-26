/**
 * backfill-series-bible-book.mjs
 *
 * שלב 1: ADD COLUMN bible_book ל-series (אם לא קיים)
 * שלב 2: Regex match על title → bible_book
 * שלב 3: UPDATE ב-DB (ב-dry-run: הדפסה בלבד)
 * שלב 4: שלב נוסף — UPDATE lessons.bible_book מ-series.bible_book ל-lessons ללא bible_book
 *
 * הפעלה (dry-run):
 *   node scripts/backfill-series-bible-book.mjs
 *
 * הפעלה (write לDB):
 *   node scripts/backfill-series-bible-book.mjs --write
 *
 * הפעלה שלב 2 (עדכון lessons מ-series):
 *   node scripts/backfill-series-bible-book.mjs --write --lessons
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================
// Config
// ============================================================
const SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
// service_role key נקרא מ-env (אסור להזריק כ-hardcoded — נפרש מ-env var)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  console.error(
    "ERROR: set SUPABASE_SERVICE_KEY env var before running.\n" +
      "  export SUPABASE_SERVICE_KEY=<service_role_jwt>"
  );
  process.exit(1);
}

// Management API token — read from env, never hardcoded
const SUPABASE_MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN;
if (!SUPABASE_MGMT_TOKEN) {
  console.error(
    "ERROR: set SUPABASE_MGMT_TOKEN env var before running.\n" +
      "  export SUPABASE_MGMT_TOKEN=sbp_..."
  );
  process.exit(1);
}

const DRY_RUN = !process.argv.includes("--write");
const DO_LESSONS = process.argv.includes("--lessons");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ============================================================
// Book lists (canonical Hebrew names, ordered Torah→Neviim→Ketuvim)
// ============================================================
const TORAH_BOOKS = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"];
const NEVIIM_BOOKS = [
  "יהושע",
  "שופטים",
  "שמואל א",
  "שמואל ב",
  "שמואל",
  "מלכים א",
  "מלכים ב",
  "מלכים",
  "ישעיהו",
  "ירמיהו",
  "יחזקאל",
  "הושע",
  "יואל",
  "עמוס",
  "עובדיה",
  "יונה",
  "מיכה",
  "נחום",
  "חבקוק",
  "צפניה",
  "חגי",
  "זכריה",
  "מלאכי",
];
const KETUVIM_BOOKS = [
  "תהלים",
  "תהילים",
  "משלי",
  "איוב",
  "שיר השירים",
  "רות",
  "איכה",
  "קהלת",
  "אסתר",
  "דניאל",
  "עזרא",
  "נחמיה",
  "דברי הימים א",
  "דברי הימים ב",
  "דברי הימים",
];

// Canonical name normalization (variants → canonical)
const BOOK_VARIANTS = {
  תהילים: "תהלים",
  ישעיה: "ישעיהו",
  ירמיה: "ירמיהו",
  "שמואל א": "שמואל א",
  "שמואל ב": "שמואל ב",
  שמואל: "שמואל",
  "מלכים א": "מלכים א",
  "מלכים ב": "מלכים ב",
  מלכים: "מלכים",
  "דברי הימים א": "דברי הימים א",
  "דברי הימים ב": "דברי הימים ב",
  "דברי הימים": "דברי הימים",
};

const ALL_BOOKS = [
  ...TORAH_BOOKS,
  ...NEVIIM_BOOKS,
  ...KETUVIM_BOOKS,
  // extra variants for matching
  "תהילים",
  "ישעיה",
  "ירמיה",
];
// Sort by length descending so longer names match before shorter ones (e.g. "מלכים א" before "מלכים")
const SORTED_BOOKS = [...new Set(ALL_BOOKS)].sort(
  (a, b) => b.length - a.length
);

// ============================================================
// Match function — returns canonical book name or null
// ============================================================
function inferBibleBook(title) {
  const t = title.trim();

  // Patterns to try in priority order:
  const patterns = [
    // "ספר X" — e.g. "ספר משלי", "ביאור ספר תהלים"
    /ספר\s+([א-תװ-״ '"]+?)(?:\s*[-|–|,]|\s*פרק|\s*$)/,
    // "חומש X" — e.g. "חומש בראשית - קריאה"
    /חומש\s+([א-תװ-״ '"]+?)(?:\s*[-|–|,|']|\s*$)/,
    // "X בבקיאות" — e.g. "הושע בבקיאות"
    /([א-תװ-״ '"]+?)\s+בבקיאות/,
    // "X - מוקלט" — e.g. "איוב - מוקלט"
    /([א-תװ-״ '"]+?)\s+-\s+מוקלט/,
    // "X פרק Y" — e.g. "הושע פרק א", "איכה פרק ב"
    /([א-תװ-״ '"]+?)\s+פרק\s+/,
    // "דפי עבודה - X" — e.g. "דפי עבודה - הושע"
    /דפי עבודה\s+-\s+([א-תװ-״ '"]+?)(?:\s*$)/,
    // "חמאה ודבש - X" — e.g. "חמאה ודבש - חגי"
    /חמאה ודבש\s+-\s+([א-תװ-״ '"]+?)(?:\s*$)/,
    // "הפטרות X - ..." or "הפטרות X" — e.g. "הפטרות שמות", "הפטרות המועדים"
    /הפטרות\s+([א-תװ-״ '"]+?)(?:\s*[-|–]|\s*$)/,
    // "על פרשיות X" / "שיחות על פרשיות X" — e.g. "הרב אבינר על פרשיות בראשית"
    /על\s+פרשיות\s+([א-תװ-״ '"]+?)(?:\s*$)/,
    // "דבר תורה לשולחן השבת - X" — e.g. "דבר תורה לשולחן השבת - בראשית"
    /דבר תורה לשולחן השבת\s+-\s+([א-תװ-״ '"]+?)(?:\s*$)/,
    // "מגילת X" — e.g. "מגילת אסתר"
    /מגילת\s+([א-תװ-״ '"]+?)(?:\s*[-|–|,]|\s*$)/,
    // Direct book name at start of title (longest match first)
  ];

  for (const pattern of patterns) {
    const m = t.match(pattern);
    if (m) {
      const candidate = m[1].trim();
      const book = matchToBook(candidate);
      if (book) return canonicalize(book);
    }
  }

  // "מזמור X" — תהלים
  if (/מזמור/.test(t)) {
    return "תהלים";
  }

  // "פרשת X" — match via parsha→book lookup
  const parshaMatch = t.match(/פרשת\s+([^\s|–\-][^|–\-]*?)(?:\s*[|–\-]|\s*$)/);
  if (parshaMatch) {
    const parsha = parshaMatch[1].trim();
    const book = parshaToBook(parsha);
    if (book) return book;
  }

  // "מענה X" / "משפט X" related — usually איוב
  if (/מענה/.test(t)) {
    return "איוב";
  }

  // Last resort: check if any book name appears verbatim in the title
  // (only if it's preceded by start-of-string, space, dash, or "ב")
  for (const book of SORTED_BOOKS) {
    const escaped = book.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|\\s|[-–|]|ב)${escaped}(?:$|\\s|[-–|,'])`);
    if (re.test(t)) {
      return canonicalize(book);
    }
  }

  return null;
}

// Parsha → Torah book mapping
function parshaToBook(parsha) {
  const BEREISHIT = ["בראשית","נח","לך לך","וירא","חיי שרה","תולדות","ויצא","וישלח","וישב","מקץ","ויגש","ויחי"];
  const SHEMOT   = ["שמות","וארא","בא","בשלח","יתרו","משפטים","תרומה","תצוה","כי תשא","ויקהל","פקודי"];
  const VAYIKRA  = ["ויקרא","צו","שמיני","תזריע","מצורע","אחרי מות","קדושים","אמור","בהר","בחוקותי"];
  const BAMIDBAR = ["במדבר","נשא","בהעלותך","שלח","שלח לך","קרח","חוקת","בלק","פינחס","פנחס","מטות","מסעי"];
  const DEVARIM  = ["דברים","ואתחנן","עקב","ראה","שופטים","כי תצא","כי תבוא","ניצבים","נצבים","וילך","האזינו","וזאת הברכה"];
  const p = parsha.trim();
  if (BEREISHIT.some(x => p === x || p.startsWith(x))) return "בראשית";
  if (SHEMOT.some(x => p === x || p.startsWith(x)))   return "שמות";
  if (VAYIKRA.some(x => p === x || p.startsWith(x)))  return "ויקרא";
  if (BAMIDBAR.some(x => p === x || p.startsWith(x))) return "במדבר";
  if (DEVARIM.some(x => p === x || p.startsWith(x)))  return "דברים";
  return null;
}

function matchToBook(candidate) {
  // Try exact match first
  if (SORTED_BOOKS.includes(candidate)) return candidate;
  // Try partial match (candidate starts with book name)
  for (const book of SORTED_BOOKS) {
    if (candidate === book || candidate.startsWith(book + " ")) return book;
  }
  return null;
}

function canonicalize(book) {
  return BOOK_VARIANTS[book] || book;
}

// ============================================================
// Step 1 — Add column bible_book to series (via Management API)
// ============================================================
async function addColumnIfMissing() {
  const { data, error } = await supabase.rpc("exec_sql", {
    sql: "ALTER TABLE public.series ADD COLUMN IF NOT EXISTS bible_book text;",
  });
  // The Management API path is the right way — but supabase-js has no raw SQL.
  // We use fetch directly with Management API.
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${new URL(SUPABASE_URL).hostname.split('.')[0]}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_MGMT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query:
          "ALTER TABLE public.series ADD COLUMN IF NOT EXISTS bible_book text;",
      }),
    }
  );
  const json = await res.json();
  if (json.message && json.message.includes("ERROR")) {
    throw new Error(`addColumn failed: ${json.message}`);
  }
  console.log("✓ bible_book column ensured on series");
}

// ============================================================
// Step 2 — Fetch series, compute matches, update
// ============================================================
async function backfillSeries(write) {
  // Fetch all series (no bible_book yet since column may just be added)
  let page = 0;
  const PAGE_SIZE = 500;
  const allSeries = [];
  while (true) {
    const { data, error } = await supabase
      .from("series")
      .select("id, title")
      .order("id")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(`fetch series failed: ${error.message}`);
    if (!data || data.length === 0) break;
    allSeries.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`\nFetched ${allSeries.length} series total`);

  const results = [];
  let matched = 0;
  let unmatched = 0;

  for (const s of allSeries) {
    const book = inferBibleBook(s.title);
    if (book) {
      matched++;
      results.push({ id: s.id, title: s.title, bible_book: book });
    } else {
      unmatched++;
    }
  }

  const coveragePct = ((matched / allSeries.length) * 100).toFixed(1);

  console.log(
    `\nDRY-RUN RESULTS (--write to apply):\n` +
      `  Total series:  ${allSeries.length}\n` +
      `  Matched:       ${matched} (${coveragePct}%)\n` +
      `  Unmatched:     ${unmatched}\n`
  );

  // Print first 50 matches
  console.log("--- Sample matches (first 50) ---");
  for (const r of results.slice(0, 50)) {
    console.log(`  [${r.bible_book}] ${r.title}`);
  }

  // Print first 30 unmatched
  const unmatchedList = allSeries
    .filter((s) => !results.find((r) => r.id === s.id))
    .slice(0, 30);
  console.log("\n--- Sample unmatched (first 30) ---");
  for (const s of unmatchedList) {
    console.log(`  ${s.title}`);
  }

  if (!write) {
    console.log(
      "\nDry-run complete. Run with --write to apply changes to DB.\n"
    );
    return results;
  }

  // --- Write mode ---
  console.log(`\nWriting ${matched} updates to DB...`);
  const CHUNK = 100;
  let updated = 0;
  for (let i = 0; i < results.length; i += CHUNK) {
    const chunk = results.slice(i, i + CHUNK);
    for (const row of chunk) {
      const { error } = await supabase
        .from("series")
        .update({ bible_book: row.bible_book })
        .eq("id", row.id);
      if (error) {
        console.error(`  FAILED updating ${row.id}: ${error.message}`);
      } else {
        updated++;
      }
    }
    process.stdout.write(`  ${Math.min(i + CHUNK, matched)} / ${matched}\r`);
  }
  console.log(`\n✓ Updated ${updated} series rows with bible_book`);
  return results;
}

// ============================================================
// Step 3 — Backfill lessons.bible_book from series.bible_book
// ============================================================
async function backfillLessonsFromSeries(write) {
  console.log("\n=== Backfilling lessons.bible_book from series.bible_book ===");

  // Count before
  const { data: before } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .is("bible_book", null)
    .not("series_id", "is", null);

  const total_null = before;

  // Use Management API for a single efficient SQL UPDATE
  const sql = `
    UPDATE public.lessons l
    SET bible_book = s.bible_book
    FROM public.series s
    WHERE l.series_id = s.id
      AND l.bible_book IS NULL
      AND s.bible_book IS NOT NULL;
  `;

  if (!write) {
    // Count how many would be affected
    const countSql = `
      SELECT COUNT(*) as would_update
      FROM public.lessons l
      JOIN public.series s ON l.series_id = s.id
      WHERE l.bible_book IS NULL AND s.bible_book IS NOT NULL;
    `;
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${new URL(SUPABASE_URL).hostname.split('.')[0]}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_MGMT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: countSql }),
      }
    );
    const json = await res.json();
    console.log(
      `  Would update ${json[0]?.would_update || "?"} lessons from series.bible_book`
    );
    console.log("  Run with --write --lessons to apply.");
    return;
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${new URL(SUPABASE_URL).hostname.split('.')[0]}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_MGMT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const json = await res.json();
  if (json.message && json.message.includes("ERROR")) {
    throw new Error(`lessons backfill failed: ${json.message}`);
  }
  console.log(`✓ lessons.bible_book backfilled from series`);
}

// ============================================================
// Main
// ============================================================
(async () => {
  try {
    console.log("=== Bible Book Backfill ===");
    console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "WRITE"}`);
    if (DO_LESSONS) console.log("Lessons step: enabled");

    // Step 1: ensure column exists (only if writing)
    if (!DRY_RUN) {
      await addColumnIfMissing();
    } else {
      console.log(
        "(dry-run: skipping ADD COLUMN — run with --write to add column)"
      );
    }

    // Step 2: backfill series
    await backfillSeries(!DRY_RUN);

    // Step 3: backfill lessons (only if --lessons flag)
    if (DO_LESSONS) {
      await backfillLessonsFromSeries(!DRY_RUN);
    }
  } catch (err) {
    console.error("FATAL:", err);
    process.exit(1);
  }
})();
