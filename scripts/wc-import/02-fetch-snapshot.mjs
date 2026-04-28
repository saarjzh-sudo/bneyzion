#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const WC = "https://club.bneyzion.co.il/wp-json/wc/store/v1";
const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dir}/snapshot.json`;

console.log("=== Step 2: Fetch WC snapshot ===\n");

async function jget(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// 1. All products (page through to be safe)
const products = [];
for (let page = 1; page <= 10; page++) {
  const r = await fetch(`${WC}/products?per_page=100&page=${page}`);
  if (!r.ok) {
    console.log(`page ${page}: ${r.status} — stopping`);
    break;
  }
  const batch = await r.json();
  if (!batch.length) break;
  products.push(...batch);
  console.log(`page ${page}: +${batch.length} (total ${products.length})`);
  if (batch.length < 100) break;
}
console.log(`\n✓ ${products.length} products fetched\n`);

// 2. All categories
const categories = await jget(`${WC}/products/categories?per_page=100`);
console.log(`✓ ${categories.length} categories fetched`);
for (const c of categories) console.log(`    [${c.id}] ${c.name} (${c.count} products)`);

// 3. Build product → categories mapping by querying per-category
//    (the products endpoint returns empty `categories` for ~half the products)
console.log(`\nBuilding product→category mapping (per-cat queries)...`);
const productToCat = {}; // {productId: [categoryId, ...]}
for (const cat of categories) {
  const items = await jget(`${WC}/products?category=${cat.id}&per_page=100`);
  for (const p of items) {
    if (!productToCat[p.id]) productToCat[p.id] = [];
    if (!productToCat[p.id].includes(cat.id)) productToCat[p.id].push(cat.id);
  }
  console.log(`    [${cat.id}] ${cat.name}: ${items.length} products`);
}

const mapped = Object.keys(productToCat).length;
const unmapped = products.filter((p) => !productToCat[p.id]);
console.log(`\n✓ ${mapped}/${products.length} products mapped to categories`);
if (unmapped.length) {
  console.log(`⚠ ${unmapped.length} products WITHOUT category:`);
  for (const p of unmapped) console.log(`    [${p.id}] ${p.name}`);
}

// 4. Save snapshot
const snapshot = {
  fetched_at: new Date().toISOString(),
  source: "https://club.bneyzion.co.il",
  products,
  categories,
  productToCat,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
console.log(`\n✓ snapshot saved: ${OUT}`);
console.log(`  size: ${(JSON.stringify(snapshot).length / 1024).toFixed(1)} KB`);
