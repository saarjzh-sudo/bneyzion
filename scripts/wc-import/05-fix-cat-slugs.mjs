#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const sb = createClient(DB_URL, DB_KEY, { auth: { persistSession: false } });

console.log("=== Step 5: Clean category slugs ===\n");

// Map by Hebrew name → clean english slug
const slugMap = {
  "הספרים שעוד לא יצאו": "upcoming",
  "חמישה חומשי תורה": "torah",
  "ימי עיון": "events",
  "כתובים": "ketuvim",
  "מנוי": "membership",
  "נביאים": "neviim",
  "נושאי יסוד בתנ\"ך": "foundations",
  "ספרים": "books",
  "ספרים דיגיטליים": "books-digital",
  "קורסים דיגיטליים בתנ\"ך": "courses",
};

const { data: cats } = await sb.from("product_categories").select("id, name, slug");
for (const c of cats) {
  const newSlug = slugMap[c.name];
  if (!newSlug) {
    console.log(`  ⊘ no mapping for "${c.name}"`);
    continue;
  }
  if (c.slug === newSlug) {
    console.log(`  = already ${newSlug}`);
    continue;
  }
  const { error } = await sb.from("product_categories").update({ slug: newSlug }).eq("id", c.id);
  if (error) console.log(`  ✗ ${c.name}: ${error.message}`);
  else console.log(`  ✓ ${c.name}: ${c.slug.slice(0, 25)}... → ${newSlug}`);
}

console.log("\nFinal categories:");
const { data: final } = await sb.from("product_categories").select("slug, name").order("sort_order");
for (const c of final) console.log(`  /${c.slug}  —  ${c.name}`);
