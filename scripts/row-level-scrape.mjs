#!/usr/bin/env node
/**
 * Row-level scraper — CORRECT version
 * Parses each <div class="lessonBlock"> individually, extracts per-lesson media
 *
 * Usage: node scripts/row-level-scrape.mjs [start] [end] [workerId]
 */

import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { readFileSync, writeFileSync, existsSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const OLD_SITE = "https://www.bneyzion.co.il";
const db = createClient(DB_URL, DB_KEY);

const START = parseInt(process.argv[2] || "0");
const END = parseInt(process.argv[3] || "99999");
const WORKER_ID = process.argv[4] || "0";

// ============================================================
// Parse a single HTML page and extract ALL lessonBlocks
// ============================================================
function parseLessonBlocks(html) {
  const $ = load(html);
  const lessons = [];

  $('.lessonBlock').each((i, block) => {
    const $block = $(block);

    // Title from h3 > a
    const $titleLink = $block.find('h3 a').first();
    const title = $titleLink.attr('title') || $titleLink.text().trim();
    const urlPath = $titleLink.attr('href') || '';

    // Rabbi from .author > a
    const rabbiName = $block.find('.author a').first().text().trim();

    // Promo text
    const promo = $block.find('.lessonPromo').first().text().trim();

    // Media URLs from .lessonLinks > a
    let audioUrl = null, videoUrl = null, pdfUrl = null;

    $block.find('.lessonLinks a').each((j, a) => {
      const href = $(a).attr('href') || '';
      if (href.match(/\.mp3(\?|$)/i)) audioUrl = audioUrl || href;
      if (href.match(/\.(mp4|webm|mov)(\?|$)/i)) videoUrl = videoUrl || href;
      if (href.match(/\.pdf(\?|$)/i)) pdfUrl = pdfUrl || href;
    });

    // Also check for embedded YouTube/video iframes within block
    $block.find('iframe').each((j, iframe) => {
      const src = $(iframe).attr('src') || '';
      const ytMatch = src.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch && !videoUrl) {
        videoUrl = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
      }
      // vp4.me player → capture the embed URL itself
      if (src.includes('embed.vp4.me') && !videoUrl) {
        videoUrl = src;
      }
    });

    if (title && (audioUrl || videoUrl || pdfUrl)) {
      lessons.push({
        title,
        urlPath,
        rabbiName,
        promo,
        audioUrl,
        videoUrl,
        pdfUrl,
      });
    }
  });

  return lessons;
}

// ============================================================
// Fetch and parse one page
// ============================================================
async function scrapePage(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "BneyZionMigrationBot/2.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseLessonBlocks(html);
  } catch (e) {
    return null;
  }
}

