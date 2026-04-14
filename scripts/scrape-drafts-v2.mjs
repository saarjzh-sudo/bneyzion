#!/usr/bin/env node
/**
 * V2: Scrape drafts and extract vp4.me iframes as video URLs
 * Also handles inline lesson pages (not just lessonBlock containers)
 */

import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { readFileSync, writeFileSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const OLD_SITE = "https://www.bneyzion.co.il";
const db = createClient(DB_URL, DB_KEY);

const normalize = (s) =>
  (s || "").trim().replace(/''/g, '"').replace(/["״״'`ʼ]/g, '"').replace(/["']/g, '"')
    .replace(/\s+/g, " ").replace(/\u200f|\u200e|\u00a0/g, "").toLowerCase().trim();

async function scrapePage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const html = await res.text();
    const $ = load(html);

    let audioUrl = null, videoUrl = null, pdfUrl = null;

    // STRATEGY 1: Direct media URLs anywhere on page
    $('a[href]').each((i, a) => {
      const href = $(a).attr('href') || '';
      if (!audioUrl && href.match(/\.mp3(\?|$)/i) && href.includes('s3')) audioUrl = href;
      if (!videoUrl && href.match(/\.mp4(\?|$)/i) && href.includes('s3')) videoUrl = href;
      if (!pdfUrl && href.match(/\.pdf(\?|$)/i)) pdfUrl = href;
    });

    // STRATEGY 2: vp4.me iframe = video URL
    if (!videoUrl) {
      const vp4 = $('iframe[src*="vp4.me"]').first().attr('src');
      if (vp4) videoUrl = vp4;
    }

    // STRATEGY 3: YouTube iframe
    if (!videoUrl) {
      $('iframe[src*="youtube"]').each((i, el) => {
        const src = $(el).attr('src') || '';
        const m = src.match(/(?:embed\/|v=)([a-zA-Z0-9_-]+)/);
        if (m && !videoUrl) videoUrl = `https://www.youtube.com/watch?v=${m[1]}`;
      });
    }

    // STRATEGY 4: <audio>/<video> tags with source
    if (!audioUrl) {
      $('audio source, audio').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (src.match(/\.mp3/i) && !audioUrl) audioUrl = src;
      });
    }
    if (!videoUrl) {
      $('video source, video').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (src.match(/\.mp4/i) && !videoUrl) videoUrl = src;
      });
    }

    return { audioUrl, videoUrl, pdfUrl };
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  const investigation = JSON.parse(readFileSync("scripts/draft-investigation.json", "utf-8"));
  const drafts = investigation.exists_in_umbraco;
  console.log(`Drafts to scrape: ${drafts.length}\n`);

  let enriched = 0;
  let videoIframe = 0, audioFound = 0, pdfFound = 0;
  const log = [];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i];
    const url = `${OLD_SITE}${encodeURI(draft.umbUrl).replace(/'/g, "%27")}`;
    const media = await scrapePage(url);

    if (media.error) {
      log.push({ id: draft.id, title: draft.title, status: media.error });
      continue;
    }

    if (!media.audioUrl && !media.videoUrl && !media.pdfUrl) {
      log.push({ id: draft.id, title: draft.title, status: "no_media" });
      continue;
    }

    const updates = { status: "published" };
    if (media.audioUrl) { updates.audio_url = media.audioUrl; audioFound++; }
    if (media.videoUrl) {
      updates.video_url = media.videoUrl;
      if (media.videoUrl.includes('vp4.me')) videoIframe++;
    }
    if (media.pdfUrl) { updates.attachment_url = media.pdfUrl; pdfFound++; }

    if (media.videoUrl) updates.source_type = "video";
    else if (media.audioUrl) updates.source_type = "audio";

    const { error } = await db.from("lessons").update(updates).eq("id", draft.id);
    if (!error) {
      enriched++;
      log.push({
        id: draft.id, title: draft.title, status: "enriched",
        audio: !!media.audioUrl, video: !!media.videoUrl,
        videoType: media.videoUrl?.includes('vp4.me') ? 'vp4.me' :
                   media.videoUrl?.includes('youtube') ? 'youtube' :
                   media.videoUrl ? 'mp4' : null,
        pdf: !!media.pdfUrl,
      });
    }

    if ((i + 1) % 10 === 0) {
      console.log(`  Progress: ${i+1}/${drafts.length}, enriched ${enriched}`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Enriched: ${enriched}/${drafts.length}`);
  console.log(`  with audio: ${audioFound}`);
  console.log(`  with video (any): ${videoIframe + (enriched - videoIframe)}`);
  console.log(`  with vp4.me video: ${videoIframe}`);
  console.log(`  with PDF: ${pdfFound}`);

  writeFileSync("scripts/draft-scrape-v2-log.json", JSON.stringify(log, null, 2));
}

main().catch(console.error);
