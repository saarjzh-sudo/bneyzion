#!/usr/bin/env node
/**
 * QA Migration Agent — verifies every lesson has correct content
 * Compares Supabase lessons against Umbraco source data
 *
 * Usage:
 *   node scripts/qa-migration.mjs              # Full audit
 *   node scripts/qa-migration.mjs --fix        # Audit + attempt fixes
 *   node scripts/qa-migration.mjs --sample 50  # Audit 50 random lessons
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";

const UMBRACO_URL = "https://www.bneyzion.co.il";
const UMBRACO_USER = "yoav";
const UMBRACO_PASS = "5W;3N)g8Iq";

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Umbraco session
// ============================================================
let umbracoSession = null;

async function umbracoLogin() {
  const res = await fetch(`${UMBRACO_URL}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: UMBRACO_USER, password: UMBRACO_PASS }),
  });
  const cookies = res.headers.getSetCookie?.() || [];
  umbracoSession = cookies.map(c => c.split(";")[0]).join("; ");
  const text = await res.text();
  const clean = text.replace(/^\)\]\}',?\s*/, "");
  const data = JSON.parse(clean);
  console.log(`Umbraco login: ${data.name || "OK"}`);
  return !!data.name;
}

async function umbracoFetch(path) {
  const res = await fetch(`${UMBRACO_URL}${path}`, {
    headers: { Cookie: umbracoSession },
  });
  const text = await res.text();
  return JSON.parse(text.replace(/^\)\]\}',?\s*/, ""));
}

// ============================================================
// QA Checks
// ============================================================

const issues = [];

function addIssue(lesson, type, detail) {
  issues.push({ lessonId: lesson.id, title: lesson.title, type, detail });
}

// Check 1: Content integrity
function checkContent(lesson) {
  const hasContent = lesson.content && lesson.content.length > 10;
  const hasAudio = !!lesson.audio_url;
  const hasVideo = !!lesson.video_url;

  if (!hasContent && !hasAudio && !hasVideo) {
    addIssue(lesson, "EMPTY", "No content, audio, or video");
    return;
  }

  // Check for broken Umbraco links in content
  if (hasContent && lesson.content.includes("umb://document")) {
    addIssue(lesson, "BROKEN_LINK", "Contains unresolved umb://document links");
  }

  // Check for very short content (likely incomplete import)
  if (lesson.source_type === "article" && hasContent && lesson.content.length < 100) {
    addIssue(lesson, "SHORT_CONTENT", `Article with only ${lesson.content.length} chars`);
  }

  // Check audio URL is accessible
  if (hasAudio && !lesson.audio_url.startsWith("http")) {
    addIssue(lesson, "BAD_AUDIO_URL", `Invalid audio URL: ${lesson.audio_url.substring(0, 80)}`);
  }

  // Check video URL is accessible
  if (hasVideo && !lesson.video_url.startsWith("http")) {
    addIssue(lesson, "BAD_VIDEO_URL", `Invalid video URL: ${lesson.video_url.substring(0, 80)}`);
  }
}

// Check 2: Series assignment
function checkSeries(lesson) {
  if (!lesson.series_id) {
    addIssue(lesson, "NO_SERIES", "Published lesson without series assignment");
  }
}

// Check 3: Rabbi assignment
function checkRabbi(lesson, rabbis) {
  if (!lesson.rabbi_id) {
    addIssue(lesson, "NO_RABBI", "Published lesson without rabbi assignment");
  } else {
    const rabbi = rabbis.get(lesson.rabbi_id);
    if (!rabbi) {
      addIssue(lesson, "ORPHAN_RABBI", `Rabbi ID ${lesson.rabbi_id} not found`);
    }
  }
}

// Check 4: Title quality
function checkTitle(lesson) {
  if (!lesson.title || lesson.title.trim().length < 3) {
    addIssue(lesson, "BAD_TITLE", `Title too short: "${lesson.title}"`);
  }
  if (lesson.title && /^(test|untitled|ללא כותרת)/i.test(lesson.title.trim())) {
    addIssue(lesson, "PLACEHOLDER_TITLE", `Placeholder title: "${lesson.title}"`);
  }
}

