/**
 * Dynamic sitemap for bneyzion.co.il
 *
 * Builds an XML sitemap from Supabase: static routes + published lessons,
 * series, rabbis, and Bible books. Excludes /admin, /api, dev pages, and
 * the store flow (rebuilt in a separate session).
 *
 * Cached at the edge for 1h. Soft cap of 45k URLs to stay under Google's
 * 50k-per-sitemap limit; if we ever exceed that we'll split by section.
 */

import { createClient } from '@supabase/supabase-js';

const SITE = 'https://bneyzion.co.il';

// Books we render under /bible/:book — keep aligned with src/lib/bible-books.ts
const BIBLE_BOOKS = [
  'בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים',
  'יהושע', 'שופטים', 'שמואל א', 'שמואל ב', 'מלכים א', 'מלכים ב',
  'ישעיהו', 'ירמיהו', 'יחזקאל', 'הושע', 'יואל', 'עמוס', 'עובדיה',
  'יונה', 'מיכה', 'נחום', 'חבקוק', 'צפניה', 'חגי', 'זכריה', 'מלאכי',
  'תהילים', 'משלי', 'איוב', 'שיר השירים', 'רות', 'איכה', 'קהלת', 'אסתר',
  'דניאל', 'עזרא', 'נחמיה', 'דברי הימים א', 'דברי הימים ב',
];

const STATIC_ROUTES = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/series', changefreq: 'daily', priority: '0.9' },
  { loc: '/rabbis', changefreq: 'weekly', priority: '0.8' },
  { loc: '/parasha', changefreq: 'weekly', priority: '0.8' },
  { loc: '/teachers', changefreq: 'monthly', priority: '0.7' },
  { loc: '/kenes', changefreq: 'monthly', priority: '0.7' },
  { loc: '/memorial', changefreq: 'monthly', priority: '0.6' },
  { loc: '/memorial/saadia', changefreq: 'monthly', priority: '0.6' },
  { loc: '/dor-haplaot', changefreq: 'monthly', priority: '0.6' },
  { loc: '/about', changefreq: 'monthly', priority: '0.6' },
  { loc: '/donate', changefreq: 'monthly', priority: '0.6' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
];

const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const urlEntry = ({ loc, lastmod, changefreq, priority }) => {
  const parts = [`    <loc>${SITE}${loc}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
};

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).type('text/plain').send('Supabase env vars missing');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const [lessonsRes, seriesRes, rabbisRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(40000),
    supabase
      .from('series')
      .select('id, updated_at')
      .eq('status', 'published')
      .limit(2000),
    supabase
      .from('rabbis')
      .select('id, updated_at')
      .limit(500),
  ]);

  const entries = [];

  for (const r of STATIC_ROUTES) {
    entries.push(urlEntry(r));
  }

  for (const book of BIBLE_BOOKS) {
    entries.push(urlEntry({
      loc: `/bible/${encodeURIComponent(book)}`,
      changefreq: 'weekly',
      priority: '0.7',
    }));
  }

  for (const s of seriesRes.data ?? []) {
    entries.push(urlEntry({
      loc: `/series/${s.id}`,
      lastmod: s.updated_at ? new Date(s.updated_at).toISOString() : undefined,
      changefreq: 'weekly',
      priority: '0.7',
    }));
  }

  for (const r of rabbisRes.data ?? []) {
    entries.push(urlEntry({
      loc: `/rabbis/${r.id}`,
      lastmod: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
      changefreq: 'weekly',
      priority: '0.6',
    }));
  }

  for (const l of lessonsRes.data ?? []) {
    entries.push(urlEntry({
      loc: `/lessons/${l.id}`,
      lastmod: l.updated_at ? new Date(l.updated_at).toISOString() : undefined,
      changefreq: 'monthly',
      priority: '0.5',
    }));
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(body);
}
