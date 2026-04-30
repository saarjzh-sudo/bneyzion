/**
 * insert-riddles.mjs
 *
 * Inserts the 18 scraped riddle lessons into Supabase under
 * series_id = c852edd8-d959-4c8d-bf7e-17b5881275fa
 *
 * Source: scripts/riddles-scraped.json (checkpoint from scraping session)
 *
 * Run:
 *   env -u HTTPS_PROXY -u HTTP_PROXY node scripts/insert-riddles.mjs
 *   env -u HTTPS_PROXY -u HTTP_PROXY node scripts/insert-riddles.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE INSERT"}`);
  console.log("---");

  // Load checkpoint
  const checkpointPath = join(__dirname, "riddles-scraped.json");
  const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf-8"));

  const SERIES_ID = checkpoint.series_id;
  console.log(`Series ID: ${SERIES_ID}`);
  console.log(`Total rows in checkpoint: ${checkpoint.results.length}`);
  console.log("---");

  // First: check which titles already exist to avoid duplicates
  const titles = checkpoint.results.map((r) => r.row.title);
  const { data: existing, error: existingErr } = await supabase
    .from("lessons")
    .select("id, title")
    .eq("series_id", SERIES_ID)
    .in("title", titles);

  if (existingErr) {
    console.error("Error checking existing rows:", existingErr.message);
    process.exit(1);
  }

  const existingTitles = new Set((existing || []).map((e) => e.title));
  console.log(`Already in DB: ${existingTitles.size} rows`);
  if (existingTitles.size > 0) {
    console.log("  Existing:", [...existingTitles].join(", "));
  }
  console.log("---");

  // Build rows to insert (skip already existing)
  const rowsToInsert = checkpoint.results
    .filter((r) => !existingTitles.has(r.row.title))
    .map((r) => ({
      series_id: r.row.series_id,
      title: r.row.title,
      description: r.row.description,
      content: r.row.content,
      status: r.row.status,
      source_type: r.row.source_type,
      rabbi_id: r.row.rabbi_id,
      audio_url: r.row.audio_url,
      video_url: r.row.video_url,
      attachment_url: r.row.attachment_url,
      duration: r.row.duration,
    }));

  console.log(`Rows to insert: ${rowsToInsert.length}`);
  rowsToInsert.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title} (${r.content?.length || 0} chars)`);
  });

  if (rowsToInsert.length === 0) {
    console.log("Nothing to insert — all rows already exist.");
    return;
  }

  if (isDryRun) {
    console.log("\n[DRY RUN] No rows written. Run without --dry-run to insert.");
    return;
  }

  console.log("\nInserting...");

  // Insert in batches of 5 to avoid payload limits
  const BATCH_SIZE = 5;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
    const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("lessons")
      .insert(batch)
      .select("id, title");

    if (error) {
      console.error(
        `Batch ${i / BATCH_SIZE + 1} FAILED:`,
        error.message,
        error.details
      );
      batch.forEach((r) => console.error(`  - ${r.title}`));
      failed += batch.length;
    } else {
      console.log(`Batch ${i / BATCH_SIZE + 1} OK:`);
      (data || []).forEach((r) => console.log(`  + ${r.title} [${r.id}]`));
      inserted += batch.length;
    }
  }

  console.log("---");
  console.log(`Done. Inserted: ${inserted} | Failed: ${failed}`);

  if (failed === 0) {
    // Verify total count in series
    const { count } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("series_id", SERIES_ID)
      .eq("status", "published");
    console.log(
      `Total published lessons in series after insert: ${count}`
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
