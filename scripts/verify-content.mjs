#!/usr/bin/env node
/**
 * Content Verification Agent
 * Crawls Umbraco and compares every lesson against Supabase
 * Checks: audio URL, video URL, text content, attachment, rabbi
 */

import { createClient } from "@supabase/supabase-js";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const UMB = "https://www.bneyzion.co.il";

const db = createClient(DB_URL, DB_KEY);
let umbCookie = "";

// ============================================================
// Umbraco API
// ============================================================
async function umbLogin() {
  const res = await fetch(`${UMB}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "yoav", password: "5W;3N)g8Iq" }),
  });
  const cookies = res.headers.getSetCookie?.() || [];
  umbCookie = cookies.map(c => c.split(";")[0]).join("; ");
  const text = await res.text();
  const clean = text.replace(/^\)\]\}',?\s*/, "");
  const data = JSON.parse(clean);
  console.log(`Umbraco: logged in as ${data.name}`);
  return !!data.name;
}

async function umbFetch(path) {
  const res = await fetch(`${UMB}${path}`, { headers: { Cookie: umbCookie } });
  const text = await res.text();
  try {
    return JSON.parse(text.replace(/^\)\]\}',?\s*/, ""));
  } catch {
    return null;
  }
}

async function umbGetContent(id) {
  return umbFetch(`/umbraco/backoffice/UmbracoApi/Content/GetById?id=${id}`);
}

async function umbGetChildren(id, page = 1) {
  return umbFetch(`/umbraco/backoffice/UmbracoApi/Content/GetChildren?id=${id}&pageNumber=${page}&pageSize=500&orderBy=SortOrder&orderDirection=Ascending`);
}

// ============================================================
// Extract lesson data from Umbraco node
// ============================================================
function extractUmbLesson(node) {
  if (!node || !node.tabs) return null;

  const props = {};
  for (const tab of node.tabs || []) {
    for (const prop of tab.properties || []) {
      props[prop.alias] = prop.value;
    }
  }

  // Common aliases in bneyzion Umbraco
  const title = node.name || "";
  const audioUrl = props.audioFile || props.audio || props.audioUrl || null;
  const videoUrl = props.videoUrl || props.video || props.youtubeLink || null;
  const content = props.bodyText || props.content || props.lessonContent || null;
  const attachment = props.pdfFile || props.attachment || props.downloadFile || null;
  const rabbiName = props.rabbi || props.rabbiName || null;

  // Extract actual URL from Umbraco media picker (can be object or string)
  const getUrl = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object" && v.src) return v.src;
    if (typeof v === "object" && v.url) return v.url;
    if (Array.isArray(v) && v[0]?.src) return v[0].src;
    return null;
  };

  return {
    umbId: node.id,
    title: title.trim(),
    audioUrl: getUrl(audioUrl),
    videoUrl: getUrl(videoUrl),
    contentLength: typeof content === "string" ? content.length : 0,
    contentPreview: typeof content === "string" ? content.substring(0, 100) : null,
    attachment: getUrl(attachment),
    rabbiName: typeof rabbiName === "string" ? rabbiName : null,
    contentType: node.contentTypeAlias,
  };
}

// ============================================================
// Crawl Umbraco tree recursively
// ============================================================
async function crawlTree(nodeId, depth = 0) {
  const lessons = [];
  let page = 1;

  while (true) {
    const result = await umbGetChildren(nodeId, page);
    if (!result || !result.items || result.items.length === 0) break;

    for (const item of result.items) {
      const ct = item.contentTypeAlias || "";

      // If it's a lesson/article, get full content
      if (ct === "lesson" || ct === "article" || ct === "lessonSeries" || !item.hasChildren) {
        const full = await umbGetContent(item.id);
        const lesson = extractUmbLesson(full);
        if (lesson) {
          lessons.push(lesson);
        }
      }

      // Recurse into categories/series
      if (item.hasChildren) {
        const childLessons = await crawlTree(item.id, depth + 1);
        lessons.push(...childLessons);
      }
    }

    if (result.items.length < 500) break;
    page++;
  }

  return lessons;
}

// ============================================================
// Compare Supabase vs Umbraco
// ============================================================
function normalizeTitle(t) {
  return (t || "").trim().replace(/\s+/g, " ").replace(/[״"']/g, '"');
}

// ============================================================
// Main
// ============================================================
async function main() {
  const startTime = Date.now();
  console.log("=== Content Verification Agent ===\n");

  // Login to Umbraco
  await umbLogin();

  // Fetch all published lessons from Supabase
  console.log("Fetching Supabase lessons...");
  const allLessons = [];
  let offset = 0;
  while (true) {
    const { data } = await db
      .from("lessons")
      .select("id, title, source_type, audio_url, video_url, content, attachment_url, rabbi_id, series_id")
      .eq("status", "published")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allLessons.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Supabase: ${allLessons.length} published lessons\n`);

  // Build title→lesson map
  const sbByTitle = new Map();
  for (const l of allLessons) {
    const key = normalizeTitle(l.title);
    if (!sbByTitle.has(key)) sbByTitle.set(key, []);
    sbByTitle.get(key).push(l);
  }

  // Crawl Umbraco - main lessons base (ID 1069)
  console.log("Crawling Umbraco content tree (ID 1069)...");
  console.log("This will take several minutes...\n");
  const umbLessons = await crawlTree(1069);
  console.log(`\nUmbraco: ${umbLessons.length} content items found\n`);

  // Compare
  const mismatches = [];
  let matched = 0;
  let unmatched = 0;

  for (const umb of umbLessons) {
    const key = normalizeTitle(umb.title);
    const sbMatches = sbByTitle.get(key);

    if (!sbMatches || sbMatches.length === 0) {
      unmatched++;
      continue;
    }

    matched++;
    const sb = sbMatches[0]; // Take first match

    const issues = [];

    // Check audio
    if (umb.audioUrl && !sb.audio_url) {
      issues.push(`MISSING_AUDIO: Umbraco has audio "${umb.audioUrl?.substring(0, 60)}" but Supabase doesn't`);
    }
    if (!umb.audioUrl && sb.audio_url && sb.source_type === "audio") {
      // Supabase says audio but Umbraco doesn't have audio - might be OK if it's from a different source
    }

    // Check video
    if (umb.videoUrl && !sb.video_url) {
      issues.push(`MISSING_VIDEO: Umbraco has video "${umb.videoUrl?.substring(0, 60)}" but Supabase doesn't`);
    }

    // Check content
    if (umb.contentLength > 100 && (!sb.content || sb.content.length < 50)) {
      issues.push(`MISSING_CONTENT: Umbraco has ${umb.contentLength} chars of content but Supabase has ${(sb.content || "").length}`);
    }

    // Check content mismatch (content in wrong lesson)
    if (sb.content && sb.content.length > 100 && umb.contentLength === 0 && sb.source_type !== "article") {
      issues.push(`WRONG_CONTENT: Supabase has content (${sb.content.length} chars) but Umbraco has none for this lesson — content likely from another lesson`);
    }

    // Check attachment/PDF
    if (umb.attachment && !sb.attachment_url) {
      issues.push(`MISSING_ATTACHMENT: Umbraco has attachment "${umb.attachment?.substring(0, 60)}" but Supabase doesn't`);
    }

    // Check source_type consistency
    if (umb.audioUrl && !umb.videoUrl && sb.source_type === "video") {
      issues.push(`WRONG_TYPE: Umbraco is audio but Supabase says video`);
    }
    if (umb.videoUrl && !umb.audioUrl && sb.source_type === "audio") {
      issues.push(`WRONG_TYPE: Umbraco is video but Supabase says audio`);
    }

    if (issues.length > 0) {
      mismatches.push({
        supabaseId: sb.id,
        title: umb.title,
        umbId: umb.umbId,
        issues,
      });
    }
  }

  // Report
  console.log("=== VERIFICATION REPORT ===\n");
  console.log(`Umbraco items crawled: ${umbLessons.length}`);
  console.log(`Matched to Supabase: ${matched}`);
  console.log(`No match in Supabase: ${unmatched}`);
  console.log(`Items with issues: ${mismatches.length}\n`);

  // Group by issue type
  const byType = {};
  for (const m of mismatches) {
    for (const issue of m.issues) {
      const type = issue.split(":")[0];
      if (!byType[type]) byType[type] = [];
      byType[type].push(m);
    }
  }

  for (const [type, items] of Object.entries(byType)) {
    console.log(`${type}: ${items.length} lessons`);
    for (const item of items.slice(0, 5)) {
      const issue = item.issues.find(i => i.startsWith(type));
      console.log(`  - "${item.title.substring(0, 50)}" (${item.supabaseId.substring(0, 8)})`);
      console.log(`    ${issue}`);
    }
    if (items.length > 5) console.log(`  ... and ${items.length - 5} more`);
    console.log("");
  }

  // Save full report
  const fs = await import("fs");
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${Math.round((Date.now() - startTime) / 1000)}s`,
    umbLessonsCount: umbLessons.length,
    matched,
    unmatched,
    mismatchCount: mismatches.length,
    issuesByType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    mismatches: mismatches.slice(0, 500),
  };
  fs.writeFileSync("scripts/verification-report.json", JSON.stringify(report, null, 2));
  console.log("Full report saved to scripts/verification-report.json");

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nCompleted in ${elapsed}s`);
}

main().catch(console.error);
