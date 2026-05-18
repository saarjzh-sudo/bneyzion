#!/usr/bin/env node
/**
 * rescrape-lesson-media.mjs
 * Re-scrapes both מאגרים on old bneyzion.co.il to fill in missing
 * attachment_url / audio_url / video_url for lessons in Supabase.
 *
 * Covers:
 *   - /מאגר-השיעורים-והמאמרים/ (9,566 pages in umbraco-index.json)
 *   - /מאגר-עזרי-הלמידה/ (crawled fresh — not in umbraco-index.json)
 *
 * Parses BOTH:
 *   - div.lessonBlock  (swiper card layout)
 *   - tr[data-tooltip] (table-row list layout)
 *
 * Usage:
 *   env -u HTTPS_PROXY -u HTTP_PROXY node scripts/rescrape-lesson-media.mjs [--dry-run] [--limit=N] [--batch=N]
 *
 * Iron rules:
 *   - Never overwrites existing audio_url/video_url/attachment_url unless --force
 *   - Additional attachments beyond the first go into additional_attachments JSONB
 *   - Lessons with all 3 fields already filled are skipped
 */

import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";

// ============================================================
// Config
// ============================================================
const DB_URL = process.env.SUPABASE_URL || "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DB_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY env var is required");
  process.exit(1);
}
const OLD_SITE = "https://www.bneyzion.co.il";
const db = createClient(DB_URL, DB_KEY);

