#!/usr/bin/env node
/**
 * Import הפרק השבועי — all books — Drive content → community_course_lessons
 *
 * Books: נחמיה, דניאל, אסתר, חגי-זכריה-מלאכי, איכה
 * (עזרא already imported via import-ezra-drive-content.mjs)
 *
 * Usage (dry-run):
 *   env -u HTTPS_PROXY -u HTTP_PROXY SUPABASE_SERVICE_ROLE=<key> \
 *     node scripts/import-all-books-drive-content.mjs --dry-run
 *
 * Usage (live):
 *   env -u HTTPS_PROXY -u HTTP_PROXY SUPABASE_SERVICE_ROLE=<key> \
 *     node scripts/import-all-books-drive-content.mjs
 *
 * Iron rules:
 *  - Deletes existing rows for each course_id before inserting fresh set.
 *  - Never touches other courses, user_access_tags, RLS, or subscription logic.
 *  - Skips chapters with zero valid-media files (no empty rows).
 *  - docx: uses Drive preview embed (renders fine). If pdf exists for same
 *    role+chapter, pdf wins and docx is skipped.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

// ── Guardrails ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";

if (!process.env.SUPABASE_SERVICE_ROLE) {
  console.error("ERROR: set SUPABASE_SERVICE_ROLE env var.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const DRY_RUN = process.argv.includes("--dry-run");

// ── Course ID map ──────────────────────────────────────────────────────────────
// (discovered from DB query above)
const COURSE_IDS = {
  nehemiah:                   "e1ec3ebc-fdf6-41be-a1fe-262174c2c8dd",
  daniel:                     "ccee8278-ca37-4025-a5b8-13ea99617a24",
  esther:                     "e3ee44dd-07f8-4902-a5cf-07bd1645de92",
  "haggai-zechariah-malachi": "dff61c84-48d4-4d11-88de-1f52ecbd7885",
  lamentations:               "3f9742e3-370e-4f98-b9d2-3aaae94da38e",
};

// ── Hebrew bible-book names ────────────────────────────────────────────────────
const BOOK_HEB = {
  nehemiah:   "נחמיה",
  daniel:     "דניאל",
  esther:     "אסתר",
  zechariah:  "זכריה",
  haggai:     "חגי",
  malachi:    "מלאכי",
  lamentations: "איכה",
};

// ── Drive embed helper ─────────────────────────────────────────────────────────
function driveEmbed(id) {
  return `https://drive.google.com/file/d/${id}/preview`;
}

// ── Media columns mapping ──────────────────────────────────────────────────────
// jpg/png → thumbnail_url AND attachment_url (so it displays AND is accessible)
// docx → attachment_url (Drive preview renders it)
// doc  → attachment_url
// pdf  → attachment_url
// mp4 / mpeg_video → video_url
// mp3  → audio_url
function mediaColumns(item) {
  const url = driveEmbed(item.id);
  const m = item.mime;
  if (m === "pdf" || m === "docx" || m === "doc")
    return { attachment_url: url };
  if (m === "mp4" || m === "mpeg_video")
    return { video_url: url };
  if (m === "mp3")
    return { audio_url: url };
  if (m === "jpg" || m === "png")
    return { thumbnail_url: url, attachment_url: url };
  return {};
}

// ── Role → canonical title ─────────────────────────────────────────────────────
const ROLE_TITLES = {
  verses_commentary:     "ושננתם — קריאת הפרק עם ביאור",
  guidance_sheet:        "להיפגש עם הפרק — דף הכוונה",
  audio_reading:         "הקראת הפרק עם ביאור — הרב יונדב זר",
  audio_plain:           "הקראת הפרק (ללא ביאור)",
  translated:            "תרגום הפרק",
  heart_video:           "לב הפרק — הרב עמנואל בן ארצי",
  broad_view:            "הפרק במבט רחב — הרב עמנואל בן ארצי",
  broad_view_audio:      "הפרק במבט רחב — הרב עמנואל בן ארצי",
  enrichment_article:    "מאמר הרחבה",
  enrichment_video:      "סרטון העמקה — הרב יוסף שילר",
  visual_summary:        "סיכום חזותי",
  weekly_video:          "השיעור השבועי — הרב יואב אוריאל",
  weekly_audio:          "השיעור השבועי (שמע) — הרב יואב אוריאל",
  weekly_summary:        "סיכום השיעור — הרב יואב אוריאל",
  weekly_summary_docx:   "סיכום השיעור — הרב יואב אוריאל",
  document_other:        "מסמך נלווה",
  intro_video:           null, // use raw title
  intro_article:         null,
  intro_audio:           null,
  intro_letter:          null,
  book_summary:          "סיכום הספר",
  book_structure:        "מבנה הספר וציר הזמן",
  schedule:              "לוח זמנים",
  image:                 "תרשים / מפה",
  yoav_article:          "מאמר — הרב יואב אוריאל",
  seley_lesson:          null, // title from manifest (includes chapter ref)
  other:                 null, // use raw title
};

// ── Role → layer_type ─────────────────────────────────────────────────────────
// Used when iterating resources/intro outside of chapter context
function roleToLayerType(role) {
  if (["intro_video","intro_article","intro_audio","intro_letter","broad_view_audio"].includes(role))
    return "intro";
  if (["weekly_video","weekly_audio","weekly_summary","weekly_summary_docx","visual_summary"].includes(role))
    return "weekly";
  if (["enrichment_video","enrichment_article","heart_video","broad_view"].includes(role))
    return "enrichment";
  if (["schedule","book_summary","book_structure","yoav_article","translated"].includes(role))
    return "resources";
  if (role === "seley_lesson") return "resources";
  return "base";
}

// ── Role → lesson ordering within layer ────────────────────────────────────────
const ROLE_ORDER = {
  verses_commentary:   1,
  audio_reading:       2,
  audio_plain:         3,
  guidance_sheet:      4,
  translated:          5,
  heart_video:         1,
  broad_view:          2,
  broad_view_audio:    3,
  enrichment_video:    1,
  enrichment_article:  4,
  weekly_video:        1,
  weekly_audio:        2,
  weekly_summary:      3,
  weekly_summary_docx: 3,
  visual_summary:      4,
  document_other:      5,
  intro_video:         1,
  intro_article:       2,
  intro_audio:         3,
  intro_letter:        4,
  book_summary:        1,
  book_structure:      2,
  schedule:            1,
  yoav_article:        2,
  image:               5,
  seley_lesson:        1,
  other:               6,
};

function canonicalTitle(item) {
  const mapped = ROLE_TITLES[item.role];
  if (mapped === null) return item.title || item.raw || item.role;
  return mapped || item.raw || item.role;
}

// ── PDF vs DOCX dedup: prefer PDF ─────────────────────────────────────────────
// Within the same role+chapter, if both pdf and docx exist, skip docx.
function dedupPdfDocx(items) {
  const pdfKeys = new Set();
  for (const it of items) {
    if (it.mime === "pdf") pdfKeys.add(it.role);
  }
  return items.filter((it) => {
    if (it.mime === "docx" && pdfKeys.has(it.role)) return false;
    return true;
  });
}

// ── Build rows helper ──────────────────────────────────────────────────────────
const now = new Date().toISOString();

function makeRow(courseId, biblBookHeb, bibleChapter, layerType, item, lessonNum, description) {
  const media = mediaColumns(item);
  if (Object.keys(media).length === 0) return null; // skip unsupported mime
  return {
    course_id: courseId,
    bible_book: biblBookHeb,
    bible_chapter: bibleChapter,
    layer_type: layerType,
    title: canonicalTitle(item),
    description: description || null,
    lesson_number: lessonNum ?? (ROLE_ORDER[item.role] ?? 99),
    status: "published",
    published_at: now,
    ...media,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOK BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Nehemiah ───────────────────────────────────────────────────────────────────
function buildNehemiahRows(manifest) {
  const courseId = COURSE_IDS.nehemiah;
  const rows = [];

  // intro items (pdf only relevant — skip pure-image jpg for thumbnail)
  let introIdx = 0;
  for (const item of (manifest.intro || [])) {
    if (item.mime === "jpg" || item.mime === "png") {
      // Images go as thumbnail_url + attachment_url
      const r = makeRow(courseId, BOOK_HEB.nehemiah, null, "intro", item, ++introIdx, "הקדמה");
      if (r) rows.push(r);
    } else {
      const r = makeRow(courseId, BOOK_HEB.nehemiah, null, "intro", item, ++introIdx, "הקדמה");
      if (r) rows.push(r);
    }
  }

  // resources (schedule)
  for (const item of (manifest.resources || [])) {
    const r = makeRow(courseId, BOOK_HEB.nehemiah, null, "resources", item, ROLE_ORDER[item.role] ?? 99, "משאבים");
    if (r) rows.push(r);
  }

  // chapters — note: nehemiah has chapters 1,2,3,8,9,10,11,13 (skips 4-7,12)
  for (const [chStr, chData] of Object.entries(manifest.chapters)) {
    const chNum = parseInt(chStr, 10);
    const layerMap = [
      { key: "base",       type: "base" },
      { key: "enrichment", type: "enrichment" },
      { key: "weekly",     type: "weekly" },
    ];
    for (const { key, type } of layerMap) {
      const items = dedupPdfDocx(chData[key] || []);
      for (const item of items) {
        const r = makeRow(courseId, BOOK_HEB.nehemiah, chNum, type, item, ROLE_ORDER[item.role] ?? 99, `פרק ${chNum}`);
        if (r) rows.push(r);
      }
    }
  }

  return rows;
}

// ── Daniel ─────────────────────────────────────────────────────────────────────
// Special handling: seley_lessons in resources → layer_type=resources
// book_summary → resources, yoav_article → resources, book_structure → intro
function buildDanielRows(manifest) {
  const courseId = COURSE_IDS.daniel;
  const rows = [];

  // resources (global — seley_lesson, translated, yoav_article, book_summary, book_structure, schedule)
  let seleyIdx = 0;
  for (const item of (manifest.resources || [])) {
    if (item.mime === "jpg" || item.mime === "png") {
      // schedule images → resources as thumbnail
      const r = makeRow(courseId, BOOK_HEB.daniel, null, "resources", item, ROLE_ORDER[item.role] ?? 99, "משאבים");
      if (r) rows.push(r);
      continue;
    }
    if (item.role === "seley_lesson") {
      // Extract chapter number from title ("12-דניאל פרק יב", "1- דניאל פרק א" etc.)
      const chMatch = item.raw.match(/^(\d+)[-\s]/);
      const chNum = chMatch ? parseInt(chMatch[1], 10) : null;
      // title is already good from manifest (includes chapter ref)
      const r = makeRow(courseId, BOOK_HEB.daniel, chNum, "resources", item, ++seleyIdx, chNum ? `שיעורי הרב ברוך סליי — פרק ${chNum}` : "שיעורי הרב ברוך סליי");
      if (r) {
        r.title = item.title || item.raw; // keep original specific title
        rows.push(r);
      }
      continue;
    }
    const layer = roleToLayerType(item.role);
    const r = makeRow(courseId, BOOK_HEB.daniel, null, layer, item, ROLE_ORDER[item.role] ?? 99, "משאבים");
    if (r) rows.push(r);
  }

  // chapters — only those with actual content
  for (const [chStr, chData] of Object.entries(manifest.chapters)) {
    const chNum = parseInt(chStr, 10);
    const layerMap = [
      { key: "base",       type: "base" },
      { key: "enrichment", type: "enrichment" },
      { key: "weekly",     type: "weekly" },
    ];
    let hasContent = false;
    for (const { key, type } of layerMap) {
      const items = dedupPdfDocx(chData[key] || []);
      for (const item of items) {
        const r = makeRow(courseId, BOOK_HEB.daniel, chNum, type, item, ROLE_ORDER[item.role] ?? 99, `פרק ${chNum}`);
        if (r) { rows.push(r); hasContent = true; }
      }
    }
    if (!hasContent) console.log(`  [Daniel] Chapter ${chNum} — no media, skipping`);
  }

  return rows;
}

// ── Esther ─────────────────────────────────────────────────────────────────────
// Structure: pair_weeks. bible_chapter = chapter_first of pair.
// title/description reflects both chapters (e.g. "פרקים א'-ב'")
// Two narrators for audio_reading — both kept with distinct titles.
function buildEstherRows(manifest) {
  const courseId = COURSE_IDS.esther;
  const rows = [];

  // intro
  let introIdx = 0;
  for (const item of (manifest.intro || [])) {
    const r = makeRow(courseId, BOOK_HEB.esther, null, "intro", item, ++introIdx, "הקדמה");
    if (r) rows.push(r);
  }

  // summary_lesson (treat as a special week)
  for (const item of (manifest.summary_lesson || [])) {
    const r = makeRow(courseId, BOOK_HEB.esther, null, "resources", item, ROLE_ORDER[item.role] ?? 99, "שיעור סיכום");
    if (r) rows.push(r);
  }

  // weeks
  for (const [wkStr, wkData] of Object.entries(manifest.weeks)) {
    const chFirst = wkData.chapter_first;
    const desc = wkData.title || `פרקים ${chFirst}+`;

    // Esther audio_reading: two narrators — יונדב זר and דן בארי — keep both
    // We distinguish by raw filename
    const allItems = [
      ...(wkData.base || []),
      ...(wkData.enrichment || []),
      ...(wkData.weekly || []),
    ];

    // dedupPdfDocx per-layer but run on combined (they have distinct roles anyway)
    const baseItems = dedupPdfDocx(wkData.base || []);
    const enrichItems = dedupPdfDocx(wkData.enrichment || []);
    const weeklyItems = dedupPdfDocx(wkData.weekly || []);

    // Audio titles disambiguation
    function estherAudioTitle(item) {
      const raw = item.raw || "";
      if (raw.includes("יונדב") || raw.includes("יונדב-")) return "הקראת הפרק — הרב יונדב זר";
      if (raw.includes("בארי") || raw.includes("דן בארי")) return "הקראת הפרק — הרב דן בארי";
      return "הקראת הפרק";
    }

    for (const item of baseItems) {
      let r = makeRow(courseId, BOOK_HEB.esther, chFirst, "base", item, ROLE_ORDER[item.role] ?? 99, desc);
      if (!r) continue;
      if (item.role === "audio_reading") r.title = estherAudioTitle(item);
      rows.push(r);
    }
    for (const item of enrichItems) {
      const r = makeRow(courseId, BOOK_HEB.esther, chFirst, "enrichment", item, ROLE_ORDER[item.role] ?? 99, desc);
      if (r) rows.push(r);
    }
    for (const item of weeklyItems) {
      const r = makeRow(courseId, BOOK_HEB.esther, chFirst, "weekly", item, ROLE_ORDER[item.role] ?? 99, desc);
      if (r) rows.push(r);
    }
  }

  return rows;
}

// ── Haggai-Zechariah-Malachi ────────────────────────────────────────────────────
// Structure: three_sub_books. One course_id, bible_book = sub-book name.
// Only chapters with content. Zechariah 3-14 are empty → skip.
function buildHzmRows(manifest) {
  const courseId = COURSE_IDS["haggai-zechariah-malachi"];
  const rows = [];

  for (const [subKey, subData] of Object.entries(manifest.books)) {
    const biblBookHeb = BOOK_HEB[subKey] || subKey;

    // intro (only zechariah has it — shared for all three)
    let introIdx = 0;
    for (const item of (subData.intro || [])) {
      const r = makeRow(courseId, biblBookHeb, null, "intro", item, ++introIdx, "הקדמה — חגי, זכריה ומלאכי");
      if (r) rows.push(r);
    }

    // chapters
    for (const [chStr, chData] of Object.entries(subData.chapters || {})) {
      const chNum = parseInt(chStr, 10);
      const layerMap = [
        { key: "base",       type: "base" },
        { key: "enrichment", type: "enrichment" },
        { key: "weekly",     type: "weekly" },
      ];
      let hasContent = false;
      for (const { key, type } of layerMap) {
        const items = dedupPdfDocx(chData[key] || []);
        for (const item of items) {
          const r = makeRow(courseId, biblBookHeb, chNum, type, item, ROLE_ORDER[item.role] ?? 99, `${biblBookHeb} פרק ${chNum}`);
          if (r) { rows.push(r); hasContent = true; }
        }
      }
      if (!hasContent) console.log(`  [HZM] ${biblBookHeb} Chapter ${chNum} — no media, skipping`);
    }
  }

  return rows;
}

// ── Lamentations ────────────────────────────────────────────────────────────────
// 5 chapters, all with content. Flat structure (roles inferred).
// audio_plain → "הקראת הפרק (ללא ביאור)" (base layer)
// enrichment_video → "סרטון העמקה — הרב יוסף שילר" (enrichment)
function buildLamentationsRows(manifest) {
  const courseId = COURSE_IDS.lamentations;
  const rows = [];

  // intro
  let introIdx = 0;
  for (const item of (manifest.intro || [])) {
    const r = makeRow(courseId, BOOK_HEB.lamentations, null, "intro", item, ++introIdx, "הקדמה");
    if (r) rows.push(r);
  }

  // chapters
  for (const [chStr, chData] of Object.entries(manifest.chapters)) {
    const chNum = parseInt(chStr, 10);
    const layerMap = [
      { key: "base",       type: "base" },
      { key: "enrichment", type: "enrichment" },
      { key: "weekly",     type: "weekly" },
    ];
    for (const { key, type } of layerMap) {
      const items = dedupPdfDocx(chData[key] || []);
      for (const item of items) {
        const r = makeRow(courseId, BOOK_HEB.lamentations, chNum, type, item, ROLE_ORDER[item.role] ?? 99, `פרק ${chNum}`);
        if (r) rows.push(r);
      }
    }
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const BOOKS = [
  {
    key: "nehemiah",
    manifestPath: "/tmp/nehemiah-drive-manifest.json",
    builder: buildNehemiahRows,
    chaptersWithContent: [1, 2, 3, 8, 9, 10, 11, 13],
  },
  {
    key: "daniel",
    manifestPath: "/tmp/daniel-drive-manifest.json",
    builder: buildDanielRows,
    // chapter 5 has no base+weekly, chapter 8 has only enrichment article
    chaptersWithContent: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    key: "esther",
    manifestPath: "/tmp/esther-drive-manifest.json",
    builder: buildEstherRows,
    // 5 pairs + intro + summary
    chaptersWithContent: [1, 3, 5, 7, 9],
  },
  {
    key: "haggai-zechariah-malachi",
    manifestPath: "/tmp/haggai-zechariah-malachi-drive-manifest.json",
    builder: buildHzmRows,
    chaptersWithContent: null, // handled internally per sub-book
  },
  {
    key: "lamentations",
    manifestPath: "/tmp/lamentations-drive-manifest.json",
    builder: buildLamentationsRows,
    chaptersWithContent: [1, 2, 3, 4, 5],
  },
];

let grandTotal = 0;
const bookSummaries = [];

for (const book of BOOKS) {
  const manifest = JSON.parse(fs.readFileSync(book.manifestPath, "utf8"));
  const courseId = COURSE_IDS[book.key];
  console.log(`\n══ Building rows for: ${book.key} (course ${courseId}) ══`);

  const rows = book.builder(manifest);

  // Validate: no rows without any media URL
  const badRows = rows.filter(r =>
    !r.video_url && !r.audio_url && !r.attachment_url && !r.thumbnail_url
  );
  if (badRows.length > 0) {
    console.error(`  ERROR: ${badRows.length} rows with no media URL — aborting`);
    for (const br of badRows.slice(0, 3)) {
      console.error("  ", JSON.stringify(br));
    }
    process.exit(1);
  }

  const byLayer = rows.reduce((acc, r) => {
    acc[r.layer_type] = (acc[r.layer_type] || 0) + 1;
    return acc;
  }, {});

  console.log(`  Total rows: ${rows.length}`);
  for (const [l, c] of Object.entries(byLayer)) console.log(`    ${l}: ${c}`);

  const chaptersWithMedia = new Set(
    rows.filter(r => r.bible_chapter != null).map(r => r.bible_chapter)
  );
  console.log(`  Chapters with content: ${[...chaptersWithMedia].sort((a,b)=>a-b).join(", ")}`);

  bookSummaries.push({
    book: book.key,
    courseId,
    rows: rows.length,
    byLayer,
    chaptersWithMedia: [...chaptersWithMedia].sort((a,b)=>a-b),
  });

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] First 2 rows sample:`);
    console.log(JSON.stringify(rows.slice(0, 2), null, 2));
    continue;
  }

  // Delete existing
  console.log(`  Deleting existing rows for course ${courseId}…`);
  const { error: delErr } = await supabase
    .from("community_course_lessons")
    .delete()
    .eq("course_id", courseId);
  if (delErr) {
    console.error("  DELETE failed:", delErr);
    process.exit(1);
  }

  // Insert in chunks of 50
  const CHUNK = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error: insErr } = await supabase
      .from("community_course_lessons")
      .insert(chunk);
    if (insErr) {
      console.error(`  INSERT failed at chunk ${i}:`, insErr);
      process.exit(1);
    }
    inserted += chunk.length;
    process.stdout.write(`  inserted ${inserted}/${rows.length}\r`);
  }
  console.log(`\n  Inserted: ${inserted} rows`);

  // Update total_lessons = number of chapters with content (not file count)
  const totalChapters = chaptersWithMedia.size;
  const { error: updErr } = await supabase
    .from("community_courses")
    .update({ total_lessons: totalChapters })
    .eq("id", courseId);
  if (updErr) console.warn(`  Warning: could not update total_lessons:`, updErr.message);
  else console.log(`  Updated total_lessons = ${totalChapters}`);

  grandTotal += inserted;
}

console.log("\n══ Import complete ══");
console.log(`Grand total lessons inserted: ${grandTotal}`);
console.log("\n── Per-book summary ──");
for (const s of bookSummaries) {
  console.log(`\n${s.book} (${s.courseId})`);
  console.log(`  rows: ${s.rows}`);
  for (const [l, c] of Object.entries(s.byLayer)) console.log(`  ${l}: ${c}`);
  console.log(`  chapters: ${s.chaptersWithMedia.join(", ")}`);
}
