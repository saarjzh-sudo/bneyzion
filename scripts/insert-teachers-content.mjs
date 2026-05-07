#!/usr/bin/env node
/**
 * Insert teacher aids from Umbraco scrape into Supabase
 * Source: scripts/teachers-scrape-result.json (output of umbraco-teachers-scraper.mjs)
 *
 * Strategy:
 * 1. Create a root "מאגר עזרי הלמידה" series if it doesn't exist
 * 2. Walk the scraped tree and INSERT series + lessons
 * 3. All new content tagged: audience_tags = ARRAY['teachers']
 * 4. Skip nodes without meaningful content (navigation pages, search, etc.)
 * 5. Avoid duplicates by checking title+parent before insert
 *
 * Run: env -u HTTPS_PROXY -u HTTP_PROXY node scripts/insert-teachers-content.mjs
 *
 * Dry run (no writes): env -u HTTPS_PROXY -u HTTP_PROXY node scripts/insert-teachers-content.mjs --dry-run
 */

import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const DRY_RUN = process.argv.includes("--dry-run");
if (DRY_RUN) console.log("=== DRY RUN MODE — no writes ===\n");

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";

const db = createClient(DB_URL, DB_KEY);

// SKIP_IDS: navigation / utility nodes that aren't content
const SKIP_IDS = new Set([10244, 10242, 10245, 51628]); // חיפוש, יוצרים, נושאים, פרשת השבוע (hasChildren=false + no content)

// SKIP by contentType — only skip pure utility types, NOT קטגוריה (those ARE our series containers)
const SKIP_TYPES = new Set(["חיפוש", "תגיות/רבנים"]);

// Title patterns that indicate navigation/index pages (no real content)
const NAV_TITLE_PATTERNS = [
  /^כל התכנים ב/,      // "כל התכנים בחומש בראשית" — just a nav page
  /^מעבר ל/,           // "מעבר לשיעורים קצרים..."
  /^חיפוש$/,
  /^יוצרים$/,
  /^נושאים$/,
];

function isNavNode(node) {
  if (SKIP_IDS.has(node.umbId)) return true;
  if (SKIP_TYPES.has(node.contentType)) return true;
  for (const pat of NAV_TITLE_PATTERNS) {
    if (pat.test(node.name)) return true;
  }
  return false;
}

// Detect if a leaf node has meaningful content
function hasMeaningfulContent(node) {
  if (node.attachmentUrl) return true;
  if (node.audioUrl) return true;
  if (node.videoUrl) return true;
  if (node.props?.content && node.props.content.length > 50) return true;
  if (node.props?.promo && node.props.promo.length > 10) return true;
  return false;
}

// Derive media source_type
function getSourceType(node) {
  if (node.videoUrl) return "video";
  if (node.audioUrl) return "audio";
  if (node.attachmentUrl) return "pdf";
  if (node.props?.content) return "article";
  return "article";
}

// Generate a deterministic UUID v4 from a string (for idempotency)
function deterministicUUID(str) {
  const hash = crypto.createHash("sha256").update(str).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join("-");
}

// Map umbId -> supabase uuid for series
const umbToSupabase = new Map();

