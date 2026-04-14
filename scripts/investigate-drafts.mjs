#!/usr/bin/env node
/**
 * Investigate the 521 remaining draft lessons
 * For each: check if it exists in Umbraco tree (by name)
 * Result categorization:
 *   - exists_in_umbraco: draft has matching node, scrape probably missed it
 *   - missing_in_umbraco: draft was deleted/never published on old site
 *   - duplicate_title: title collides with other lessons
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
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

async function main() {
  console.log("=== Investigate 521 Draft Lessons ===\n");

  // Load Umbraco index
  const idx = JSON.parse(readFileSync("scripts/umbraco-index.json", "utf-8"));
  const umbByName = new Map();
  for (const item of idx) {
    const key = normalize(item.name);
    if (!umbByName.has(key)) umbByName.set(key, []);
    umbByName.get(key).push(item);
  }
  console.log(`Umbraco index: ${idx.length} items, ${umbByName.size} unique names`);

  // Load all drafts
  const drafts = [];
  let offset = 0;
  while (true) {
    const { data } = await db
      .from("lessons")
      .select("id, title, source_type, rabbi_id")
      .eq("status", "draft")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    drafts.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Loaded ${drafts.length} drafts\n`);

  const results = {
    total: drafts.length,
    exists_in_umbraco: [],
    missing_in_umbraco: [],
  };

  for (const draft of drafts) {
    const key = normalize(draft.title);
    const matches = umbByName.get(key);

    if (matches && matches.length > 0) {
      results.exists_in_umbraco.push({
        id: draft.id,
        title: draft.title,
        source_type: draft.source_type,
        umbId: matches[0].id,
        umbUrl: decodeURIComponent(matches[0].url),
      });
    } else {
      results.missing_in_umbraco.push({
        id: draft.id,
        title: draft.title,
        source_type: draft.source_type,
      });
    }
  }

  console.log("=== Results ===");
  console.log(`Drafts that EXIST in Umbraco (scrape missed them): ${results.exists_in_umbraco.length}`);
  console.log(`Drafts MISSING from Umbraco (deleted/never published): ${results.missing_in_umbraco.length}`);

  if (results.exists_in_umbraco.length > 0) {
    console.log("\n=== Sample of Umbraco-existing drafts ===");
    for (const d of results.exists_in_umbraco.slice(0, 10)) {
      console.log(`  [${d.source_type}] ${d.title.substring(0, 60)}`);
      console.log(`    URL: ${d.umbUrl.substring(0, 100)}`);
    }
  }

  console.log("\n=== Sample of truly missing drafts ===");
  for (const d of results.missing_in_umbraco.slice(0, 10)) {
    console.log(`  [${d.source_type}] ${d.title.substring(0, 70)}`);
  }

  writeFileSync("scripts/draft-investigation.json", JSON.stringify(results, null, 2));
  console.log("\nFull report: scripts/draft-investigation.json");
}

main().catch(console.error);
