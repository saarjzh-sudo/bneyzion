/**
 * Legacy redirect handler for old bneyzion.co.il lesson URLs
 *
 * Receives the sub-path captured by the vercel.json rewrite:
 *   /%D7%9E%D7%90%D7%92%D7%A8-.../:path+  →  /api/legacy-redirect?path=:path
 *
 * Searches Supabase by title similarity and issues:
 *   301  /lessons/:id   if a confident match is found
 *   302  /series        fallback
 */

import { createClient } from '@supabase/supabase-js';

// In-memory cache — reused across requests in the same warm Fluid Compute instance
const redirectCache = new Map();

// Slug fragments that identify section/category pages (not individual lessons)
const SECTION_SLUGS = new Set([
  'נושאים', 'הפטרות', 'איך-לומדים-תנך', 'כל-השיעורים',
  'תורה', 'נביאים', 'כתובים', 'מועדים', 'מגילות',
  'הפטרות-במדבר', 'הפטרות-בראשית', 'הפטרות-שמות',
  'הפטרות-ויקרא', 'הפטרות-דברים',
]);

// Fallbacks are whitelisted — the fallback query param arrives from our own
// vercel.json rewrites, but never trust a redirect target from the request.
const ALLOWED_FALLBACKS = new Set(['/series', '/teachers', '/rabbis', '/parasha']);

// The old site served personal rabbi pages as a query param:
//   /מאגר-השיעורים-והמאמרים/רבנים?rav=הרב יונדב זר
// Match against rabbis.name (exact first, then without the הרב/הרבנית title).
async function resolveRabbi(supabase, ravRaw) {
  let rav;
  try {
    rav = decodeURIComponent(ravRaw).trim();
  } catch {
    rav = String(ravRaw).trim();
  }
  if (!rav) return null;

  const exact = await supabase
    .from('rabbis').select('slug').eq('name', rav).limit(1);
  if (exact.data?.[0]?.slug) return exact.data[0].slug;

  const stripped = rav.replace(/^(הרב|הרבנית|רב)\s+/, '');
  if (stripped.length >= 3) {
    const fuzzy = await supabase
      .from('rabbis').select('slug, name').ilike('name', `%${stripped}%`).limit(2);
    // Accept only an unambiguous match
    if (fuzzy.data?.length === 1) return fuzzy.data[0].slug;
  }
  return null;
}

export default async function handler(req, res) {
  // req.query is a Vercel helper — automatically parses the query string
  const rawPath = req.query.path || '';
  const ravParam = req.query.rav || '';
  const fallbackParam = ALLOWED_FALLBACKS.has(req.query.fallback) ? req.query.fallback : null;
  const cacheKey = `${rawPath}|rav=${ravParam}|fb=${fallbackParam || ''}`;

  // --- Cache check ---
  if (redirectCache.has(cacheKey)) {
    const { status, location } = redirectCache.get(cacheKey);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.redirect(status, location);
  }

  // --- Decode Hebrew path segments ---
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    decodedPath = rawPath;
  }

  const segments = decodedPath
    .split('/')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // --- Search Supabase, deepest segment first ---
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  const isRabbisPath = segments.includes('רבנים');

  // --- Personal rabbi page (?rav= query param, or a name segment under רבנים) ---
  if (ravParam || isRabbisPath) {
    let slug = null;
    if (ravParam) {
      slug = await resolveRabbi(supabase, ravParam);
    }
    if (!slug && isRabbisPath) {
      const last = segments[segments.length - 1];
      if (last && last !== 'רבנים') {
        slug = await resolveRabbi(supabase, last.replace(/-/g, ' '));
      }
    }
    const location = slug ? `/rabbis/${slug}` : '/rabbis';
    const status = slug ? 301 : 302;
    redirectCache.set(cacheKey, { status, location });
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.redirect(status, location);
  }

  for (let i = segments.length - 1; i >= 0; i--) {
    const slug = segments[i];
    if (SECTION_SLUGS.has(slug)) continue;

    // Convert slug to meaningful words (skip very short tokens)
    const words = slug.split('-').filter(w => w.length >= 3);
    if (words.length < 2) continue;

    // AND-chain ilike conditions: title must contain each of the first 3 words
    let query = supabase
      .from('lessons')
      .select('id, title')
      .eq('status', 'published');

    for (const word of words.slice(0, 3)) {
      query = query.ilike('title', `%${word}%`);
    }

    const { data, error } = await query.limit(5);

    if (error || !data || data.length === 0) continue;

    // Single match → confident 301
    if (data.length === 1) {
      const location = `/lessons/${data[0].id}`;
      redirectCache.set(cacheKey, { status: 301, location });
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.redirect(301, location);
    }

    // Multiple matches → score by how many slug words appear in the title
    const scored = data
      .map(lesson => ({
        id: lesson.id,
        score: words.filter(w => lesson.title.includes(w)).length,
      }))
      .sort((a, b) => b.score - a.score);

    // Accept only if enough words match (≥3 or all words if slug has fewer)
    if (scored[0].score >= Math.min(3, words.length)) {
      const location = `/lessons/${scored[0].id}`;
      redirectCache.set(cacheKey, { status: 301, location });
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.redirect(301, location);
    }
  }

  // --- No match — fallback (per path family, default /series) ---
  const fallback = fallbackParam || '/series';
  redirectCache.set(cacheKey, { status: 302, location: fallback });
  return res.redirect(302, fallback);
}
