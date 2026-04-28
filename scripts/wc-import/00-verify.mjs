#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const sb = createClient(DB_URL, DB_KEY, { auth: { persistSession: false } });

console.log("=== Supabase state check ===\n");

const { count: pc, error: e1 } = await sb.from("products").select("*", { count: "exact", head: true });
const { count: cc, error: e2 } = await sb.from("product_categories").select("*", { count: "exact", head: true });
console.log(`products table: ${e1 ? "ERR " + e1.message : pc + " rows"}`);
console.log(`product_categories table: ${e2 ? "ERR " + e2.message : cc + " rows"}`);

const { data: buckets, error: be } = await sb.storage.listBuckets();
if (be) console.log("buckets ERR:", be.message);
else {
  console.log("\nBuckets:");
  for (const b of buckets) console.log(`  ${b.name} (public: ${b.public})`);
  const target = buckets.find((b) => b.name === "product-images");
  if (!target) console.log("\n⚠ product-images bucket missing — will create");
  else if (!target.public) console.log("\n⚠ product-images is PRIVATE — image URLs won't work in browser");
}

console.log("\n=== WC source check ===");
const r = await fetch("https://club.bneyzion.co.il/wp-json/wc/store/v1/products?per_page=1");
console.log(`WC API: ${r.status}  total=${r.headers.get("x-wp-total")}`);
