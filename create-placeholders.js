#!/usr/bin/env node
// Creates placeholder assets for all missing files

const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, 'src/assets');
fs.mkdirSync(ASSETS, { recursive: true });

// Minimal 1x1 transparent PNG (base64)
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal valid JPEG 1x1 white pixel
const PLACEHOLDER_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB/8QAFBABAAAAAAAAAAAAAAAAAAAAev/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmX/9k=',
  'base64'
);

const images = [
  // PNGs
  'esther-hero-desktop.png',
  'esther-hero-mobile.png',
  'esther-book.png',
  'book-set.png',
  'hero-poster.png',
  'watercolor-book.png',
  'kriat-kivun-banner.png',
  'logo-centered-color.png',
  'logo-horizontal-color.png',
  'logo-horizontal-bright.png',
  'saadia-tefillin.png',
  'saadia-soldier.png',
];

const jpgs = [
  'hero-bg-bney-zion.jpg',
  'memorial-landscape-sunrise.jpg',
  'memorial-landscape-path.jpg',
  'memorial-torah-scroll.jpg',
  'memorial-saadia-hero.jpg',
  'esther-sunrise.jpg',
  'jerusalem-walls.jpg',
];

const videos = [
  'sunrise-hero.mp4',
  'journey-path.mp4',
];

for (const f of images) {
  const p = path.join(ASSETS, f);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, PLACEHOLDER_PNG);
    console.log(`✓ ${f}`);
  } else {
    console.log(`⚠ skipped (exists): ${f}`);
  }
}

for (const f of jpgs) {
  const p = path.join(ASSETS, f);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, PLACEHOLDER_JPG);
    console.log(`✓ ${f}`);
  } else {
    console.log(`⚠ skipped (exists): ${f}`);
  }
}

for (const f of videos) {
  const p = path.join(ASSETS, f);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, '');
    console.log(`✓ ${f} (empty placeholder)`);
  }
}

console.log('\nDone! Replace placeholder files with real assets.');
