#!/usr/bin/env node
/**
 * Content Accuracy Audit
 * Samples random published lessons with media and verifies the media URL
 * actually belongs to that lesson on the old site (not a sibling).
 */

import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { writeFileSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const OLD_SITE = "https://www.bneyzion.co.il";
const db = createClient(DB_URL, DB_KEY);

const SAMPLE_SIZE = parseInt(process.argv[2] || "100");

const normalize = (s) =>
  (s || "")
    .trim()
    .replace(/''/g, '"')
    .replace(/``/g, '"')
    .replace(/["״״'`ʼ]/g, '"')
    .replace(/["']/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\u200f|\u200e|\u00a0/g, "")
    .toLowerCase()
    .trim();

async function scrapeLessonPage(lessonTitle) {
  // Build search URL with the title encoded
  const slug = lessonTitle
    .replace(/[""״'`ʼ]/g, "")
    .replace(/['"']/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");

  // Try common path patterns
  const searchCandidates = [
    `${OLD_SITE}/מאגר-השיעורים-והמאמרים/תורה/בראשית/`,
    `${OLD_SITE}/מאגר-השיעורים-והמאמרים/תורה/שמות/`,
    `${OLD_SITE}/מאגר-השיעורים-והמאמרים/תורה/ויקרא/`,
    `${OLD_SITE}/מאגר-השיעורים-והמאמרים/תורה/במדבר/`,
    `${OLD_SITE}/מאגר-השיעורים-והמאמרים/תורה/דברים/`,
  ];

  // Can't easily search — instead we rely on the media map
  return null;
}

async function main() {
  console.log(`=== Content Accuracy Audit — ${SAMPLE_SIZE} lessons ===\n`);

  // Load cached media map from scrapes
  const { readFileSync, existsSync } = await import("fs");
  const mediaMap = new Map();
  for (let i = 0; i < 10; i++) {
    const p = `scripts/media-map-w${i}.json`;
    if (existsSync(p)) {
      const entries = JSON.parse(readFileSync(p, "utf-8"));
      for (const e of entries) {
        const key = normalize(e.title);
        if (!mediaMap.has(key)) mediaMap.set(key, e);
      }
    }
  }
  console.log(`Loaded media map: ${mediaMap.size} unique titles\n`);

  // Get FULL list of published lessons WITH media (paginated to bypass 1000-row limit)
  const allWithMedia = [];
  let pageOffset = 0;
  while (true) {
    const { data } = await db
      .from("lessons")
      .select("id, title, source_type, audio_url, video_url, attachment_url, rabbi_id")
      .eq("status", "published")
      .or("audio_url.not.is.null,video_url.not.is.null,attachment_url.not.is.null")
      .range(pageOffset, pageOffset + 999);
    if (!data || data.length === 0) break;
    allWithMedia.push(...data);
    if (data.length < 1000) break;
    pageOffset += 1000;
  }

  console.log(`Total published with media: ${allWithMedia.length}`);

  // Shuffle and take sample
  const shuffled = (allWithMedia || []).sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, SAMPLE_SIZE);

  const results = {
    total: sample.length,
    perfect_match: 0,
    title_not_in_scrape: 0,
    audio_mismatch: 0,
    video_mismatch: 0,
    audio_only_in_supabase: 0,
    video_only_in_supabase: 0,
    extra_media_on_old_site: 0,
    mismatches: [],
  };

  for (const lesson of sample) {
    const key = normalize(lesson.title);
    const oldSite = mediaMap.get(key);

    if (!oldSite) {
      results.title_not_in_scrape++;
      continue;
    }

    const issues = [];

    // Check audio
    if (lesson.audio_url && oldSite.audioUrl) {
      // Compare filenames (URLs may differ in encoding)
      const ours = lesson.audio_url.split("/").pop();
      const theirs = oldSite.audioUrl.split("/").pop();
      if (ours !== theirs) {
        issues.push(`AUDIO_MISMATCH: ours=${ours?.substring(0, 40)} vs theirs=${theirs?.substring(0, 40)}`);
        results.audio_mismatch++;
      }
    } else if (lesson.audio_url && !oldSite.audioUrl) {
      issues.push(`AUDIO_ONLY_SUPABASE: we have audio, old site doesn't`);
      results.audio_only_in_supabase++;
    } else if (!lesson.audio_url && oldSite.audioUrl) {
      issues.push(`MISSING_AUDIO: old site has ${oldSite.audioUrl.split("/").pop()}`);
      results.extra_media_on_old_site++;
    }

    // Check video
    if (lesson.video_url && oldSite.videoUrl) {
      const ours = lesson.video_url.split("/").pop();
      const theirs = oldSite.videoUrl.split("/").pop();
      if (ours !== theirs) {
        issues.push(`VIDEO_MISMATCH: ours=${ours?.substring(0, 40)} vs theirs=${theirs?.substring(0, 40)}`);
        results.video_mismatch++;
      }
    } else if (lesson.video_url && !oldSite.videoUrl) {
      issues.push(`VIDEO_ONLY_SUPABASE: we have video, old site doesn't`);
      results.video_only_in_supabase++;
    } else if (!lesson.video_url && oldSite.videoUrl) {
      issues.push(`MISSING_VIDEO: old site has ${oldSite.videoUrl.split("/").pop()}`);
      results.extra_media_on_old_site++;
    }

    if (issues.length === 0) {
      results.perfect_match++;
    } else {
      results.mismatches.push({
        id: lesson.id,
        title: lesson.title,
        issues,
      });
    }
  }

  console.log("\n=== AUDIT RESULTS ===\n");
  console.log(`Sample size: ${results.total}`);
  console.log(`Perfect match: ${results.perfect_match} (${Math.round((results.perfect_match / results.total) * 100)}%)`);
  console.log(`Title not found in scrape map: ${results.title_not_in_scrape}`);
  console.log(`Audio filename mismatch: ${results.audio_mismatch}`);
  console.log(`Video filename mismatch: ${results.video_mismatch}`);
  console.log(`Audio only in our DB (old site lacks): ${results.audio_only_in_supabase}`);
  console.log(`Video only in our DB (old site lacks): ${results.video_only_in_supabase}`);
  console.log(`Extra media available on old site we missed: ${results.extra_media_on_old_site}`);

  if (results.mismatches.length > 0) {
    console.log(`\n=== First 10 mismatches (for review) ===`);
    for (const m of results.mismatches.slice(0, 10)) {
      console.log(`\n${m.title.substring(0, 70)} (${m.id})`);
      for (const i of m.issues) console.log(`  • ${i}`);
    }
  }

  writeFileSync("scripts/audit-report.json", JSON.stringify(results, null, 2));
  console.log(`\nFull audit saved to scripts/audit-report.json`);
}

main().catch(console.error);
