#!/usr/bin/env node
/**
 * Scrape the 73 drafts that have known Umbraco URLs
 * Use cheerio to extract media from each lesson's own page
 */

import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { readFileSync, writeFileSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const OLD_SITE = "https://www.bneyzion.co.il";
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

async function scrapePage(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "BneyZionMigrationBot/3.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = load(html);

    // Find the SPECIFIC lesson block matching our title (or first lesson on page)
    // For an individual lesson page, the .lessonBlock with matching href is the target
    const blocks = [];
    $(".lessonBlock").each((i, block) => {
      const $block = $(block);
      const title = $block.find("h3 a").first().attr("title") ||
                    $block.find("h3 a").first().text().trim();

      let audioUrl = null, videoUrl = null, pdfUrl = null;
      $block.find(".lessonLinks a").each((j, a) => {
        const href = $(a).attr("href") || "";
        if (href.match(/\.mp3(\?|$)/i)) audioUrl = audioUrl || href;
        if (href.match(/\.(mp4|webm|mov)(\?|$)/i)) videoUrl = videoUrl || href;
        if (href.match(/\.pdf(\?|$)/i)) pdfUrl = pdfUrl || href;
      });

      // Also check for HTML5 video/audio elements directly on page
      $block.find("audio source, audio").each((j, el) => {
        const src = $(el).attr("src") || "";
        if (src.match(/\.mp3/i) && !audioUrl) audioUrl = src;
      });
      $block.find("video source, video").each((j, el) => {
        const src = $(el).attr("src") || "";
        if (src.match(/\.mp4/i) && !videoUrl) videoUrl = src;
      });

      blocks.push({ title, audioUrl, videoUrl, pdfUrl });
    });

    // ALSO check for media outside .lessonBlock (some lesson pages have it inline)
    let pageAudio = null, pageVideo = null, pagePdf = null;
    $('a[href*=".mp3"], a[href*=".mp4"], a[href*=".pdf"]').each((i, a) => {
      const href = $(a).attr("href") || "";
      if (href.match(/\.mp3(\?|$)/i) && !pageAudio) pageAudio = href;
      if (href.match(/\.mp4(\?|$)/i) && !pageVideo) pageVideo = href;
      if (href.match(/\.pdf(\?|$)/i) && !pagePdf) pagePdf = href;
    });

    return { blocks, pageAudio, pageVideo, pagePdf };
  } catch (e) {
    return null;
  }
}

async function main() {
  const investigation = JSON.parse(readFileSync("scripts/draft-investigation.json", "utf-8"));
  const drafts = investigation.exists_in_umbraco;
  console.log(`Drafts to investigate: ${drafts.length}\n`);

  let enriched = 0;
  let scraped = 0;
  const log = [];

  for (const draft of drafts) {
    scraped++;
    const url = `${OLD_SITE}${encodeURI(draft.umbUrl).replace(/'/g, "%27")}`;

    const result = await scrapePage(url);
    if (!result) {
      log.push({ id: draft.id, title: draft.title, status: "404_or_error", url });
      continue;
    }

    // Try to find matching block
    const targetKey = normalize(draft.title);
    let bestMatch = result.blocks.find((b) => normalize(b.title) === targetKey);

    // If no exact match, take first block on page (lesson page often shows itself first)
    if (!bestMatch && result.blocks.length > 0) {
      bestMatch = result.blocks[0];
    }

    let audio = bestMatch?.audioUrl || result.pageAudio;
    let video = bestMatch?.videoUrl || result.pageVideo;
    let pdf = bestMatch?.pdfUrl || result.pagePdf;

    if (!audio && !video && !pdf) {
      log.push({ id: draft.id, title: draft.title, status: "no_media_on_page", url });
      continue;
    }

    const updates = {};
    if (audio) updates.audio_url = audio;
    if (video) updates.video_url = video;
    if (pdf) updates.attachment_url = pdf;
    if (video) updates.source_type = "video";
    else if (audio) updates.source_type = "audio";
    updates.status = "published";

    const { error } = await db.from("lessons").update(updates).eq("id", draft.id);
    if (!error) {
      enriched++;
      log.push({
        id: draft.id,
        title: draft.title,
        status: "enriched",
        updates: { audio: !!audio, video: !!video, pdf: !!pdf },
      });
    }

    if (scraped % 10 === 0) {
      console.log(`  Scraped ${scraped}/${drafts.length}, enriched ${enriched}`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Scraped: ${scraped}`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${scraped - enriched}`);

  writeFileSync("scripts/draft-scrape-log.json", JSON.stringify(log, null, 2));
}

main().catch(console.error);
