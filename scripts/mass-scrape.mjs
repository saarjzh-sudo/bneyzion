#!/usr/bin/env node
/**
 * Mass scrape old bneyzion.co.il to find media URLs for all lessons
 * Crawls the Umbraco tree, then scrapes each page's HTML
 *
 * Usage: node scripts/mass-scrape.mjs [start] [end]
 *   start/end: index range to scrape (for parallel workers)
 *   e.g. node scripts/mass-scrape.mjs 0 800
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const OLD_SITE = "https://www.bneyzion.co.il";
const db = createClient(DB_URL, DB_KEY);

const START = parseInt(process.argv[2] || "0");
const END = parseInt(process.argv[3] || "99999");
const WORKER_ID = process.argv[4] || "0";

// ============================================================
// Umbraco tree crawl
// ============================================================
async function umbLogin() {
  const res = await fetch(`${OLD_SITE}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "yoav", password: "5W;3N)g8Iq" }),
  });
  const cookies = res.headers.getSetCookie?.() || [];
  return cookies.map(c => c.split(";")[0]).join("; ");
}

async function umbGetTreeChildren(cookie, id) {
  const res = await fetch(
    `${OLD_SITE}/umbraco/backoffice/UmbracoTrees/ContentTree/GetNodes?id=${id}&treeAlias=content`,
    { headers: { Cookie: cookie } }
  );
  const text = await res.text();
  try {
    const clean = text.replace(/^\)\]\}',?\s*/, "");
    return JSON.parse(clean);
  } catch { return []; }
}

async function buildFullIndex(cookie) {
  const INDEX_FILE = "scripts/umbraco-index.json";

  // Use cached index if available
  if (existsSync(INDEX_FILE)) {
    console.log(`[W${WORKER_ID}] Using cached index`);
    return JSON.parse(readFileSync(INDEX_FILE, "utf-8"));
  }

  console.log(`[W${WORKER_ID}] Building full Umbraco index...`);
  const index = [];

  async function crawl(parentId, pathParts, depth) {
    if (depth > 6) return;
    const children = await umbGetTreeChildren(cookie, parentId);
    if (!Array.isArray(children)) return;

    for (const child of children) {
      const slug = child.name.replace(/\s+/g, "-");
      const newPath = [...pathParts, slug];
      const url = "/" + newPath.map(encodeURIComponent).join("/") + "/";

      index.push({
        id: child.id,
        name: child.name.trim(),
        url,
        contentType: child.metaData?.contentType || "",
        hasChildren: child.hasChildren || false,
      });

      if (child.hasChildren) {
        await crawl(child.id, newPath, depth + 1);
      }
    }
  }

  // Start from homepage children (6294) AND lessons base (1069)
  // Lessons base has the actual lessons
  await crawl(1069, ["מאגר-השיעורים-והמאמרים"], 0);

  // Also get top-level pages
  const topLevel = await umbGetTreeChildren(cookie, 6294);
  if (Array.isArray(topLevel)) {
    for (const item of topLevel) {
      if (item.id !== 1069) { // Skip lessons base (already crawled)
        const slug = item.name.replace(/\s+/g, "-");
        index.push({
          id: item.id,
          name: item.name.trim(),
          url: "/" + encodeURIComponent(slug) + "/",
          contentType: item.metaData?.contentType || "",
          hasChildren: item.hasChildren || false,
        });
      }
    }
  }

  console.log(`[W${WORKER_ID}] Indexed ${index.length} items`);
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  return index;
}

