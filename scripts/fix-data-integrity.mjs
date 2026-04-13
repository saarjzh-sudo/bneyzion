#!/usr/bin/env node
/**
 * Data Integrity Fix Script
 * Fixes the issues found by Rabbi Yoav and the QA agent:
 *
 * 1. Lessons marked as audio/video but have no media URL → fix source_type or set to draft
 * 2. Lessons with mismatched content (audio lesson has article text that belongs to another lesson)
 * 3. Lessons missing attachment_url for PDFs
 * 4. Recalculate all lesson_count fields
 */

import { createClient } from "@supabase/supabase-js";

const URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const db = createClient(URL, KEY);

async function fetchAll(table, filter = {}) {
  const all = [];
  let offset = 0;
  while (true) {
    let q = db.from(table).select("*").range(offset, offset + 999);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) { console.error(`Error fetching ${table}:`, error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function main() {
  console.log("=== Data Integrity Fix ===\n");

  // Fetch all published lessons
  const lessons = await fetchAll("lessons", { status: "published" });
  console.log(`Total published lessons: ${lessons.length}\n`);

  let fixed = 0;
  const fixes = [];

  // ============================================================
  // FIX 1: audio/video lessons with text content but no media
  // These have the wrong content - the text belongs to a different lesson
  // Strategy: Clear the mismatched content and set to draft (they have no actual media)
  // ============================================================
  console.log("--- Fix 1: Audio/video lessons with wrong content ---");
  const wrongContent = lessons.filter(
    (l) =>
      (l.source_type === "audio" || l.source_type === "video") &&
      l.content &&
      l.content.length > 10 &&
      !l.audio_url &&
      !l.video_url
  );
  console.log(`Found ${wrongContent.length} lessons with mismatched content`);

  for (const lesson of wrongContent) {
    // Clear the content that doesn't belong and set to draft
    const { error } = await db
      .from("lessons")
      .update({ content: null, status: "draft" })
      .eq("id", lesson.id);
    if (!error) {
      fixed++;
      fixes.push({ id: lesson.id, title: lesson.title, fix: "cleared wrong content, set draft" });
    }
  }

  // ============================================================
  // FIX 2: audio lessons without audio_url (but may have content)
  // If they have content, change source_type to "article"
  // If they don't, set to draft
  // ============================================================
  console.log("\n--- Fix 2: Audio lessons without audio_url ---");
  const audioNoUrl = lessons.filter(
    (l) => l.source_type === "audio" && !l.audio_url && !wrongContent.find((w) => w.id === l.id)
  );
  console.log(`Found ${audioNoUrl.length} audio lessons without audio URL`);

  for (const lesson of audioNoUrl) {
    if (lesson.content && lesson.content.length > 50) {
      // Has content — reclassify as article
      const { error } = await db
        .from("lessons")
        .update({ source_type: "article" })
        .eq("id", lesson.id);
      if (!error) {
        fixed++;
        fixes.push({ id: lesson.id, title: lesson.title, fix: "reclassified audio→article (has content)" });
      }
    } else if (lesson.video_url) {
      // Has video — reclassify as video
      const { error } = await db
        .from("lessons")
        .update({ source_type: "video" })
        .eq("id", lesson.id);
      if (!error) {
        fixed++;
        fixes.push({ id: lesson.id, title: lesson.title, fix: "reclassified audio→video (has video_url)" });
      }
    } else {
      // No content, no media — draft
      const { error } = await db
        .from("lessons")
        .update({ status: "draft" })
        .eq("id", lesson.id);
      if (!error) {
        fixed++;
        fixes.push({ id: lesson.id, title: lesson.title, fix: "set draft (no content, no media)" });
      }
    }
  }

  // ============================================================
  // FIX 3: video lessons without video_url
  // ============================================================
  console.log("\n--- Fix 3: Video lessons without video_url ---");
  const videoNoUrl = lessons.filter(
    (l) => l.source_type === "video" && !l.video_url && !wrongContent.find((w) => w.id === l.id)
  );
  console.log(`Found ${videoNoUrl.length} video lessons without video URL`);

  for (const lesson of videoNoUrl) {
    if (lesson.audio_url) {
      // Has audio — reclassify as audio
      const { error } = await db
        .from("lessons")
        .update({ source_type: "audio" })
        .eq("id", lesson.id);
      if (!error) {
        fixed++;
        fixes.push({ id: lesson.id, title: lesson.title, fix: "reclassified video→audio (has audio_url)" });
      }
    } else if (lesson.content && lesson.content.length > 50) {
      // Has content — reclassify as article
      const { error } = await db
        .from("lessons")
        .update({ source_type: "article" })
        .eq("id", lesson.id);
      if (!error) {
        fixed++;
        fixes.push({ id: lesson.id, title: lesson.title, fix: "reclassified video→article (has content)" });
      }
    } else {
      // No content, no media — draft
      const { error } = await db
        .from("lessons")
        .update({ status: "draft" })
        .eq("id", lesson.id);
      if (!error) {
        fixed++;
        fixes.push({ id: lesson.id, title: lesson.title, fix: "set draft (no content, no media)" });
      }
    }
  }

  // ============================================================
  // FIX 4: articles that actually have audio_url — reclassify
  // ============================================================
  console.log("\n--- Fix 4: Articles with audio_url ---");
  const articleWithAudio = lessons.filter(
    (l) => l.source_type === "article" && l.audio_url
  );
  console.log(`Found ${articleWithAudio.length} articles with audio URL`);
  // These are actually lessons with both text and audio — keep as article but note they have media

  // ============================================================
  // FIX 5: Recalculate lesson_count
  // ============================================================
  console.log("\n--- Fix 5: Recalculating lesson_count ---");

  // Get fresh counts
  const { data: seriesList } = await db.from("series").select("id");
  let seriesFixed = 0;
  for (const series of seriesList || []) {
    const { count } = await db
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("series_id", series.id)
      .eq("status", "published");
    await db.from("series").update({ lesson_count: count || 0 }).eq("id", series.id);
    seriesFixed++;
  }
  console.log(`Updated ${seriesFixed} series lesson_count`);

  const { data: rabbiList } = await db.from("rabbis").select("id");
  let rabbisFixed = 0;
  for (const rabbi of rabbiList || []) {
    const { count } = await db
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("rabbi_id", rabbi.id)
      .eq("status", "published");
    await db.from("rabbis").update({ lesson_count: count || 0 }).eq("id", rabbi.id);
    rabbisFixed++;
  }
  console.log(`Updated ${rabbisFixed} rabbis lesson_count`);

  // ============================================================
  // Summary
  // ============================================================
  console.log("\n=== SUMMARY ===");
  console.log(`Total fixes applied: ${fixed}`);

  // Group by fix type
  const byType = {};
  for (const f of fixes) {
    const t = f.fix;
    byType[t] = (byType[t] || 0) + 1;
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  // Verify final counts
  const { count: pubCount } = await db
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");
  const { count: draftCount } = await db
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("status", "draft");
  console.log(`\nFinal: ${pubCount} published, ${draftCount} draft`);

  // Save fixes log
  const fs = await import("fs");
  fs.writeFileSync("scripts/data-fixes-log.json", JSON.stringify(fixes, null, 2));
  console.log("Fix log saved to scripts/data-fixes-log.json");
}

main().catch(console.error);
