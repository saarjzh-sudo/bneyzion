#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const sb = createClient(DB_URL, DB_KEY, { auth: { persistSession: false } });

const __dir = dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(readFileSync(`${__dir}/snapshot.json`, "utf8"));
const manifest = JSON.parse(readFileSync(`${__dir}/image-manifest.json`, "utf8"));

console.log("=== Step 4: Import to DB ===\n");

// HTML entity decode
function decode(s) {
  if (!s) return s;
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  if (!html) return "";
  return decode(html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

// Replace WP image URLs in HTML with Supabase URLs from manifest
function rewriteImages(html) {
  if (!html || !html.includes("<img")) return html;
  const $ = load(html, null, false);
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (src && manifest[src]) $(el).attr("src", manifest[src]);
    // strip WP-specific srcset (smaller versions don't exist on Supabase)
    $(el).removeAttr("srcset").removeAttr("sizes");
  });
  return $.html();
}

// Categories that should mark a product as digital
const DIGITAL_CAT_IDS = new Set([18, 19, 56, 138]); // ספרים דיגיטליים, קורסים דיגיטליים, מנוי, ימי עיון

// 1. Insert categories — slug stays as WC slug (already a clean english-friendly handle)
const catsToInsert = snapshot.categories.map((c, i) => ({
  name: decode(c.name),
  slug: c.slug, // WC categories have ASCII slugs like 'sefarim', 'sefarim-digital'
  description: decode(c.description) || null,
  sort_order: i,
}));

console.log("Inserting categories:");
const { data: insertedCats, error: catErr } = await sb
  .from("product_categories")
  .insert(catsToInsert)
  .select("id, slug, name");
if (catErr) {
  console.error("category insert FAIL:", catErr.message);
  process.exit(1);
}
for (const c of insertedCats) console.log(`  ✓ [${c.slug}] ${c.name}`);

// Build map: WC category id → Supabase uuid
const wcCatToUuid = {};
for (const wcCat of snapshot.categories) {
  const match = insertedCats.find((c) => c.slug === wcCat.slug);
  if (match) wcCatToUuid[wcCat.id] = match.id;
}

// 2. Build products
const productsToInsert = [];
for (const p of snapshot.products) {
  // skip Donation (handled by /donate page)
  if (p.id === 1745 || /donation/i.test(p.name)) {
    console.log(`  ⊘ skipping non-shop product: [${p.id}] ${p.name}`);
    continue;
  }

  const wcCatIds = snapshot.productToCat[p.id] || [];
  const primaryWcCat = wcCatIds[0];
  const categoryUuid = primaryWcCat ? wcCatToUuid[primaryWcCat] : null;

  // images: first → image_url, rest → gallery_urls
  const imageUrls = (p.images || [])
    .map((img) => manifest[img.src])
    .filter(Boolean);
  const imageUrl = imageUrls[0] || null;
  const galleryUrls = imageUrls.slice(1);

  // prices are in minor units (cents/agorot)
  const minorUnit = p.prices?.currency_minor_unit ?? 2;
  const divisor = Math.pow(10, minorUnit);
  const price = p.prices?.price ? parseInt(p.prices.price, 10) / divisor : 0;
  const regular = p.prices?.regular_price ? parseInt(p.prices.regular_price, 10) / divisor : null;
  const originalPrice = p.on_sale && regular && regular > price ? regular : null;

  const isDigital = wcCatIds.some((id) => DIGITAL_CAT_IDS.has(id));

  productsToInsert.push({
    title: decode(p.name),
    slug: `wc-${p.id}`, // short, predictable, unique — Saar said SEO not critical
    description: stripTags(p.short_description) || null,
    content: rewriteImages(decode(p.description)) || null,
    price,
    original_price: originalPrice,
    image_url: imageUrl,
    gallery_urls: galleryUrls.length ? galleryUrls : null,
    category_id: categoryUuid,
    product_type: "simple",
    is_digital: isDigital,
    source_url: p.permalink,
    status: "active",
    featured: false,
    sort_order: snapshot.products.indexOf(p),
  });
}

console.log(`\nInserting ${productsToInsert.length} products...`);
const { data: insertedProducts, error: prodErr } = await sb
  .from("products")
  .insert(productsToInsert)
  .select("id, slug, title, price");
if (prodErr) {
  console.error("product insert FAIL:", prodErr.message);
  // dump for inspection
  writeFileSync(`${__dir}/import-failed-payload.json`, JSON.stringify(productsToInsert, null, 2));
  console.error("payload dumped to import-failed-payload.json");
  process.exit(1);
}

console.log(`✓ inserted ${insertedProducts.length} products\n`);
console.log("Sample (first 5):");
for (const p of insertedProducts.slice(0, 5)) {
  console.log(`  ${p.slug} — ${p.title.slice(0, 50)} — ₪${p.price}`);
}

// 3. Final verification
const { count: pc } = await sb.from("products").select("*", { count: "exact", head: true });
const { count: cc } = await sb.from("product_categories").select("*", { count: "exact", head: true });
const { count: noImage } = await sb.from("products").select("*", { count: "exact", head: true }).is("image_url", null);
const { count: noCat } = await sb.from("products").select("*", { count: "exact", head: true }).is("category_id", null);

console.log(`\n=== Final state ===`);
console.log(`products: ${pc}`);
console.log(`categories: ${cc}`);
console.log(`products without image: ${noImage}`);
console.log(`products without category: ${noCat}`);