// ============================================================
// HTML scraper
// ============================================================
async function scrapePage(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "BneyZionMigrationBot/1.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // YouTube
    const ytEmbed = html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    const ytWatch = html.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    const videoUrl = ytEmbed
      ? `https://www.youtube.com/watch?v=${ytEmbed[1]}`
      : ytWatch
        ? `https://www.youtube.com/watch?v=${ytWatch[1]}`
        : null;

    // Audio (mp3, wav, m4a)
    const audioMatch = html.match(/src=["']([^"']*\.(mp3|wav|m4a|ogg)(\?[^"']*)?)["']/i);
    const audioHref = html.match(/href=["']([^"']*\.(mp3|wav|m4a|ogg)(\?[^"']*)?)["']/i);
    let audioUrl = audioMatch ? audioMatch[1] : (audioHref ? audioHref[1] : null);

    // S3 audio
    const s3Audio = html.match(/(https:\/\/s3[^"'\s]+\.(mp3|m4a|wav))/i);
    if (!audioUrl && s3Audio) audioUrl = s3Audio[1];

    // PDF
    const pdfHref = html.match(/href=["']([^"']*\.pdf(\?[^"']*)?)["']/i);
    const pdfUrl = pdfHref ? pdfHref[1] : null;

    // Media downloads (any /media/ links)
    const mediaLinks = [];
    const mediaRegex = /href=["'](\/media\/[^"']+)["']/gi;
    let m;
    while ((m = mediaRegex.exec(html)) !== null) {
      mediaLinks.push(m[1]);
    }

    // Content text (rough check)
    const bodyMatch = html.match(/<div[^>]*class="[^"]*lesson-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const hasContent = bodyMatch ? bodyMatch[1].length > 50 : false;

    return { videoUrl, audioUrl, pdfUrl, mediaLinks, hasContent };
  } catch {
    return null;
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`[W${WORKER_ID}] Mass Scrape Worker — range ${START}-${END}`);

  const cookie = await umbLogin();
  const fullIndex = await buildFullIndex(cookie);

  // Get our slice
  const slice = fullIndex.slice(START, END);
  console.log(`[W${WORKER_ID}] Processing ${slice.length} pages`);

  // Load all Supabase lessons for matching
  const allLessons = [];
  let offset = 0;
  while (true) {
    const { data } = await db.from("lessons")
      .select("id, title, source_type, audio_url, video_url, attachment_url, status")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allLessons.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`[W${WORKER_ID}] Loaded ${allLessons.length} lessons from Supabase`);

  // Build title map (normalize for matching)
  const normalize = (s) => s.trim().replace(/\s+/g, " ").replace(/[""״'']/g, '"').replace(/\u200f/g, "");
  const lessonByTitle = new Map();
  for (const l of allLessons) {
    const key = normalize(l.title);
    if (!lessonByTitle.has(key)) lessonByTitle.set(key, []);
    lessonByTitle.get(key).push(l);
  }

  // Scrape and match
  let scraped = 0;
  let enriched = 0;
  const enrichLog = [];

  for (const item of slice) {
    const fullUrl = `${OLD_SITE}${item.url}`;
    const media = await scrapePage(fullUrl);
    scraped++;

    if (scraped % 100 === 0) {
      console.log(`[W${WORKER_ID}] Scraped ${scraped}/${slice.length}, enriched ${enriched}`);
    }

    if (!media) continue;

    // Try to match by name
    const key = normalize(item.name);
    const matches = lessonByTitle.get(key);
    if (!matches) continue;

    for (const lesson of matches) {
      const updates = {};

      if (media.videoUrl && !lesson.video_url) {
        updates.video_url = media.videoUrl;
        if (lesson.source_type !== "video" && lesson.source_type !== "article") {
          updates.source_type = "video";
        }
      }

      if (media.audioUrl && !lesson.audio_url) {
        updates.audio_url = media.audioUrl.startsWith("http") ? media.audioUrl : `${OLD_SITE}${media.audioUrl}`;
        if (!updates.source_type && lesson.source_type !== "audio" && lesson.source_type !== "article") {
          updates.source_type = "audio";
        }
      }

      if (media.pdfUrl && !lesson.attachment_url) {
        updates.attachment_url = media.pdfUrl.startsWith("http") ? media.pdfUrl : `${OLD_SITE}${media.pdfUrl}`;
      }

      // Check media links for PDFs
      if (!lesson.attachment_url && !updates.attachment_url && media.mediaLinks.length > 0) {
        const pdf = media.mediaLinks.find(u => u.toLowerCase().includes(".pdf"));
        if (pdf) {
          updates.attachment_url = `${OLD_SITE}${pdf}`;
        }
      }

      if (Object.keys(updates).length > 0) {
        // Republish if was draft and now has media
        if (lesson.status === "draft" && (updates.video_url || updates.audio_url || updates.attachment_url)) {
          updates.status = "published";
        }

        const { error } = await db.from("lessons").update(updates).eq("id", lesson.id);
        if (!error) {
          enriched++;
          enrichLog.push({ lessonId: lesson.id, title: lesson.title, umbName: item.name, updates });
          // Update local state to avoid double-enriching
          Object.assign(lesson, updates);
        }
      }
    }
  }

  console.log(`[W${WORKER_ID}] === DONE ===`);
  console.log(`[W${WORKER_ID}] Scraped: ${scraped}`);
  console.log(`[W${WORKER_ID}] Enriched: ${enriched}`);

  writeFileSync(`scripts/scrape-log-w${WORKER_ID}.json`, JSON.stringify(enrichLog, null, 2));
  console.log(`[W${WORKER_ID}] Log saved`);
}

main().catch(console.error);
