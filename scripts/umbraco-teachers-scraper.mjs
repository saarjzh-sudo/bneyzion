#!/usr/bin/env node
/**
 * Umbraco Teacher Aids Scraper
 * Scrapes מאגר-עזרי-הלמידה (ID 2294) from Umbraco with admin credentials.
 * Uses GetById API + Media API to extract all content + attachment URLs.
 * Outputs: scripts/teachers-scrape-result.json
 *
 * Run: env -u HTTPS_PROXY -u HTTP_PROXY node scripts/umbraco-teachers-scraper.mjs
 */

import { writeFileSync } from "fs";
import { execSync } from "child_process";

const OLD_SITE = "https://www.bneyzion.co.il";
const UMBRACO_USER = "yoav";
const UMBRACO_PASS = "5W;3N)g8Iq";

// Root ID for מאגר-עזרי-הלמידה
const MAAGAR_ROOT = 2294;

// Persisted state between calls
let xsrfToken = null;
let cookieJar = {}; // name -> value

function buildCookieStr() {
  return Object.entries(cookieJar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function parseCookies(setCookieArr) {
  for (const hdr of setCookieArr || []) {
    const part = hdr.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) {
      const name = part.slice(0, eq).trim();
      const val = part.slice(eq + 1).trim();
      cookieJar[name] = val;
    }
  }
}

async function umb(path) {
  const resp = await fetch(`${OLD_SITE}${path}`, {
    headers: {
      Cookie: buildCookieStr(),
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
    },
    signal: AbortSignal.timeout(30000),
  });

  // Update cookies from response
  const newCookies = resp.headers.getSetCookie?.() || [];
  parseCookies(newCookies);

  const text = await resp.text();
  const clean = text.replace(/^\)\]\}',?\s*/, "");
  if (!clean.trim()) {
    console.warn(`Empty response for ${path} (HTTP ${resp.status})`);
    return null;
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.warn(`Parse error for ${path} (HTTP ${resp.status}):`, text.slice(0, 100));
    return null;
  }
}