const IS_DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const BATCH_ARG = process.argv.find((a) => a.startsWith("--batch="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : null;
const BATCH = BATCH_ARG ? parseInt(BATCH_ARG.split("=")[1]) : 500;

const TS = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

// ============================================================
// Normalize Hebrew title for fuzzy matching
// ============================================================
const normalize = (s) =>
  (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[""״'']/g, '"')
    .replace(/[‏‎ ]/g, "")
    .replace(/[|–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// ============================================================
// Fetch one URL via curl --noproxy '*' -sL
// Node's built-in fetch can't handle the 301 Hebrew redirect from this server.
// curl handles it correctly.
// ============================================================
function fetchHtml(url) {
  try {
    // Escape double-quotes in URL just in case
    const safeUrl = url.replace(/"/g, '%22');
    const html = execSync(
      `curl --noproxy '*' -sL --max-time 25 -A "Mozilla/5.0" "${safeUrl}"`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );
    if (!html || html.length < 200) return null;
    return html;
  } catch {
    return null;
  }
}

// ============================================================
// Parse a page and extract lesson media entries from BOTH layouts
// Returns array of { title, href, audioUrl, videoUrl, pdfUrls[] }
// ============================================================
function parsePage(html) {
  const $ = load(html);
  const results = [];
  const seen = new Set(); // avoid duplicate entries from same page

  // ---- LAYOUT 1: div.lessonBlock (swiper cards) ----
  $(".lessonBlock").each((_, block) => {
    const $b = $(block);
    const $titleLink = $b.find("h3 a").first();
    const title = $titleLink.attr("title") || $titleLink.text().trim();
    const href = $titleLink.attr("href") || "";
    if (!title) return;

    const key = normalize(title);
    if (seen.has(key)) return;
    seen.add(key);

    let audioUrl = null, videoUrl = null;
    const pdfUrls = [];

    $b.find("a").each((_, a) => {
      const h = $(a).attr("href") || "";
      if (h.match(/\.(mp3|m4a|wav|ogg)(\?|$)/i) && !audioUrl) audioUrl = h;
      if (h.match(/\.(mp4|webm|mov)(\?|$)/i) && !videoUrl) videoUrl = h;
      if (h.match(/\.pdf(\?|$)/i)) {
        if (!pdfUrls.includes(h)) pdfUrls.push(h);
      }
      if (h.match(/\.(docx?|xlsx?|pptx?|odt)(\?|$)/i)) {
        if (!pdfUrls.includes(h)) pdfUrls.push(h); // non-pdf attachments
      }
    });

    // YouTube iframes
    $b.find("iframe").each((_, iframe) => {
      const src = $(iframe).attr("src") || "";
      const yt = src.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (yt && !videoUrl) videoUrl = `https://www.youtube.com/watch?v=${yt[1]}`;
      if (src.includes("embed.vp4.me") && !videoUrl) videoUrl = src;
    });

    if (audioUrl || videoUrl || pdfUrls.length > 0) {
      results.push({ title, href, audioUrl, videoUrl, pdfUrls });
    }
  });

  // ---- LAYOUT 2: tr[data-tooltip] (table rows) ----
  $("tr[data-tooltip]").each((_, row) => {
    const $r = $(row);
    const $titleLink = $r.find("h3 a").first();
    const title = $titleLink.attr("title") || $titleLink.text().trim();
    const href = $titleLink.attr("href") || "";
    if (!title) return;

    const key = normalize(title);
    if (seen.has(key)) return;
    seen.add(key);

    let audioUrl = null, videoUrl = null;
    const pdfUrls = [];

    // lessonLinks section within the row
    $r.find("a").each((_, a) => {
      const h = $(a).attr("href") || "";
      if (h.match(/\.(mp3|m4a|wav|ogg)(\?|$)/i) && !audioUrl) audioUrl = h;
      if (h.match(/\.(mp4|webm|mov)(\?|$)/i) && !videoUrl) videoUrl = h;
      if (h.match(/\.pdf(\?|$)/i)) {
        if (!pdfUrls.includes(h)) pdfUrls.push(h);
      }
      if (h.match(/\.(docx?|xlsx?|pptx?|odt)(\?|$)/i)) {
        if (!pdfUrls.includes(h)) pdfUrls.push(h);
      }
      // S3 audio without extension
      if (!audioUrl && h.match(/s3.*amazonaws\.com/i) && h.match(/\.(mp3|m4a)/i)) {
        audioUrl = h;
      }
    });

    // S3 audio from full URL in href
    $r.find('a[href*="s3"][href*="amazonaws"]').each((_, a) => {
      const h = $(a).attr("href") || "";
      if (!audioUrl && h.match(/\.(mp3|m4a|MP3|M4A)(\?|$)/)) audioUrl = h;
    });

    if (audioUrl || videoUrl || pdfUrls.length > 0) {
      results.push({ title, href, audioUrl, videoUrl, pdfUrls });
    }
  });

  return results;
}

// ============================================================
// Crawl מאגר-עזרי-הלמידה to build its URL index
// Uses BFS from root page, following internal links.
// The server returns hrefs in decoded Hebrew; we encode them.
// ============================================================
function crawlEzriIndex() {
  const CACHE = "scripts/umbraco-ezri-index.json";
  if (existsSync(CACHE)) {
    console.log("Using cached עזרי index");
    return JSON.parse(readFileSync(CACHE, "utf-8"));
  }

  console.log("Crawling מאגר-עזרי-הלמידה tree...");

  // Percent-encoded root prefix (for fetching)
  const encodedPrefix = "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/";
  // Hebrew decoded prefix (for matching links in HTML)
  const hebrewPrefix = "/מאגר-עזרי-הלמידה/";

  const visited = new Set(); // tracks encoded paths already fetched or queued
  const queue = [encodedPrefix];
  visited.add(encodedPrefix); // mark as queued immediately
  const pages = [];

  while (queue.length > 0) {
    const path = queue.shift();

    const url = OLD_SITE + path;
    const html = fetchHtml(url);
    if (!html) continue;

    pages.push({ url: path, name: decodeURIComponent(path).split("/").filter(Boolean).pop() || "root" });

    // Extract sub-links — the HTML uses Hebrew hrefs, we need to encode them
    const $ = load(html);
    $("a[href]").each((_, a) => {
      const href = $(a).attr("href") || "";
      // Hebrew hrefs from the HTML — only follow paths under מאגר-עזרי-הלמידה
      if (
        href.startsWith(hebrewPrefix) &&
        !href.includes("?") &&
        !href.includes("#")
      ) {
        const encoded = encodeURI(href);
        if (!visited.has(encoded)) {
          visited.add(encoded); // add BEFORE queuing to prevent duplicates
          queue.push(encoded);
        }
      }
    });

    if (pages.length % 50 === 0) {
      console.log(`  Crawled ${pages.length} pages, queue: ${queue.length}`);
    }

    // Throttle
    execSync("sleep 0.08"); // 80ms throttle
  }

  console.log(`עזרי index: ${pages.length} pages`);
  writeFileSync(CACHE, JSON.stringify(pages, null, 2));
  return pages;
}

// ============================================================
// Load all Supabase lessons (paginated)
// ============================================================
async function loadAllLessons() {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await db
      .from("lessons")
      .select(
        "id, title, audio_url, video_url, attachment_url, additional_attachments, rabbi_id, series_id, status, source_type"
      )
      .range(offset, offset + 999);
    if (error) throw new Error("Supabase load error: " + error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`\n=== rescrape-lesson-media.mjs ===`);
  console.log(
    `Mode: ${IS_DRY_RUN ? "DRY-RUN" : "LIVE"} | Limit: ${LIMIT ?? "none"} | Batch: ${BATCH}`
  );
  console.log("");

  // ---- Step 1: Load Supabase lessons ----
  console.log("Loading lessons from Supabase...");
  const allLessons = await loadAllLessons();
  console.log(`Loaded ${allLessons.length} lessons`);

  // Count lessons missing media
  const missingAll = allLessons.filter(
    (l) => !l.audio_url && !l.video_url && !l.attachment_url
  );
  const missingAttachment = allLessons.filter((l) => !l.attachment_url);
  console.log(`Lessons with ALL media null: ${missingAll.length}`);
  console.log(`Lessons without attachment: ${missingAttachment.length}`);

  // Build title → lessons map (one key can have multiple lessons with same title)
  const lessonByTitle = new Map(); // normalized_title → Lesson[]
  for (const l of allLessons) {
    const key = normalize(l.title);
    if (!lessonByTitle.has(key)) lessonByTitle.set(key, []);
    lessonByTitle.get(key).push(l);
  }

  // ---- Step 2: Build page lists ----
  // 2a: מאגר-השיעורים-והמאמרים — use existing umbraco-index.json
  const umbIndexRaw = JSON.parse(
    readFileSync("scripts/umbraco-index.json", "utf-8")
  );
  const shiurimPages = umbIndexRaw.map((x) => ({
    url: x.url,
    maagar: "shiurim",
  }));
  console.log(`\nמאגר-השיעורים pages: ${shiurimPages.length}`);

  // 2b: מאגר-עזרי-הלמידה — crawl fresh
  const ezriRaw = await crawlEzriIndex();
  const ezriPages = ezriRaw.map((x) => ({
    url: x.url,
    maagar: "ezri",
  }));
  console.log(`מאגר-עזרי-הלמידה pages: ${ezriPages.length}`);

  // Combine all pages
  let allPages = [...shiurimPages, ...ezriPages];
  if (LIMIT) {
    allPages = allPages.slice(0, LIMIT);
    console.log(`Limited to ${LIMIT} pages`);
  }
  console.log(`\nTotal pages to scrape: ${allPages.length}`);

  // ---- Step 3: Scrape and collect mediaMap ----
  // mediaMap: normalized_title → { audioUrl, videoUrl, pdfUrls[], sourceUrl, title }
  // When multiple pages have same title, prefer the one with most media
  const mediaMap = new Map();
  let scraped = 0,
    totalEntries = 0,
    errors = 0;

  const PROGRESS_EVERY = 200;

  for (const page of allPages) {
    const url = OLD_SITE + page.url;
    const html = fetchHtml(url);
    scraped++;

    if (scraped % PROGRESS_EVERY === 0) {
      console.log(
        `  Scraped ${scraped}/${allPages.length} | entries: ${totalEntries} | errors: ${errors}`
      );
    }

    if (!html) {
      errors++;
      continue;
    }

    let entries;
    try {
      entries = parsePage(html);
    } catch (e) {
      errors++;
      continue;
    }

    totalEntries += entries.length;

    for (const entry of entries) {
      const key = normalize(entry.title);
      if (!key) continue;

      const existing = mediaMap.get(key);
      const newScore =
        (entry.audioUrl ? 2 : 0) +
        (entry.videoUrl ? 2 : 0) +
        entry.pdfUrls.length;

      if (!existing) {
        mediaMap.set(key, { ...entry, sourceUrl: url });
      } else {
        const existScore =
          (existing.audioUrl ? 2 : 0) +
          (existing.videoUrl ? 2 : 0) +
          existing.pdfUrls.length;
        if (newScore > existScore) {
          mediaMap.set(key, { ...entry, sourceUrl: url });
        } else if (newScore === existScore) {
          // Merge pdfUrls
          const merged = [...new Set([...existing.pdfUrls, ...entry.pdfUrls])];
          mediaMap.set(key, { ...existing, pdfUrls: merged });
        }
      }
    }

    // Light throttle via curl sleep already, but add a small pause
    // between batches (every 100 pages) to avoid hammering
    if (scraped % 100 === 0) execSync("sleep 2");
  }

  console.log(`\nScraping done: ${scraped} pages, ${totalEntries} entries, ${errors} errors`);
  console.log(`Unique titles in mediaMap: ${mediaMap.size}`);

  // ---- Step 4: Dry-run report ----
  if (IS_DRY_RUN) {
    let potentialMatches = 0,
      potentialAudio = 0,
      potentialVideo = 0,
      potentialAttachment = 0,
      potentialExtra = 0;

    for (const [key, media] of mediaMap) {
      const matches = lessonByTitle.get(key);
      if (!matches) continue;

      for (const lesson of matches) {
        // Would we update anything?
        const wouldAudio = media.audioUrl && !lesson.audio_url;
        const wouldVideo = media.videoUrl && !lesson.video_url;
        const firstPdf = media.pdfUrls[0];
        const extraPdfs = media.pdfUrls.slice(1);

        // Determine primary attachment
        let wouldAttachment = false;
        if (!lesson.attachment_url && firstPdf) wouldAttachment = true;
        // If existing attachment_url is a docx and we have a pdf, the pdf goes to additional
        const wouldExtra =
          extraPdfs.length > 0 ||
          (firstPdf &&
            lesson.attachment_url &&
            lesson.attachment_url !== firstPdf &&
            !extraPdfs.includes(firstPdf));

        if (wouldAudio || wouldVideo || wouldAttachment || wouldExtra) {
          potentialMatches++;
          if (wouldAudio) potentialAudio++;
          if (wouldVideo) potentialVideo++;
          if (wouldAttachment) potentialAttachment++;
          if (wouldExtra) potentialExtra++;
        }
      }
    }

    console.log(`\n--- DRY-RUN RESULTS ---`);
    console.log(`Lessons that WOULD be updated: ${potentialMatches}`);
    console.log(`  Would gain audio_url: ${potentialAudio}`);
    console.log(`  Would gain video_url: ${potentialVideo}`);
    console.log(`  Would gain attachment_url: ${potentialAttachment}`);
    console.log(`  Would gain additional_attachments entry: ${potentialExtra}`);
    const matchRate =
      mediaMap.size > 0
        ? ((potentialMatches / mediaMap.size) * 100).toFixed(1)
        : 0;
    console.log(`Match rate: ${matchRate}% (of titles found in media map)`);

    // Sample unmatched
    const unmatched = [];
    for (const [key, media] of mediaMap) {
      if (!lessonByTitle.has(key)) unmatched.push(media.title);
      if (unmatched.length >= 10) break;
    }
    if (unmatched.length > 0) {
      console.log(`\nSample unmatched titles from site:`);
      for (const t of unmatched) console.log(`  "${t}"`);
    }

    return;
  }

  // ---- Step 5: LIVE run — update Supabase ----
  let totalUpdated = 0,
    totalSkipped = 0,
    batchUpdated = 0;
  const updateLog = [];

  // Process in batches
  const mediaEntries = [...mediaMap.entries()];
  for (let b = 0; b < mediaEntries.length; b += BATCH) {
    const batchEntries = mediaEntries.slice(b, b + BATCH);
    batchUpdated = 0;

    for (const [key, media] of batchEntries) {
      const matches = lessonByTitle.get(key);
      if (!matches) {
        totalSkipped++;
        continue;
      }

      for (const lesson of matches) {
        const updates = {};

        // Audio
        if (media.audioUrl && !lesson.audio_url) {
          updates.audio_url = media.audioUrl;
        }

        // Video
        if (media.videoUrl && !lesson.video_url) {
          updates.video_url = media.videoUrl;
        }

        // Attachments: first pdf/doc goes into attachment_url if empty
        // Remaining go into additional_attachments JSONB array
        const allPdfs = media.pdfUrls;
        if (allPdfs.length > 0) {
          if (!lesson.attachment_url) {
            updates.attachment_url = allPdfs[0];
            // Additional ones
            if (allPdfs.length > 1) {
              const existing = lesson.additional_attachments || [];
              const toAdd = allPdfs.slice(1).filter((p) => !existing.includes(p));
              if (toAdd.length > 0) {
                updates.additional_attachments = [...existing, ...toAdd];
              }
            }
          } else {
            // attachment_url is already set — put any new ones into additional_attachments
            const existing = lesson.additional_attachments || [];
            const toAdd = allPdfs.filter(
              (p) => p !== lesson.attachment_url && !existing.includes(p)
            );
            if (toAdd.length > 0) {
              updates.additional_attachments = [...existing, ...toAdd];
            }
          }
        }

        // source_type
        if (updates.video_url || lesson.video_url) {
          if (!["video", "article"].includes(lesson.source_type)) {
            updates.source_type = "video";
          }
        } else if (updates.audio_url || lesson.audio_url) {
          if (!["audio", "article"].includes(lesson.source_type)) {
            updates.source_type = "audio";
          }
        }

        // Republish drafts that now have media
        if (
          lesson.status === "draft" &&
          (updates.audio_url || updates.video_url || updates.attachment_url)
        ) {
          updates.status = "published";
        }

        if (Object.keys(updates).length === 0) {
          totalSkipped++;
          continue;
        }

        const { error } = await db
          .from("lessons")
          .update(updates)
          .eq("id", lesson.id);

        if (error) {
          console.error(`Error updating ${lesson.id}: ${error.message}`);
        } else {
          totalUpdated++;
          batchUpdated++;
          updateLog.push({
            id: lesson.id,
            title: lesson.title,
            sourceUrl: media.sourceUrl,
            updates,
          });
          // Update in-memory state
          Object.assign(lesson, updates);
        }
      }
    }

    const batchNum = Math.floor(b / BATCH) + 1;
    const totalBatches = Math.ceil(mediaEntries.length / BATCH);
    console.log(
      `Batch ${batchNum}/${totalBatches}: updated ${batchUpdated}, running total: ${totalUpdated}`
    );
  }

  // ---- Step 6: Report ----
  console.log(`\n=== DONE ===`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Total skipped (no match or no new data): ${totalSkipped}`);

  const reportPath = `scripts/rescrape-report-${TS}.json`;
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        dryRun: IS_DRY_RUN,
        totalPages: allPages.length,
        shiurimPages: shiurimPages.length,
        ezriPages: ezriPages.length,
        uniqueTitlesFound: mediaMap.size,
        totalUpdated,
        totalSkipped,
        updates: updateLog,
      },
      null,
      2
    )
  );
  console.log(`\nReport saved: ${reportPath}`);

  // ---- Step 7: Post-run Supabase counts via Management API ----
  const MGMT_PAT = process.env.SUPABASE_MANAGEMENT_API_TOKEN;
  if (!MGMT_PAT) {
    console.log("\n(Skipping post-run counts: SUPABASE_MANAGEMENT_API_TOKEN not set)");
    return;
  }
  console.log("\nPost-run Supabase counts:");
  try {
    const result = execSync(
      `curl --noproxy '*' -s ` +
      `-H "Authorization: Bearer ${MGMT_PAT}" ` +
      `-H "Content-Type: application/json" ` +
      `-X POST "https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query" ` +
      `-d '{"query": "SELECT COUNT(*) FILTER (WHERE attachment_url IS NOT NULL) AS with_attachment, COUNT(*) FILTER (WHERE audio_url IS NOT NULL) AS with_audio, COUNT(*) FILTER (WHERE video_url IS NOT NULL) AS with_video, COUNT(*) FILTER (WHERE attachment_url IS NULL AND audio_url IS NULL AND video_url IS NULL) AS all_null, COUNT(*) AS total FROM lessons;"}'`,
      { encoding: "utf-8" }
    );
    const rows = JSON.parse(result);
    if (rows && rows[0]) {
      const r = rows[0];
      console.log(`with_audio: ${r.with_audio}`);
      console.log(`with_video: ${r.with_video}`);
      console.log(`with_attachment: ${r.with_attachment}`);
      console.log(`all_null: ${r.all_null}`);
      console.log(`total: ${r.total}`);
    }
  } catch (e) {
    console.log("(Count query failed:", e.message, ")");
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
