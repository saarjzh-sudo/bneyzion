#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const sb = createClient(DB_URL, DB_KEY, { auth: { persistSession: false } });

console.log("=== Step 1: Wipe + prepare ===\n");

// 1. Create bucket if missing (Saar said all existing data can go)
const { data: buckets } = await sb.storage.listBuckets();
if (!buckets.find((b) => b.name === "product-images")) {
  const { error } = await sb.storage.createBucket("product-images", {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  });
  if (error) {
    console.error("bucket create FAIL:", error.message);
    process.exit(1);
  }
  console.log("✓ created bucket product-images (public)");
} else {
  console.log("✓ bucket product-images exists");
}

// 2. Wipe products first (FK to categories)
const { count: pBefore } = await sb.from("products").select("*", { count: "exact", head: true });
const { error: pErr } = await sb.from("products").delete().not("id", "is", null);
if (pErr) {
  console.error("products wipe FAIL:", pErr.message);
  process.exit(1);
}
const { count: pAfter } = await sb.from("products").select("*", { count: "exact", head: true });
console.log(`✓ wiped products: ${pBefore} → ${pAfter}`);

// 3. Wipe categories
const { count: cBefore } = await sb.from("product_categories").select("*", { count: "exact", head: true });
const { error: cErr } = await sb.from("product_categories").delete().not("id", "is", null);
if (cErr) {
  console.error("categories wipe FAIL:", cErr.message);
  process.exit(1);
}
const { count: cAfter } = await sb.from("product_categories").select("*", { count: "exact", head: true });
console.log(`✓ wiped product_categories: ${cBefore} → ${cAfter}`);

console.log("\n=== Done ===");