async function login() {
  const resp = await fetch(
    `${OLD_SITE}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: UMBRACO_USER, password: UMBRACO_PASS }),
      signal: AbortSignal.timeout(20000),
    }
  );

  const setCookies = resp.headers.getSetCookie?.() || [];
  parseCookies(setCookies);

  // Extract XSRF-TOKEN (the non-httponly one)
  for (const hdr of setCookies) {
    if (hdr.includes("XSRF-TOKEN") && !hdr.includes("httponly")) {
      const val = hdr.split(";")[0].replace("XSRF-TOKEN=", "").trim();
      if (val) { xsrfToken = val; break; }
    }
  }

  const text = await resp.text();
  const clean = text.replace(/^\)\]\}',?\s*/, "");
  const data = JSON.parse(clean);

  if (!cookieJar["UMB_UCONTEXT"]) {
    throw new Error("Login failed — no UMB_UCONTEXT in response");
  }
  console.log(`Logged in as ${data.name} (type: ${data.userType})`);
  console.log(`XSRF token: ${xsrfToken?.slice(0, 20)}...`);
}

async function getChildren(id) {
  const data = await umb(
    `/umbraco/backoffice/UmbracoTrees/ContentTree/GetNodes?id=${id}&treeAlias=content`
  );
  return data || [];
}

async function getNodeContent(id) {
  return umb(`/umbraco/backoffice/UmbracoApi/Content/GetById?id=${id}`);
}

async function getMediaUrl(mediaId) {
  if (!mediaId) return null;
  const data = await umb(
    `/umbraco/backoffice/UmbracoApi/Media/GetById?id=${mediaId}`
  );
  if (!data) return null;

  for (const tab of data.tabs || []) {
    for (const p of tab.properties || []) {
      if (p.alias === "umbracoFile" && p.value) {
        return `${OLD_SITE}${p.value}`;
      }
    }
  }
  return null;
}

function extractProperties(node) {
  const props = {};
  for (const tab of node.tabs || []) {
    for (const p of tab.properties || []) {
      if (p.value !== "" && p.value !== null && p.value !== undefined) {
        props[p.alias] = p.value;
      }
    }
  }
  return props;
}

// Recursively walk the tree and collect all series+lessons
async function walkTree(id, depth = 0, parentChain = []) {
  const children = await getChildren(id);
  const results = [];

  for (const child of children) {
    const indent = "  ".repeat(depth);
    process.stdout.write(`${indent}[${child.id}] ${child.name}\n`);

    const nodeData = await getNodeContent(child.id);
    if (!nodeData) {
      results.push({
        umbId: child.id,
        name: child.name,
        error: "failed_to_fetch",
        depth,
        parentChain: [...parentChain],
        hasChildren: child.hasChildren,
      });
      continue;
    }

    const props = extractProperties(nodeData);
    const url = (nodeData.urls || [])[0] || null;
    const contentType = nodeData.contentTypeName || "";

    const isLesson = contentType === "שיעור" || (!child.hasChildren && contentType !== "Category");
    const isSeries = child.hasChildren || contentType === "סדרת שיעורים" || contentType === "Category";

    // Extract attachment URL
    let attachmentUrl = null;
    if (props.PDFs) {
      const mediaIdStr = String(props.PDFs).trim();
      const firstId = mediaIdStr.split(",")[0].trim();
      if (firstId && !isNaN(firstId)) {
        attachmentUrl = await getMediaUrl(parseInt(firstId));
      }
    }
    // Also check for audio/video/attachment properties
    const audioUrl = props.audioFile
      ? (typeof props.audioFile === "string" ? `${OLD_SITE}${props.audioFile}` : null)
      : null;
    const videoUrl = props.videoUrl || props.videoFile || null;

    const record = {
      umbId: child.id,
      name: child.name,
      url,
      depth,
      parentChain: [...parentChain],
      contentType,
      isLesson,
      isSeries,
      hasChildren: child.hasChildren,
      props: {
        title: props.title || null,
        promo: props.promo || null,
        content: props.content || null,
        creator: props.creator || null,
        teachersSubjects: props.teachersSubjects || null,
        dedication: props.dedication || null,
      },
      attachmentUrl,
      audioUrl,
      videoUrl,
    };

    if (child.hasChildren) {
      const childRecords = await walkTree(child.id, depth + 1, [
        ...parentChain,
        { id: child.id, name: child.name },
      ]);
      record.children = childRecords;
      record.childCount = childRecords.length;
    }

    results.push(record);

    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}

function flatten(nodes, acc = []) {
  for (const n of nodes) {
    acc.push(n);
    if (n.children) flatten(n.children, acc);
  }
  return acc;
}

async function main() {
  await login();

  console.log("\nWalking מאגר-עזרי-הלמידה tree (ID", MAAGAR_ROOT, ")...\n");
  const tree = await walkTree(MAAGAR_ROOT);

  const allNodes = flatten(tree);
  const seriesNodes = allNodes.filter((n) => n.isSeries && n.hasChildren);
  const lessonNodes = allNodes.filter((n) => n.isLesson && !n.hasChildren);

  const output = {
    scrapedAt: new Date().toISOString(),
    rootId: MAAGAR_ROOT,
    totalNodes: allNodes.length,
    totalSeries: seriesNodes.length,
    totalLessons: lessonNodes.length,
    tree,
  };

  const outPath = "scripts/teachers-scrape-result.json";
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved to ${outPath}`);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total nodes scraped: ${allNodes.length}`);
  console.log(`Series containers: ${seriesNodes.length}`);
  console.log(`Lesson nodes: ${lessonNodes.length}`);

  // Print series list
  console.log("\nSeries found:");
  for (const s of seriesNodes) {
    console.log(`  [${s.umbId}] (d=${s.depth}) ${s.name} — ${s.childCount} children`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
