#!/usr/bin/env node
/**
 * Import "הפרק השבועי" subscribers from Smoove → user_access_tags
 *
 * Source:  Smoove list 1045078 ("הפרק השבועי - תכנית מנויים")
 * Target:  Supabase `user_access_tags` table (must exist — run weekly_program_foundation.sql first)
 *
 * For each Smoove contact:
 *  1. Check if a Supabase auth user with that email exists.
 *  2. If yes  → insert/upsert user_access_tags with user_id + email, pending_user_link=false
 *  3. If no   → insert/upsert with user_id=NULL, email=contact.email, pending_user_link=true
 *
 * The "pending_user_link" rows are resolved when the user registers —
 * the app layer (or an edge function) should match by email and flip the flag.
 *
 * Usage:
 *   env -u HTTPS_PROXY -u HTTP_PROXY node scripts/import-weekly-chapter-subscribers.mjs
 *   env -u HTTPS_PROXY -u HTTP_PROXY node scripts/import-weekly-chapter-subscribers.mjs --dry-run
 *   env -u HTTPS_PROXY -u HTTP_PROXY node scripts/import-weekly-chapter-subscribers.mjs --limit=50
 *
 * Iron rules:
 *  - NEVER run without migration 20260430_weekly_program_foundation.sql applied first
 *  - Always do --dry-run before actual import
 *  - Check output numbers before confirming to Saar
 */

import { createClient } from "@supabase/supabase-js";
import https from "node:https";

// ── Supabase (service_role — bypasses RLS) ────────────────────────────────────
const SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const SUPABASE_SERVICE_ROLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";

// ── Smoove ─────────────────────────────────────────────────────────────────────
const SMOOVE_API_KEY = "3283291e-4a55-47d1-8558-33bbac74a985";
const SMOOVE_LIST_ID = 1045078; // "הפרק השבועי - תכנית מנויים"
const SMOOVE_BASE = "https://rest.smoove.io";

// ── Constants ──────────────────────────────────────────────────────────────────
const ACCESS_TAG = "program:weekly-chapter";
const PAGE_SIZE = 100;

// ── Args ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT_ARG = args.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;

if (DRY_RUN) {
  console.log("⚠️  DRY RUN — no data will be written to Supabase.");
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function smooveFetch(path) {
  return new Promise((resolve, reject) => {
    const url = `${SMOOVE_BASE}${path}`;
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: SMOOVE_API_KEY,
          Accept: "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function fetchAllContacts() {
  const contacts = [];
  let offset = 0;

  while (true) {
    const page = await smooveFetch(
      `/v1/Lists/${SMOOVE_LIST_ID}/Contacts?limit=${PAGE_SIZE}&offset=${offset}`
    );
    if (!Array.isArray(page) || page.length === 0) break;
    contacts.push(...page);
    console.log(`  Fetched ${contacts.length} contacts so far...`);
    if (page.length < PAGE_SIZE) break; // last page
    if (contacts.length >= LIMIT) break;
    offset += PAGE_SIZE;
  }

  return contacts.slice(0, LIMIT);
}

async function findSupabaseUserByEmail(supabase, email) {
  // We use the admin API to look up users by email
  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
    page: 1,
  });

  // NOTE: for large user counts we'd need to paginate. Currently only 2 users,
  // so this is fine. When user count grows, switch to a profiles table lookup.
  if (error) return null;
  const match = data.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  return match || null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  console.log(`Fetching Smoove list ${SMOOVE_LIST_ID}...`);
  const contacts = await fetchAllContacts();
  console.log(`\nTotal contacts from Smoove: ${contacts.length}`);

  if (contacts.length === 0) {
    console.log("No contacts found. Exiting.");
    return;
  }

  // Load all Supabase auth users once (avoid N API calls)
  console.log("Loading Supabase auth users...");
  const { data: authData, error: authError } =
    await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 });
  if (authError) {
    console.error("Failed to load Supabase users:", authError.message);
    console.log("Continuing with pending_user_link=true for all contacts.");
  }

  const usersByEmail = new Map();
  (authData?.users || []).forEach((u) => {
    if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
  });
  console.log(`  ${usersByEmail.size} Supabase users loaded.`);

  // Build upsert rows
  let linkedCount = 0;
  let pendingCount = 0;
  let skippedNoEmail = 0;

  const rows = [];
  for (const contact of contacts) {
    const email = contact.email?.trim();
    if (!email) {
      skippedNoEmail++;
      continue;
    }

    const supabaseUser = usersByEmail.get(email.toLowerCase());

    if (supabaseUser) {
      rows.push({
        user_id: supabaseUser.id,
        email: email.toLowerCase(),
        tag: ACCESS_TAG,
        source: "smoove_import",
        pending_user_link: false,
        notes: `Imported from Smoove list ${SMOOVE_LIST_ID} on ${new Date().toISOString().slice(0, 10)}`,
      });
      linkedCount++;
    } else {
      rows.push({
        user_id: null,
        email: email.toLowerCase(),
        tag: ACCESS_TAG,
        source: "smoove_import",
        pending_user_link: true,
        notes: `Imported from Smoove list ${SMOOVE_LIST_ID} on ${new Date().toISOString().slice(0, 10)}. Pending user registration.`,
      });
      pendingCount++;
    }
  }

  console.log(`\nBreakdown:`);
  console.log(`  Linked to Supabase user: ${linkedCount}`);
  console.log(`  Pending user registration: ${pendingCount}`);
  console.log(`  Skipped (no email): ${skippedNoEmail}`);
  console.log(`  Total rows to upsert: ${rows.length}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] First 3 rows that would be written:");
    rows.slice(0, 3).forEach((r, i) => {
      console.log(`  [${i + 1}]`, JSON.stringify(r, null, 2));
    });
    console.log("\nDry run complete. Run without --dry-run to apply.");
    return;
  }

  // Upsert in batches of 50
  const BATCH = 50;
  let upsertedTotal = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("user_access_tags")
      .upsert(batch, {
        onConflict: "email,tag",
        ignoreDuplicates: false, // update valid_until if already exists
      });

    if (error) {
      console.error(`  Batch ${i / BATCH + 1} error:`, error.message);
      errorCount += batch.length;
    } else {
      upsertedTotal += batch.length;
      process.stdout.write(`\r  Upserted ${upsertedTotal}/${rows.length}...`);
    }
  }

  console.log(`\n\nImport complete.`);
  console.log(`  Successfully upserted: ${upsertedTotal}`);
  if (errorCount > 0) {
    console.log(`  Errors: ${errorCount} (check output above)`);
  }

  // Verify
  const { count } = await supabase
    .from("user_access_tags")
    .select("*", { count: "exact", head: true })
    .eq("tag", ACCESS_TAG);
  console.log(`\nVerification: ${count} rows in user_access_tags with tag="${ACCESS_TAG}"`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
