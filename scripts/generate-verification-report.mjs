#!/usr/bin/env node
/**
 * Final verification report after row-level scrape
 * Merges all worker logs and produces a comprehensive audit
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const db = createClient(DB_URL, DB_KEY);

async function count(filter) {
  const q = db.from("lessons").select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filter)) {
    if (v === null) q.is(k, null);
    else if (v === '!null') q.not(k, 'is', null);
    else q.eq(k, v);
  }
  const { count } = await q;
  return count || 0;
}

async function main() {
  console.log("=== Generating Verification Report ===\n");

  // Merge all worker logs
  let totalEnriched = 0;
  const allUpdates = [];
  for (let i = 0; i < 10; i++) {
    const path = `scripts/row-scrape-log-w${i}.json`;
    if (existsSync(path)) {
      const log = JSON.parse(readFileSync(path, 'utf-8'));
      totalEnriched += log.length;
      allUpdates.push(...log);
    }
  }

  // Merge media maps
  const mediaMap = new Map();
  for (let i = 0; i < 10; i++) {
    const path = `scripts/media-map-w${i}.json`;
    if (existsSync(path)) {
      const entries = JSON.parse(readFileSync(path, 'utf-8'));
      for (const e of entries) {
        if (!mediaMap.has(e.key)) mediaMap.set(e.key, e);
      }
    }
  }
  console.log(`Unique titles found on old site: ${mediaMap.size}`);
  console.log(`Total DB updates applied: ${totalEnriched}\n`);

  // Current DB stats
  const total = await count({});
  const published = await count({ status: 'published' });
  const draft = await count({ status: 'draft' });
  const withAudio = await count({ status: 'published', audio_url: '!null' });
  const withVideo = await count({ status: 'published', video_url: '!null' });
  const withAttachment = await count({ status: 'published', attachment_url: '!null' });

  const { data: sample } = await db
    .from('lessons')
    .select('id, title, status, audio_url, video_url, attachment_url, content')
    .eq('status', 'published')
    .is('audio_url', null)
    .is('video_url', null)
    .is('attachment_url', null)
    .is('content', null)
    .limit(20);

  // Recalculate lesson_count
  console.log("Recalculating lesson_count for all series...");
  const { data: allSeries } = await db.from('series').select('id');
  for (const s of allSeries || []) {
    const { count } = await db.from('lessons').select('*', { count: 'exact', head: true })
      .eq('series_id', s.id).eq('status', 'published');
    await db.from('series').update({ lesson_count: count || 0 }).eq('id', s.id);
  }
  console.log(`Series updated: ${allSeries?.length || 0}`);

  const { data: allRabbis } = await db.from('rabbis').select('id');
  for (const r of allRabbis || []) {
    const { count } = await db.from('lessons').select('*', { count: 'exact', head: true })
      .eq('rabbi_id', r.id).eq('status', 'published');
    await db.from('rabbis').update({ lesson_count: count || 0 }).eq('id', r.id);
  }
  console.log(`Rabbis updated: ${allRabbis?.length || 0}\n`);

  // Post-scrape stats
  const newPublished = await count({ status: 'published' });
  const newDraft = await count({ status: 'draft' });
  const newWithAudio = await count({ status: 'published', audio_url: '!null' });
  const newWithVideo = await count({ status: 'published', video_url: '!null' });
  const newWithAttachment = await count({ status: 'published', attachment_url: '!null' });

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      old_site_unique_titles: mediaMap.size,
      db_updates_applied: totalEnriched,
    },
    before_row_scrape: {
      total_lessons: total,
      published,
      draft,
      with_audio: withAudio,
      with_video: withVideo,
      with_attachment: withAttachment,
    },
    after_row_scrape: {
      published: newPublished,
      draft: newDraft,
      with_audio: newWithAudio,
      with_video: newWithVideo,
      with_attachment: newWithAttachment,
      delta_audio: newWithAudio - withAudio,
      delta_video: newWithVideo - withVideo,
      delta_attachment: newWithAttachment - withAttachment,
    },
    breakdown_of_updates: {
      audio_added: allUpdates.filter(u => u.updates.audio_url).length,
      video_added: allUpdates.filter(u => u.updates.video_url).length,
      pdf_added: allUpdates.filter(u => u.updates.attachment_url).length,
      republished_from_draft: allUpdates.filter(u => u.updates.status === 'published').length,
      source_type_corrected: allUpdates.filter(u => u.updates.source_type).length,
    },
    still_empty_sample: (sample || []).map(s => ({
      id: s.id,
      title: s.title.substring(0, 60),
    })),
  };

  writeFileSync('scripts/verification-report.json', JSON.stringify(report, null, 2));

  console.log("=== SUMMARY ===");
  console.log(JSON.stringify(report.summary, null, 2));
  console.log("\nBEFORE:", JSON.stringify(report.before_row_scrape, null, 2));
  console.log("\nAFTER:", JSON.stringify(report.after_row_scrape, null, 2));
  console.log("\nBREAKDOWN:", JSON.stringify(report.breakdown_of_updates, null, 2));
  console.log("\nReport saved to scripts/verification-report.json");
}

main().catch(console.error);
