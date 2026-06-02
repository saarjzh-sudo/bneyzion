#!/usr/bin/env node
/**
 * Import Ezra / הפרק השבועי Drive content → community_course_lessons
 *
 * Source:  /tmp/ezra-drive-manifest.json (מניפסט מוכן מ-Google Drive)
 * Target:  Supabase `community_course_lessons` table
 * Course:  35e7d37b-a263-4e85-a8d8-16fdbae312ae  (ספר עזרא — הפרק השבועי)
 *
 * Model:  ONE ROW PER FILE (not one row per layer).
 *         Each Drive file = one lesson row.
 *
 * Usage (dry-run):
 *   env -u HTTPS_PROXY -u HTTP_PROXY SUPABASE_SERVICE_ROLE=<key> node scripts/import-ezra-drive-content.mjs --dry-run
 *
 * Usage (live):
 *   env -u HTTPS_PROXY -u HTTP_PROXY SUPABASE_SERVICE_ROLE=<key> node scripts/import-ezra-drive-content.mjs
 *
 * Iron rules:
 *  - Deletes existing rows for course 35e7d37b-... then inserts fresh set.
 *  - Never touches other courses, user_access_tags, RLS, or subscription logic.
 *  - DB writes authorized by Saar: "ייבוא מחדש מ-Google Drive כולל כתיבה ל-DB החי"
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

// ── Guardrails ─────────────────────────────────────────────────────────────────
const COURSE_ID = "35e7d37b-a263-4e85-a8d8-16fdbae312ae";
const SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";

if (!process.env.SUPABASE_SERVICE_ROLE) {
  console.error("ERROR: set SUPABASE_SERVICE_ROLE env var.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const DRY_RUN = process.argv.includes("--dry-run");

// ── Load manifest ──────────────────────────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync("/tmp/ezra-drive-manifest.json", "utf8"));

// ── Helpers ────────────────────────────────────────────────────────────────────
const EMBED_BASE = "https://drive.google.com/file/d";

function driveEmbed(id) {
  return `${EMBED_BASE}/${id}/preview`;
}

/**
 * Map a Drive item to media columns.
 * pdf → attachment_url
 * mp4 / mpeg_video → video_url
 * mp3 → audio_url
 * jpg/png → thumbnail_url (schedule image — skip as a lesson row)
 */
function mediaColumns(item) {
  const url = driveEmbed(item.id);
  if (item.mime === "pdf") return { attachment_url: url };
  if (item.mime === "mp4" || item.mime === "mpeg_video") return { video_url: url };
  if (item.mime === "mp3") return { audio_url: url };
  return {}; // jpg/png etc — caller should skip
}

/**
 * Canonical title by role.
 * Matches the roles map in the manifest + the spec.
 */
const ROLE_TITLES = {
  verses_commentary: "ושננתם — קריאת הפרק עם ביאור",
  guidance_sheet: "להיפגש עם הפרק — דף הכוונה",
  audio_reading: "הקראת הפרק עם ביאור — הרב יונדב זר",
  translated: "תרגום הפרק (ארמית→עברית)",
  heart_video: "לב הפרק — הרב עמנואל בן ארצי",
  broad_view: "הפרק במבט רחב — הרב עמנואל בן ארצי",
  broad_view_audio: "הפרק במבט רחב — הרב עמנואל בן ארצי",
  enrichment_article: "מאמר הרחבה — הרב יוסף שילר",
  weekly_video: "השיעור השבועי — הרב יואב אוריאל",
  weekly_audio: "השיעור השבועי (שמע) — הרב יואב אוריאל",
  weekly_summary: "סיכום השיעור — הרב יואב אוריאל",
  // intro roles — title comes directly from manifest item
  intro_article: null,
  intro_audio: null,
  intro_letter: null,
  schedule_image: null, // skip — not a lesson
};

/**
 * lesson_number within a layer by role (ascending order).
 * Base: ושננתם(1) · אודיו(2) · דף הכוונה(3) · תרגום(4)
 * Enrichment: לב הפרק(1) · במבט רחב וידאו(2) · במבט רחב אודיו(3) · מאמר(4)
 * Weekly: וידאו(1) · שמע(2) · סיכום(3)
 */
