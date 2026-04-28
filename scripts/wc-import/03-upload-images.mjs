#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const DB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwIjoyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk";
const sb = createClient(DB_URL, DB_KEY, { auth: { persistSession: false } });

const __dir = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = `${__dir}/snapshot.json`;
const MANIFEST = `${__dir}/image-manifest.json`;
const FAILURES = `${__dir}/image-failures.json`;
const BUCKET = "product-images";

console.log("=== Step 3: Upload images ===\n");

const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
const failures = [];

console.log(`existing manifest: ${Object.keys(manifest).length} URLs already uploaded`);

// 1. Collect every image URL we need
const urlsToUpload = new Map(); // url -> {key, productId, kind}

for (const p of snapshot.products) {
  // gallery images
  for (let i = 0; i < (p.images || []).length; i++) {
    const img = p.images[i];
    if (!img.src) continue;
    const ext = img.src.split("?")[0].split(".").pop().toLowerCase().slice(0, 5) || "jpg";
    urlsToUpload.set(img.src, {
      key: `wc/${p.id}/${i}.${ext}`,
      productId: p.id,
      kind: "gallery",
    });
  }
  // images inside description HTML
  const html = p.description || "";
  if (html.includes("<img")) {
    const $ = load(html);
    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (!src || !src.startsWith("http")) return;
      const ext = src.split("?")[0].split(".").pop().toLowerCase().slice(0, 5) || "jpg";
      const hash = createHash("md5").update(src).digest("hex").slice(0, 12);
      urlsToUpload.set(src, {
        key: `wc/inline/${hash}.${ext}`,
        productId: p.id,
        kind: "inline",
      });
    });
  }
}

console.log(`${urlsToUpload.size} unique image URLs to process`);

// 2. Upload (skip those already in manifest)
let uploaded = 0,
  skipped = 0;
const todo = [...urlsToUpload.entries()].filter(([url]) => !manifest[url]);
console.log(`${todo.length} new uploads (skipping ${urlsToUpload.size - todo.length} already done)\n`);

async function uploadOne([url, meta]) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get("content-type") || "image/jpeg";
    const { error } = await sb.storage.from(BUCKET).upload(meta.key, buf, {
      contentType: ct,
      upsert: true,
    });
    if (error) throw new Error(`upload: ${error.message}`);
    const { data } = sb.storage.from(BUCKET).getPublicUrl(meta.key);
    manifest[url] = data.publicUrl;
    uploaded++;
    if (uploaded % 5 === 0) process.stdout.write(`  ${uploaded}/${todo.length}\r`);
  } catch (e) {
    failures.push({ url, productId: meta.productId, kind: meta.kind, error: e.message });
    process.stdout.write(`  FAIL [${meta.productId}] ${url.slice(0, 60)}: ${e.message}\n`);
  }
}

// concurrency=5
const CONC = 5;
for (let i = 0; i < todo.length; i += CONC) {
  await Promise.all(todo.slice(i, i + CONC).map(uploadOne));
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
writeFileSync(FAILURES, JSON.stringify(failures, null, 2));

console.log(`\n\n=== Done ===`);
console.log(`✓ uploaded: ${uploaded}`);
console.log(`✓ manifest entries: ${Object.keys(manifest).length}`);
console.log(`${failures.length ? "✗" : "✓"} failures: ${failures.length}`);
if (failures.length) {
  console.log(`\nFailures saved to ${FAILURES}`);
  for (const f of failures.slice(0, 10)) console.log(`  [${f.productId}] ${f.kind}: ${f.error}`);
}
