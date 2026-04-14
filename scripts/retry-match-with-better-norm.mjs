#!/usr/bin/env node
/**
 * Retry matching with improved title normalization
 * Handles '' → " and other Hebrew quote variants
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const db = createClient(DB_URL, DB_KEY);

// Better normalization: collapse '' → " BEFORE other replacements
const normalize = (s) =>
  (s || "")
    .trim()
    .replace(/''/g, '"')      // Two apostrophes → single double-quote
    .replace(/``/g, '"')      // Two backticks → double-quote
    .replace(/["״״'`ʼ]/g, '"') // Hebrew gershayim + variants → "
    .replace(/["']/g, '"')    // Any remaining quote chars → "
    .replace(/\s+/g, " ")
    .replace(/\u200f|\u200e|\u00a0/g, "")
    .toLowerCase()
    .trim();

async function main() {
  // Load all media maps
  const mediaMap = new Map();
  for (let i = 0; i < 10; i++) {
    const p = `scripts/media-map-w${i}.json`;
    if (existsSync(p)) {
      const entries = JSON.parse(readFileSync(p, "utf-8"));
      for (const e of entries) {
        // Re-normalize key with better function
        const newKey = normalize(e.title);
        if (!mediaMap.has(newKey)) mediaMap.set(newKey, e);
      }
    }
  }
  console.log(`Re-normalized media map: ${mediaMap.size} unique titles`);

  // Load Supabase lessons
  const allLessons = [];
  let offset = 0;
  while (true) {
    const { data } = await db
      .from("lessons")
      .select("id, title, source_type, audio_url, video_url, attachment_url, rabbi_id, status")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allLessons.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Loaded ${allLessons.length} lessons from Supabase`);

  let matched = 0, enriched = 0;
  const enrichLog = [];

  for (const lesson of allLessons) {
    const key = normalize(lesson.title);
    const media = mediaMap.get(key);
    if (!media) continue;
    matched++;

    const updates = {};
    if (media.audioUrl && !lesson.audio_url) updates.audio_url = media.audioUrl;
    if (media.videoUrl && !lesson.video_url) updates.video_url = media.videoUrl;
    if (media.pdfUrl && !lesson.attachment_url) updates.attachment_url = media.pdfUrl;

    const hasVideo = !!(updates.video_url || lesson.video_url);
    const hasAudio = !!(updates.audio_url || lesson.audio_url);
    if (hasVideo && lesson.source_type !== "video" && lesson.source_type !== "article") {
      updates.source_type = "video";
    } else if (hasAudio && !hasVideo && lesson.source_type !== "audio" && lesson.source_type !== "article") {
      updates.source_type = "audio";
    }

    if (lesson.status === "draft" && (updates.audio_url || updates.video_url || updates.attachment_url)) {
      updates.status = "published";
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await db.from("lessons").update(updates).eq("id", lesson.id);
      if (!error) {
        enriched++;
        enrichLog.push({
          lessonId: lesson.id,
          title: lesson.title,
          updates,
        });
        if (enriched % 50 === 0) console.log(`  Enriched ${enriched}...`);
      }
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Titles matched: ${matched}`);
  console.log(`Lessons enriched: ${enriched}`);

  writeFileSync("scripts/retry-match-log.json", JSON.stringify(enrichLog, null, 2));
  console.log(`Log saved to scripts/retry-match-log.json`);
}

main().catch(console.error);