const ROLE_ORDER = {
  verses_commentary: 1,
  audio_reading: 2,
  guidance_sheet: 3,
  translated: 4,
  heart_video: 1,
  broad_view: 2,
  broad_view_audio: 3,
  enrichment_article: 4,
  weekly_video: 1,
  weekly_audio: 2,
  weekly_summary: 3,
  intro_article: 1,
  intro_audio: 2,
  intro_letter: 3,
};

// ── Build rows ─────────────────────────────────────────────────────────────────
const rows = [];
const now = new Date().toISOString();

// Intro (bible_chapter = null, layer_type = "intro")
// Use sequential index within intro group (multiple items can share same role)
{
  let introIdx = 0;
  for (const item of manifest.intro) {
    if (item.role === "schedule_image") continue; // skip jpg
    const media = mediaColumns(item);
    if (Object.keys(media).length === 0) continue; // skip unsupported

    introIdx++;
    rows.push({
      course_id: COURSE_ID,
      bible_book: "עזרא",
      bible_chapter: null,
      layer_type: "intro",
      title: item.title, // already canonical in manifest
      description: manifest.topics.intro,
      lesson_number: introIdx,
      status: "published",
      published_at: now,
      ...media,
    });
  }
}

// Chapters 1–10
for (const [chNumStr, chData] of Object.entries(manifest.chapters)) {
  const chNum = parseInt(chNumStr, 10);
  const topic = manifest.topics[chNumStr] ?? "";

  const layerMap = [
    { key: "base", type: "base" },
    { key: "enrichment", type: "enrichment" },
    { key: "weekly", type: "weekly" },
  ];

  for (const { key, type } of layerMap) {
    const items = chData[key] ?? [];
    for (const item of items) {
      const media = mediaColumns(item);
      if (Object.keys(media).length === 0) continue;

      const canonicalTitle = ROLE_TITLES[item.role] ?? item.raw ?? item.role;

      rows.push({
        course_id: COURSE_ID,
        bible_book: "עזרא",
        bible_chapter: chNum,
        layer_type: type,
        title: canonicalTitle,
        description: topic, // chapter topic → subtitle
        lesson_number: ROLE_ORDER[item.role] ?? 99,
        status: "published",
        published_at: now,
        ...media,
      });
    }
  }
}

// ── Summary ────────────────────────────────────────────────────────────────────
const byLayer = rows.reduce((acc, r) => {
  acc[r.layer_type] = (acc[r.layer_type] || 0) + 1;
  return acc;
}, {});

console.log("\n── Rows to insert ──────────────────────────────────");
console.log(`Total: ${rows.length}`);
for (const [layer, count] of Object.entries(byLayer)) {
  console.log(`  ${layer}: ${count}`);
}

if (DRY_RUN) {
  console.log("\n[DRY-RUN] Not writing to DB. Sample first 3 rows:");
  console.log(JSON.stringify(rows.slice(0, 3), null, 2));
  process.exit(0);
}

// ── Delete existing rows ────────────────────────────────────────────────────
console.log("\n── Deleting existing rows …");
const { error: delErr, count: delCount } = await supabase
  .from("community_course_lessons")
  .delete()
  .eq("course_id", COURSE_ID);

if (delErr) {
  console.error("DELETE failed:", delErr);
  process.exit(1);
}
console.log(`Deleted (prev rows removed). Inserting ${rows.length} fresh rows…`);

// ── Insert in chunks of 50 ──────────────────────────────────────────────────
const CHUNK = 50;
let inserted = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const { error: insErr } = await supabase
    .from("community_course_lessons")
    .insert(chunk);

  if (insErr) {
    console.error(`INSERT failed at chunk ${i}:`, insErr);
    process.exit(1);
  }
  inserted += chunk.length;
  process.stdout.write(`  inserted ${inserted}/${rows.length}\r`);
}
console.log(`\nInserted: ${inserted} rows`);

// ── Update total_lessons on community_courses ─────────────────────────────
const { error: updErr } = await supabase
  .from("community_courses")
  .update({ total_lessons: 10 }) // 10 chapters (not counting intro)
  .eq("id", COURSE_ID);

if (updErr) {
  console.warn("Warning: could not update total_lessons:", updErr.message);
} else {
  console.log("Updated community_courses.total_lessons = 10");
}

// ── Verify count ───────────────────────────────────────────────────────────
const { count: finalCount } = await supabase
  .from("community_course_lessons")
  .select("id", { count: "exact", head: true })
  .eq("course_id", COURSE_ID);

console.log(`\n── Final row count in DB: ${finalCount}`);
console.log("\nImport complete.");
