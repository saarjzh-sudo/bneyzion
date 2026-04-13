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

export default async function handler(req, res) {
  // req.query is a Vercel helper — automatically parses the query string
  const rawPath = req.query.path || '';

  // --- Cache check ---
  if (redirectCache.has(rawPath)) {
    const { status, location } = redirectCache.get(rawPath);
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
      redirectCache.set(rawPath, { status: 301, location });
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
      redirectCache.set(rawPath, { status: 301, location });
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.redirect(301, location);
    }
  }

  // --- No match — fallback to /series ---
  redirectCache.set(rawPath, { status: 302, location: '/series' });
  return res.redirect(302, '/series');
}