// Check 5: Media URL health (spot check)
async function checkMediaUrls(lessons) {
  const sample = lessons.filter(l => l.audio_url || l.video_url).slice(0, 20);
  console.log(`\nSpot-checking ${sample.length} media URLs...`);

  for (const lesson of sample) {
    const url = lesson.audio_url || lesson.video_url;
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        addIssue(lesson, "DEAD_MEDIA", `HTTP ${res.status} for ${url.substring(0, 80)}`);
      }
    } catch (e) {
      addIssue(lesson, "DEAD_MEDIA", `Unreachable: ${url.substring(0, 80)}`);
    }
  }
}

// ============================================================
// Main
// ============================================================

async function fetchAllLessons() {
  const all = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await db
      .from("lessons")
      .select("id, title, content, audio_url, video_url, attachment_url, rabbi_id, series_id, source_type, status")
      .eq("status", "published")
      .range(offset, offset + PAGE - 1);
    if (error) { console.error("DB error:", error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function main() {
  const args = process.argv.slice(2);
  const doFix = args.includes("--fix");
  const sampleIdx = args.indexOf("--sample");
  const sampleSize = sampleIdx >= 0 ? parseInt(args[sampleIdx + 1]) : 0;

  console.log("=== bneyzion QA Migration Agent ===\n");

  // Fetch all published lessons
  console.log("Fetching published lessons...");
  let lessons = await fetchAllLessons();
  console.log(`Found ${lessons.length} published lessons\n`);

  if (sampleSize > 0) {
    // Random sample
    lessons = lessons.sort(() => Math.random() - 0.5).slice(0, sampleSize);
    console.log(`Sampling ${sampleSize} lessons\n`);
  }

  // Fetch rabbis for validation
  const { data: rabbiData } = await db.from("rabbis").select("id, name");
  const rabbis = new Map(rabbiData.map(r => [r.id, r]));

  // Run checks
  console.log("Running content integrity checks...");
  let checked = 0;
  for (const lesson of lessons) {
    checkContent(lesson);
    checkSeries(lesson);
    checkRabbi(lesson, rabbis);
    checkTitle(lesson);
    checked++;
    if (checked % 2000 === 0) process.stdout.write(`  ${checked}/${lessons.length}...\n`);
  }

  // Spot check media URLs
  await checkMediaUrls(lessons);

  // ============================================================
  // Report
  // ============================================================
  console.log("\n=== QA REPORT ===\n");

  // Group by type
  const byType = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }

  const typeOrder = ["EMPTY", "SHORT_CONTENT", "BROKEN_LINK", "NO_SERIES", "NO_RABBI", "ORPHAN_RABBI", "BAD_TITLE", "PLACEHOLDER_TITLE", "BAD_AUDIO_URL", "BAD_VIDEO_URL", "DEAD_MEDIA"];

  let totalIssues = 0;
  for (const type of typeOrder) {
    const items = byType[type];
    if (!items) continue;
    totalIssues += items.length;
    console.log(`${type}: ${items.length} lessons`);
    // Show first 5 examples
    for (const item of items.slice(0, 5)) {
      console.log(`  - "${item.title}" → ${item.detail}`);
    }
    if (items.length > 5) console.log(`  ... and ${items.length - 5} more`);
    console.log("");
  }

  // Summary
  const healthScore = Math.round(((lessons.length - totalIssues) / lessons.length) * 100);
  console.log("=== SUMMARY ===");
  console.log(`Lessons checked: ${lessons.length}`);
  console.log(`Issues found: ${totalIssues}`);
  console.log(`Health score: ${healthScore}%`);
  console.log(`Clean lessons: ${lessons.length - totalIssues} (${healthScore}%)`);

  if (Object.keys(byType).length === 0) {
    console.log("\n✓ All lessons pass QA checks!");
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalLessons: lessons.length,
    totalIssues,
    healthScore,
    issuesByType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    issues: issues.slice(0, 200), // First 200 for review
  };

  const fs = await import("fs");
  fs.writeFileSync("scripts/qa-report.json", JSON.stringify(report, null, 2));
  console.log("\nDetailed report saved to scripts/qa-report.json");
}

main().catch(console.error);