async function findOrCreateSeries(title, parentId, audienceTags = ["teachers"]) {
  // Check if series with this title and parentId already exists
  const query = db
    .from("series")
    .select("id,title")
    .eq("title", title)
    .limit(1);

  if (parentId) {
    query.eq("parent_id", parentId);
  } else {
    query.is("parent_id", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Series lookup error: ${error.message}`);

  if (data && data.length > 0) {
    console.log(`  [EXISTS] ${title}`);
    return data[0].id;
  }

  // Create new series
  const newSeries = {
    title,
    parent_id: parentId || null,
    status: "published",
    audience_tags: audienceTags,
    lesson_count: 0,
  };

  if (DRY_RUN) {
    const fakeId = deterministicUUID(`series:${title}:${parentId}`);
    console.log(`  [DRY] Would INSERT series: ${title}`);
    return fakeId;
  }

  const { data: inserted, error: insertErr } = await db
    .from("series")
    .insert(newSeries)
    .select("id")
    .single();

  if (insertErr) throw new Error(`Series insert error: ${insertErr.message} (title="${title}")`);
  console.log(`  [NEW SERIES] ${title}`);
  return inserted.id;
}

async function insertLesson(node, seriesId) {
  if (!hasMeaningfulContent(node)) {
    return null; // skip empty nodes
  }

  const title = node.name;
  const content = node.props?.content || node.props?.promo || "";
  const creator = node.props?.creator || null;

  // Check for existing lesson by title+series_id
  const { data: existing } = await db
    .from("lessons")
    .select("id")
    .eq("title", title)
    .eq("series_id", seriesId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`    [EXISTS] lesson: ${title}`);
    return existing[0].id;
  }

  const lessonData = {
    title,
    series_id: seriesId,
    status: "published",
    audience_tags: ["teachers"],
    source_type: getSourceType(node),
    content: content || null,
    audio_url: node.audioUrl || null,
    video_url: node.videoUrl || null,
    attachment_url: node.attachmentUrl || null,
  };

  // Try to find rabbi by creator name
  if (creator) {
    const { data: rabbi } = await db
      .from("rabbis")
      .select("id")
      .ilike("name", `%${creator.trim().split(" ").slice(-1)[0]}%`)
      .limit(1);
    if (rabbi && rabbi.length > 0) {
      lessonData.rabbi_id = rabbi[0].id;
    }
  }

  if (DRY_RUN) {
    console.log(`    [DRY] Would INSERT lesson: ${title} (has_content=${!!content}, attachment=${!!node.attachmentUrl})`);
    return deterministicUUID(`lesson:${title}:${seriesId}`);
  }

  const { data: inserted, error } = await db
    .from("lessons")
    .insert(lessonData)
    .select("id")
    .single();

  if (error) {
    console.error(`    [ERROR] lesson insert: ${error.message} (title="${title}")`);
    return null;
  }

  console.log(`    [NEW LESSON] ${title}`);
  return inserted.id;
}

// Recursively process the scraped tree
async function processTree(nodes, parentSeriesId = null) {
  let newSeries = 0;
  let newLessons = 0;
  let skipped = 0;

  for (const node of nodes) {
    if (isNavNode(node)) {
      skipped++;
      continue;
    }

    const isSeries = node.hasChildren;
    const isLeaf = !node.hasChildren;

    if (isSeries) {
      // Create the series
      const seriesId = await findOrCreateSeries(
        node.name,
        parentSeriesId,
        ["teachers"]
      );
      umbToSupabase.set(node.umbId, seriesId);

      // Also insert the series node itself as a lesson if it has direct content
      if (hasMeaningfulContent(node)) {
        const inserted = await insertLesson(node, seriesId);
        if (inserted) newLessons++;
      }

      // Process children
      if (node.children && node.children.length > 0) {
        const childCounts = await processTree(node.children, seriesId);
        newSeries += 1 + childCounts.newSeries;
        newLessons += childCounts.newLessons;
        skipped += childCounts.skipped;
      } else {
        newSeries += 1;
      }
    } else if (isLeaf) {
      // This is a lesson node
      if (!parentSeriesId) {
        skipped++;
        continue;
      }
      const inserted = await insertLesson(node, parentSeriesId);
      if (inserted) newLessons++;
      else skipped++;
    }
  }

  return { newSeries, newLessons, skipped };
}

async function updateLessonCounts() {
  if (DRY_RUN) { console.log("[DRY] Would recalculate lesson_count for new series"); return; }

  // Recalculate lesson_count for all series with teachers tag
  console.log("\nRecalculating lesson_count for teachers series...");
  const { data: series } = await db
    .from("series")
    .select("id")
    .contains("audience_tags", ["teachers"]);

  if (!series) return;

  for (const s of series) {
    const { count } = await db
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("series_id", s.id)
      .eq("status", "published");

    await db.from("series").update({ lesson_count: count || 0 }).eq("id", s.id);
  }
  console.log(`Updated lesson_count for ${series.length} series`);
}

async function main() {
  const scrapeData = JSON.parse(
    readFileSync("scripts/teachers-scrape-result.json", "utf-8")
  );

  // Count before
  const { count: seriesBefore } = await db
    .from("series")
    .select("id", { count: "exact", head: true });
  const { count: lessonsBefore } = await db
    .from("lessons")
    .select("id", { count: "exact", head: true });

  console.log(`BEFORE: ${seriesBefore} series, ${lessonsBefore} lessons`);
  console.log("\nProcessing teacher aids tree...\n");

  // Create root "מאגר עזרי הלמידה" series if not exists
  const rootId = await findOrCreateSeries("מאגר עזרי הלמידה", null, ["teachers"]);
  console.log(`Root series ID: ${rootId}\n`);

  // Process the tree (the scraped root children are the top-level sections)
  const { newSeries, newLessons, skipped } = await processTree(
    scrapeData.tree,
    rootId
  );

  await updateLessonCounts();

  // Count after
  const { count: seriesAfter } = await db
    .from("series")
    .select("id", { count: "exact", head: true });
  const { count: lessonsAfter } = await db
    .from("lessons")
    .select("id", { count: "exact", head: true });

  console.log(`\n=== RESULTS ===`);
  console.log(`BEFORE: ${seriesBefore} series, ${lessonsBefore} lessons`);
  console.log(`AFTER:  ${seriesAfter} series, ${lessonsAfter} lessons`);
  console.log(`NEW series: +${(seriesAfter || 0) - (seriesBefore || 0)}`);
  console.log(`NEW lessons: +${(lessonsAfter || 0) - (lessonsBefore || 0)}`);
  console.log(`Skipped nodes: ${skipped}`);
  console.log(`Dry run: ${DRY_RUN}`);

  // Save a report
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    before: { series: seriesBefore, lessons: lessonsBefore },
    after: { series: seriesAfter, lessons: lessonsAfter },
    newSeries: (seriesAfter || 0) - (seriesBefore || 0),
    newLessons: (lessonsAfter || 0) - (lessonsBefore || 0),
    skipped,
  };
  writeFileSync("scripts/teachers-insert-report.json", JSON.stringify(report, null, 2));
  console.log("\nReport saved to scripts/teachers-insert-report.json");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
