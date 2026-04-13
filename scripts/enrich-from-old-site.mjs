#!/usr/bin/env node
/**
 * Enrich lessons from the old bneyzion.co.il site
 * Scrapes lesson pages to find missing video/audio/PDF URLs
 * and updates Supabase
 */

import { createClient } from "@supabase/supabase-js";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const OLD_SITE = "https://www.bneyzion.co.il";
const db = createClient(DB_URL, DB_KEY);

// Umbraco login
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
    return JSON.parse(text.replace(/^\)\]\}',?\s*/, ""));
  } catch { return []; }
}

// Scrape a public lesson page to find media
async function scrapeLessonPage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const html = await res.text();

    // Find video URLs (YouTube embeds)
    const ytMatch = html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    const videoUrl = ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : null;

    // Find audio URLs
    const audioMatch = html.match(/src="([^"]*\.(mp3|wav|m4a|ogg)(\?[^"]*)?)"/i);
    const audioUrl = audioMatch ? audioMatch[1] : null;

    // Find PDF URLs
    const pdfMatch = html.match(/href="([^"]*\.pdf(\?[^"]*)?)"/i);
    const pdfUrl = pdfMatch ? pdfMatch[1] : null;

    // Find media download links
    const mediaMatch = html.match(/href="(\/media\/[^"]+)"/gi);
    const mediaUrls = mediaMatch ? mediaMatch.map(m => m.match(/href="([^"]+)"/)[1]) : [];

    return { videoUrl, audioUrl, pdfUrl, mediaUrls };
  } catch {
    return null;
  }
}

// Build URL-encoded Hebrew path from Umbraco tree
async function buildLessonIndex(cookie) {
  console.log("Building lesson index from Umbraco tree...");

  // Get the lessons base children (ID 1069)
  const categories = await umbGetTreeChildren(cookie, 1069);
  const lessonIndex = new Map(); // title → page URL on old site

  async function crawl(parentId, pathPrefix, depth = 0) {
    if (depth > 5) return;
    const children = await umbGetTreeChildren(cookie, parentId);
    if (!Array.isArray(children)) return;

    for (const child of children) {
      const slug = encodeURIComponent(child.name.replace(/\s+/g, "-"));
      const url = `${pathPrefix}/${slug}/`;
      const ct = child.metaData?.contentType || "";

      // Store leaf nodes (lessons)
      if (!child.hasChildren || ct === "lesson" || ct === "article") {
        lessonIndex.set(child.name.trim(), { url, id: child.id, contentType: ct });
      }

      // Recurse into categories
      if (child.hasChildren) {
        await crawl(child.id, url, depth + 1);
      }
    }
  }

  for (const cat of categories) {
    if (cat.hasChildren) {
      const slug = encodeURIComponent(cat.name.replace(/\s+/g, "-"));
      await crawl(cat.id, `/${encodeURIComponent("מאגר-השיעורים-והמאמרים")}/${slug}`, 1);
    }
  }

  console.log(`Indexed ${lessonIndex.size} items from Umbraco tree`);
  return lessonIndex;
}

async function main() {
  console.log("=== Enrich Lessons from Old Site ===\n");

  // Get all draft lessons (these are the ones missing content)
  const { data: draftLessons } = await db
    .from("lessons")
    .select("id, title, source_type, audio_url, video_url, attachment_url, content")
    .eq("status", "draft")
    .order("title");

  console.log(`Draft lessons to check: ${draftLessons?.length || 0}`);

  // Also get published lessons missing media that should have it
  const { data: brokenPublished } = await db
    .from("lessons")
    .select("id, title, source_type, audio_url, video_url, attachment_url")
    .eq("status", "published")
    .is("audio_url", null)
    .is("video_url", null)
    .is("attachment_url", null)
    .in("source_type", ["audio", "video"]);

  console.log(`Published audio/video lessons missing all media: ${brokenPublished?.length || 0}`);

  // Login to Umbraco
  const cookie = await umbLogin();
  console.log("Umbraco logged in\n");

  // Build lesson index from tree
  const lessonIndex = await buildLessonIndex(cookie);

  // Match and scrape
  let enriched = 0;
  let scraped = 0;
  const allToCheck = [...(draftLessons || []), ...(brokenPublished || [])];
  const enrichLog = [];

  for (const lesson of allToCheck) {
    const match = lessonIndex.get(lesson.title);
    if (!match) continue;

    // Scrape the old site page
    const fullUrl = `${OLD_SITE}${match.url}`;
    scraped++;
    if (scraped % 50 === 0) console.log(`Scraped ${scraped}/${allToCheck.length}...`);

    const media = await scrapeLessonPage(fullUrl);
    if (!media) continue;

    const updates = {};
    if (media.videoUrl && !lesson.video_url) {
      updates.video_url = media.videoUrl;
      updates.source_type = "video";
    }
    if (media.audioUrl && !lesson.audio_url) {
      updates.audio_url = media.audioUrl.startsWith("http") ? media.audioUrl : `${OLD_SITE}${media.audioUrl}`;
      if (!updates.source_type) updates.source_type = "audio";
    }
    if (media.pdfUrl && !lesson.attachment_url) {
      updates.attachment_url = media.pdfUrl.startsWith("http") ? media.pdfUrl : `${OLD_SITE}${media.pdfUrl}`;
    }

    // Check media URLs for PDFs
    if (!lesson.attachment_url && media.mediaUrls.length > 0) {
      const pdf = media.mediaUrls.find(u => u.toLowerCase().includes(".pdf"));
      if (pdf) {
        updates.attachment_url = pdf.startsWith("http") ? pdf : `${OLD_SITE}${pdf}`;
      }
    }

    if (Object.keys(updates).length > 0) {
      // If lesson was draft and now has media, republish it
      if (lesson.source_type !== "published" && (updates.video_url || updates.audio_url || updates.attachment_url)) {
        updates.status = "published";
      }

      const { error } = await db.from("lessons").update(updates).eq("id", lesson.id);
      if (!error) {
        enriched++;
        enrichLog.push({ id: lesson.id, title: lesson.title, updates });
      }
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Scraped: ${scraped}`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Not found on old site: ${allToCheck.length - scraped}`);

  // Save log
  const fs = await import("fs");
  fs.writeFileSync("scripts/enrich-log.json", JSON.stringify(enrichLog, null, 2));
  console.log("Log saved to scripts/enrich-log.json");
}

main().catch(console.error);
