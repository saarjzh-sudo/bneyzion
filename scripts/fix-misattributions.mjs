#!/usr/bin/env node
/**
 * Fix media misattributions
 * Iterates ALL published lessons with media, compares with scrape map,
 * and CORRECTS any URL that doesn't match (using old site as ground truth).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const db = createClient(DB_URL, DB_KEY);

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

async function main() {
  // Load media map
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
  console.log(`Loaded media map: ${mediaMap.size} unique titles`);

  // Get ALL published lessons
  const allLessons = [];
  let offset = 0;
  while (true) {
    const { data } = await db
      .from("lessons")
      .select("id, title, audio_url, video_url, attachment_url")
      .eq("status", "published")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allLessons.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Loaded ${allLessons.length} published lessons`);

  let audioFixed = 0, videoFixed = 0, pdfFixed = 0;
  const fixLog = [];

  for (const lesson of allLessons) {
    const key = normalize(lesson.title);
    const truth = mediaMap.get(key);
    if (!truth) continue;

    const updates = {};

    // AUDIO: if we have one, check it matches; if old site has one and we don't, add it
    if (truth.audioUrl) {
      const ours = lesson.audio_url ? lesson.audio_url.split("/").pop() : null;
      const theirs = truth.audioUrl.split("/").pop();
      if (ours !== theirs) {
        updates.audio_url = truth.audioUrl;
      }
    }

    // VIDEO: same logic
    if (truth.videoUrl) {
      const ours = lesson.video_url ? lesson.video_url.split("/").pop() : null;
      const theirs = truth.videoUrl.split("/").pop();
      if (ours !== theirs) {
        updates.video_url = truth.videoUrl;
      }
    }

    // PDF: same logic
    if (truth.pdfUrl) {
      const ours = lesson.attachment_url ? lesson.attachment_url.split("/").pop() : null;
      const theirs = truth.pdfUrl.split("/").pop();
      if (ours !== theirs) {
        updates.attachment_url = truth.pdfUrl;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    const wasMismatch = {
      hadOldAudio: !!lesson.audio_url,
      hadOldVideo: !!lesson.video_url,
      hadOldPdf: !!lesson.attachment_url,
    };

    const { error } = await db.from("lessons").update(updates).eq("id", lesson.id);
    if (!error) {
      if (updates.audio_url) audioFixed++;
      if (updates.video_url) videoFixed++;
      if (updates.attachment_url) pdfFixed++;
      fixLog.push({
        id: lesson.id,
        title: lesson.title,
        was: wasMismatch,
        oldAudioFile: lesson.audio_url?.split("/").pop(),
        newAudioFile: updates.audio_url?.split("/").pop(),
        oldVideoFile: lesson.video_url?.split("/").pop(),
        newVideoFile: updates.video_url?.split("/").pop(),
      });
    }
  }

  console.log("\n=== FIXES APPLIED ===");
  console.log(`Audio URLs corrected: ${audioFixed}`);
  console.log(`Video URLs corrected: ${videoFixed}`);
  console.log(`PDF URLs corrected: ${pdfFixed}`);
  console.log(`Total updates: ${fixLog.length}`);

  writeFileSync("scripts/misattribution-fixes.json", JSON.stringify(fixLog, null, 2));
  console.log(`Log saved to scripts/misattribution-fixes.json`);
}

main().catch(console.error);
