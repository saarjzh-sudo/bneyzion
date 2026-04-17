#!/usr/bin/env node
/**
 * Umbraco admin recovery — pulls full content via GetById for empty drafts.
 * yoav now has admin role → can extract content, promo, author, audioFile, videoUrl.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";

const DB = createClient(
  "https://pzvmwfexeiruelwiujxn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk"
);
const UMB = "https://www.bneyzion.co.il";

const normalize = (s) =>
  (s || "").trim().replace(/''/g, '"').replace(/["״״'`ʼ]/g, '"').replace(/["']/g, '"')
    .replace(/\s+/g, " ").replace(/\u200f|\u200e|\u00a0/g, "").toLowerCase().trim();

const parseUmb = (b) => JSON.parse(b.replace(/^\)\]\}',?\s*/, ""));

async function login() {
  const r = await fetch(`${UMB}/umbraco/backoffice/UmbracoApi/Authentication/PostLogin`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "yoav", password: "5W;3N)g8Iq" }),
  });
  const cookies = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const xsrf = cookies.match(/XSRF-TOKEN=([^;]+)/)[1];
  return { cookies, xsrf };
}

async function getNode(id, session) {
  const r = await fetch(`${UMB}/umbraco/backoffice/UmbracoApi/Content/GetById?id=${id}`, {
    headers: { Cookie: session.cookies, "X-XSRF-TOKEN": session.xsrf },
  });
  if (!r.ok) return null;
  return parseUmb(await r.text());
}

// Extract props from Umbraco node into a flat map
function flattenProps(node) {
  const out = {};
  for (const tab of node.tabs || []) {
    for (const p of tab.properties || []) {
      out[p.alias] = p.value;
    }
  }
  return out;
}

// Extract media URL from Umbraco property value (can be a media picker object or a raw URL)
function extractMediaUrl(value) {
  if (!value) return null;
  if (typeof value === "string") {
    // Strip HTML, look for URL
    const m = value.match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0] : null;
  }
  if (value.src || value.url) return value.src || value.url;
  if (Array.isArray(value) && value[0]?.src) return value[0].src;
  return null;
}

async function main() {
  console.log("=== Umbraco Admin Content Recovery ===\n");
  const session = await login();
  console.log("✓ Logged in with admin rights\n");

  // Load Umbraco index for name → ID mapping
  const idx = JSON.parse(readFileSync("scripts/umbraco-index.json", "utf-8"));
  const idxByName = new Map();
  for (const item of idx) {
    const key = normalize(item.name);
    if (!idxByName.has(key)) idxByName.set(key, item);
  }

  // Load all 461 empty drafts
  const drafts = [];
  let offset = 0;
  while (true) {
    const { data } = await DB.from("lessons").select("id,title,source_type")
      .eq("status", "draft").is("content", null).is("audio_url", null)
      .is("video_url", null).is("attachment_url", null)
      .range(offset, offset + 999);
    if (!data?.length) break;
    drafts.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Empty drafts to recover: ${drafts.length}\n`);

  let recovered = 0, notInUmb = 0, errors = 0;
  const log = [];

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const match = idxByName.get(normalize(d.title));
    if (!match) {
      notInUmb++;
      log.push({ id: d.id, title: d.title, status: "not_in_umbraco" });
      continue;
    }

    try {
      const node = await getNode(match.id, session);
      if (!node) { errors++; continue; }
      const props = flattenProps(node);
      const updates = { status: "published" };
      let foundAny = false;

      // Text content
      if (props.content && typeof props.content === "string" && props.content.length > 20) {
        updates.content = props.content;
        foundAny = true;
      }
      // Description (promo)
      if (props.promo && typeof props.promo === "string" && props.promo.length > 5) {
        updates.description = props.promo;
        foundAny = true;
      }
      // Audio
      const audio = extractMediaUrl(props.audioFile || props.audio || props.audioUrl);
      if (audio) { updates.audio_url = audio; foundAny = true; }
      // Video
      const video = extractMediaUrl(props.videoUrl || props.video || props.vp4URL);
      if (video) { updates.video_url = video; foundAny = true; }
      // PDF
      const pdf = extractMediaUrl(props.attachment || props.pdf || props.attachmentFile);
      if (pdf) { updates.attachment_url = pdf; foundAny = true; }
      // Source type
      if (updates.video_url) updates.source_type = "video";
      else if (updates.audio_url) updates.source_type = "audio";
      else if (updates.content) updates.source_type = "article";

      if (!foundAny) {
        log.push({ id: d.id, title: d.title, status: "umbraco_has_no_content",
                   propKeys: Object.keys(props).filter(k => !k.startsWith("_umb_")) });
        continue;
      }

      const { error } = await DB.from("lessons").update(updates).eq("id", d.id);
      if (error) { errors++; continue; }

      recovered++;
      log.push({ id: d.id, title: d.title, status: "recovered",
                 hasContent: !!updates.content, hasAudio: !!updates.audio_url,
                 hasVideo: !!updates.video_url, hasPdf: !!updates.attachment_url });
    } catch (e) {
      errors++;
      log.push({ id: d.id, title: d.title, status: "error", error: e.message });
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  Progress: ${i + 1}/${drafts.length}  recovered=${recovered}  not_in_umb=${notInUmb}  errors=${errors}`);
    }
  }

  console.log("\n=== DONE ===");
  console.log(`Recovered: ${recovered}`);
  console.log(`Not in Umbraco index: ${notInUmb}`);
  console.log(`Errors: ${errors}`);
  writeFileSync("scripts/umbraco-admin-recovery-log.json", JSON.stringify(log, null, 2));
  console.log(`Log: scripts/umbraco-admin-recovery-log.json`);
}

main().catch(console.error);
