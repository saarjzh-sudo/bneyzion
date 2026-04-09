#!/usr/bin/env node
/**
 * bneyzion data migration: Lovable Supabase → own Supabase
 * Reads from old project (anon key) and writes to new project (service_role key)
 *
 * Usage: node scripts/migrate-data.mjs
 */

import { createClient } from "@supabase/supabase-js";

// OLD project (Lovable) — read only via anon key
const OLD_URL = "https://fhdcmsmwvssjzhqocaai.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZGNtc213dnNzanpocW9jYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkzOTIsImV4cCI6MjA4NjQ4NTM5Mn0.xnW-jGhv7eO0a2yEdfgKVFvbjR77fes_V6UvuamCJpQ";

// NEW project (Saar's own) — full write via service_role key
const NEW_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";

const oldDb = createClient(OLD_URL, OLD_KEY);
const newDb = createClient(NEW_URL, NEW_KEY);

// Tables in FK-dependency order
// onConflict tells upsert which column(s) to match on
const TABLES = [
  // Tier 0
  { name: "rabbis", onConflict: "id" },
  { name: "topics", onConflict: "id" },
  { name: "product_categories", onConflict: "id" },
  { name: "site_settings", onConflict: "key" },
  { name: "profiles", onConflict: "id" },
  { name: "contact_messages", onConflict: "id" },
  { name: "coupons", onConflict: "id" },
  { name: "donations", onConflict: "id" },
  { name: "migration_batches", onConflict: "id" },
  { name: "migration_items", onConflict: "id" },
  { name: "migration_redirects", onConflict: "id" },
  { name: "orders", onConflict: "id" },
  { name: "community_members", onConflict: "id" },
  { name: "user_points", onConflict: "id" },
  { name: "user_points_log", onConflict: "id" },
  { name: "user_daily_activity", onConflict: "id" },
  { name: "user_notifications", onConflict: "id" },
  { name: "user_roles", onConflict: "id" },
  { name: "weekly_challenges", onConflict: "id" },
  // Tier 1
  { name: "series", onConflict: "id" },
  { name: "community_courses", onConflict: "id" },
  { name: "migration_logs", onConflict: "id" },
  { name: "products", onConflict: "id" },
  { name: "user_challenge_progress", onConflict: "id" },
  // Tier 2
  { name: "lessons", onConflict: "id" },
  { name: "series_links", onConflict: "id" },
  { name: "community_course_lessons", onConflict: "id" },
  { name: "course_sessions", onConflict: "id" },
  { name: "order_items", onConflict: "id" },
  { name: "course_enrollments", onConflict: "id" },
  { name: "community_member_courses", onConflict: "id" },
  // Tier 3
  { name: "lesson_topics", onConflict: "lesson_id,topic_id" },
  { name: "lesson_comments", onConflict: "id" },
  { name: "lesson_dedications", onConflict: "id" },
  { name: "user_favorites", onConflict: "id" },
  { name: "user_history", onConflict: "id" },
  { name: "user_enrollments", onConflict: "id" },
  { name: "user_favorite_rabbis", onConflict: "id" },
  { name: "user_favorite_series", onConflict: "id" },
];

const PAGE_SIZE = 1000;
const BATCH_SIZE = 500;

async function fetchAll(table) {
  const rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await oldDb
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(`  ERROR reading ${table}: ${error.message}`);
      return rows;
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function upsertBatch(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await newDb
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false });

    if (error) {
      console.error(`  ERROR writing ${table} (batch ${i / BATCH_SIZE + 1}): ${error.message}`);
      // Try one-by-one for failed batch
      let succeeded = 0;
      for (const row of batch) {
        const { error: e2 } = await newDb
          .from(table)
          .upsert([row], { onConflict, ignoreDuplicates: true });
        if (!e2) succeeded++;
      }
      console.log(`  Recovered ${succeeded}/${batch.length} rows individually`);
    }
  }
}

async function migrateTable({ name, onConflict }) {
  process.stdout.write(`${name}: reading... `);
  const rows = await fetchAll(name);
  if (rows.length === 0) {
    console.log("0 rows (empty or RLS blocked)");
    return { name, read: 0, status: "empty" };
  }
  process.stdout.write(`${rows.length} rows → writing... `);
  await upsertBatch(name, rows, onConflict);
  console.log("done");
  return { name, read: rows.length, status: "ok" };
}

async function verify() {
  console.log("\n=== VERIFICATION ===\n");
  const results = [];
  for (const { name } of TABLES) {
    const { count: oldCount } = await oldDb.from(name).select("*", { count: "exact", head: true });
    const { count: newCount } = await newDb.from(name).select("*", { count: "exact", head: true });
    const match = oldCount === newCount ? "OK" : "MISMATCH";
    console.log(`${name}: old=${oldCount ?? "?"} new=${newCount ?? "?"} ${match}`);
    results.push({ name, old: oldCount, new: newCount, match });
  }
  const mismatches = results.filter((r) => r.match !== "OK");
  if (mismatches.length > 0) {
    console.log(`\n${mismatches.length} tables with mismatches!`);
  } else {
    console.log("\nAll tables match!");
  }
}

async function main() {
  console.log("=== bneyzion Supabase Migration ===");
  console.log(`From: ${OLD_URL}`);
  console.log(`To:   ${NEW_URL}\n`);

  const mode = process.argv[2] || "migrate";

  if (mode === "verify") {
    await verify();
    return;
  }

  // Migrate all tables
  const report = [];
  for (const table of TABLES) {
    const result = await migrateTable(table);
    report.push(result);
  }

  // Summary
  console.log("\n=== SUMMARY ===\n");
  const total = report.reduce((sum, r) => sum + r.read, 0);
  const empty = report.filter((r) => r.status === "empty");
  console.log(`Total rows migrated: ${total}`);
  console.log(`Tables with data: ${report.length - empty.length}/${report.length}`);
  if (empty.length > 0) {
    console.log(`Empty/blocked tables: ${empty.map((e) => e.name).join(", ")}`);
  }

  // Auto-verify
  await verify();
}

main().catch(console.error);