// ============================================================
// Normalize title for matching
// ============================================================
const normalize = (s) =>
  (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[""״'']/g, '"')
    .replace(/\u200f|\u200e|\u00a0/g, "")
    .toLowerCase();

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`[W${WORKER_ID}] Row-Level Scraper — range ${START}-${END}`);

  // Load Umbraco index
  const INDEX_FILE = "scripts/umbraco-index.json";
  if (!existsSync(INDEX_FILE)) {
    console.error("No umbraco-index.json found. Run the index builder first.");
    process.exit(1);
  }
  const fullIndex = JSON.parse(readFileSync(INDEX_FILE, "utf-8"));

  // Only scrape pages that have children (category/series pages with tables)
  // PLUS leaf pages (individual lesson pages — which also work with .lessonBlock structure for related lessons)
  const pagesToScrape = fullIndex.slice(START, END);
  console.log(`[W${WORKER_ID}] Pages to scrape: ${pagesToScrape.length}`);

  // Load Supabase lessons for matching
  const allLessons = [];
  let offset = 0;
  while (true) {
    const { data } = await db
      .from("lessons")
      .select("id, title, source_type, audio_url, video_url, attachment_url, rabbi_id, series_id, status")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allLessons.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`[W${WORKER_ID}] Loaded ${allLessons.length} Supabase lessons`);

  // Build title → lesson map
  const lessonByTitle = new Map();
  for (const l of allLessons) {
    const key = normalize(l.title);
    if (!lessonByTitle.has(key)) lessonByTitle.set(key, []);
    lessonByTitle.get(key).push(l);
  }

  // Scrape and extract
  const mediaMap = new Map(); // normalized_title → {audio, video, pdf, sourceUrl, rabbiName}
  let scraped = 0, totalBlocks = 0;

  for (const item of pagesToScrape) {
    const url = `${OLD_SITE}${item.url}`;
    const blocks = await scrapePage(url);
    scraped++;

    if (scraped % 100 === 0) {
      console.log(`[W${WORKER_ID}] Scraped ${scraped}/${pagesToScrape.length}, blocks found: ${totalBlocks}`);
    }

    if (!blocks) continue;
    totalBlocks += blocks.length;

    // Store each block by normalized title
    for (const block of blocks) {
      const key = normalize(block.title);
      if (!key) continue;

      const existing = mediaMap.get(key);
      if (!existing) {
        mediaMap.set(key, {
          title: block.title,
          audioUrl: block.audioUrl,
          videoUrl: block.videoUrl,
          pdfUrl: block.pdfUrl,
          sourceUrl: url,
          urlPath: block.urlPath,
          rabbiName: block.rabbiName,
        });
      } else {
        // Prefer the entry with most media
        const existingCount = [existing.audioUrl, existing.videoUrl, existing.pdfUrl].filter(Boolean).length;
        const newCount = [block.audioUrl, block.videoUrl, block.pdfUrl].filter(Boolean).length;
        if (newCount > existingCount) {
          mediaMap.set(key, {
            title: block.title,
            audioUrl: block.audioUrl,
            videoUrl: block.videoUrl,
            pdfUrl: block.pdfUrl,
            sourceUrl: url,
            urlPath: block.urlPath,
            rabbiName: block.rabbiName,
          });
        }
      }
    }
  }

  console.log(`[W${WORKER_ID}] Unique titles found: ${mediaMap.size}`);

  // Match and update
  let enriched = 0;
  const enrichLog = [];

  for (const [key, media] of mediaMap) {
    const matches = lessonByTitle.get(key);
    if (!matches) continue;

    for (const lesson of matches) {
      const updates = {};

      // AUDIO: update if Supabase is missing OR clearly wrong
      if (media.audioUrl && !lesson.audio_url) {
        updates.audio_url = media.audioUrl;
      }

      // VIDEO: update if Supabase is missing OR clearly wrong
      if (media.videoUrl && !lesson.video_url) {
        updates.video_url = media.videoUrl;
      }

      // PDF: update if Supabase is missing
      if (media.pdfUrl && !lesson.attachment_url) {
        updates.attachment_url = media.pdfUrl;
      }

      // Determine source_type from what the lesson has
      const hasVideo = !!(updates.video_url || lesson.video_url);
      const hasAudio = !!(updates.audio_url || lesson.audio_url);
      if (hasVideo && lesson.source_type !== 'video' && lesson.source_type !== 'article') {
        updates.source_type = 'video';
      } else if (hasAudio && !hasVideo && lesson.source_type !== 'audio' && lesson.source_type !== 'article') {
        updates.source_type = 'audio';
      }

      // Republish if had media and was draft
      if (lesson.status === 'draft' && (updates.audio_url || updates.video_url || updates.attachment_url)) {
        updates.status = 'published';
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await db.from("lessons").update(updates).eq("id", lesson.id);
        if (!error) {
          enriched++;
          enrichLog.push({
            lessonId: lesson.id,
            title: lesson.title,
            sourceUrl: media.sourceUrl,
            updates,
          });
          // Update local state
          Object.assign(lesson, updates);
        }
      }
    }
  }

  console.log(`[W${WORKER_ID}] === DONE ===`);
  console.log(`[W${WORKER_ID}] Pages scraped: ${scraped}`);
  console.log(`[W${WORKER_ID}] Lesson blocks found: ${totalBlocks}`);
  console.log(`[W${WORKER_ID}] Unique titles: ${mediaMap.size}`);
  console.log(`[W${WORKER_ID}] Enriched: ${enriched}`);

  writeFileSync(`scripts/row-scrape-log-w${WORKER_ID}.json`, JSON.stringify(enrichLog, null, 2));

  // Also dump mediaMap for later analysis
  const mapExport = Array.from(mediaMap.entries()).map(([k, v]) => ({ key: k, ...v }));
  writeFileSync(`scripts/media-map-w${WORKER_ID}.json`, JSON.stringify(mapExport, null, 2));
}

main().catch(console.error);
