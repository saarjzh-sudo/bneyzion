/**
 * Generate a watercolor thumbnail for a Torah lesson using Google Imagen 4.
 * Uploads the result to Supabase Storage bucket "lesson-images" (public).
 *
 * POST /api/generate-lesson-image
 * Body: { title: string, description?: string }
 * Returns: { url: string }
 */

import { createClient } from '@supabase/supabase-js';

// ── Watercolor style constants (matches image-designer-agent.md) ─────────────
const STYLE_CONSTANTS = `Minimalist watercolor painting on white textured paper.
Ultra-clean, gentle, soft, ethereal, atmospheric, meditative, spiritually evocative.
Loose watercolor washes, muted pastel tones (sage green, dusty teal, soft blue-gray,
warm sand, wheat, pale gold, quiet lavender, blush rose).
Visible paper grain, gentle gradients, completely soft edges.
No harsh lines. No dark outlines. No explicit human figures. No text or letters.
Generous white space — leave the center open and luminous.
Abstract representation, impressionistic style, spiritual ambiance.`;

// ── Maps Torah lesson themes → visual metaphors ──────────────────────────────
function buildVisualPrompt(title, description) {
  const context = [title, description].filter(Boolean).join('. ');

  // Keywords → visual metaphors (Hebrew + English coverage)
  const metaphors = [
    { keys: ['ירדן', 'נהר', 'מים', 'ים'],        visual: 'a wide misty river at dawn, soft watercolor washes of blue-gray and warm gold reflecting on still water' },
    { keys: ['הר', 'גבעה', 'ציון', 'ירושלים'],    visual: 'a gentle mountain silhouette at dusk, warm amber and dusty blue washes dissolving into white paper' },
    { keys: ['אור', 'שמש', 'זריחה', 'שקיעה'],     visual: 'a glowing horizon with warm golden light breaking through soft mist, pale gold and cream washes radiating from center' },
    { keys: ['ספר', 'תורה', 'כתב', 'מאמר'],       visual: 'an open scroll resting on a stone, loose watercolor washes of warm sand and dusty teal surrounding it' },
    { keys: ['שבת', 'קדש', 'נר', 'אש'],           visual: 'two soft glowing candle flames in warm amber watercolor, dissolving into white space above' },
    { keys: ['עם', 'קהל', 'שבט', 'ישראל'],        visual: 'soft silhouettes of a gathering of people in the distance, warm landscape with a golden horizon' },
    { keys: ['מלך', 'דוד', 'שלמה', 'שאול'],       visual: 'a lone figure on a hilltop at sunset, small against a vast amber and dusty blue watercolor sky' },
    { keys: ['מדבר', 'שממה', 'דרך', 'מסע'],       visual: 'a winding path through a desert landscape, warm ochre and sand tones with a pale luminous sky' },
    { keys: ['ים', 'קריעה', 'גאולה', 'יציאה'],    visual: 'parted waters with a narrow path of light, blue-gray washes on both sides, warm gold glowing down the center' },
    { keys: ['שלום', 'נחמה', 'ברכה', 'תקווה'],    visual: 'a single olive branch resting in soft light, muted greens and warm sand, meditative and still' },
    { keys: ['נבואה', 'חזון', 'חלום'],             visual: 'abstract upward-reaching forms dissolving into white light, dusty teal and warm gold blending softly' },
    { keys: ['מלחמה', 'גיבור', 'נצחון'],           visual: 'a wide panoramic landscape at the moment after, soft amber sky, small figures of arrival on a hillside' },
    { keys: ['תפילה', 'בקשה', 'לב'],              visual: 'an open pair of abstract hands in warm watercolor washes, soft light flowing downward from above' },
    { keys: ['בית', 'מקדש', 'ארון'],              visual: 'a distant luminous structure on a hill, warm gold and soft blue-gray washes, impressionistic and spiritual' },
  ];

  for (const { keys, visual } of metaphors) {
    if (keys.some(k => context.includes(k))) {
      return visual;
    }
  }

  // Default: a serene spiritual landscape
  return 'a serene spiritual landscape with soft hills, a glowing horizon, warm gold and dusty teal watercolor washes dissolving into white paper';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!geminiKey)   return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
  if (!serviceKey)  return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });

  // ── 1. Build prompt ───────────────────────────────────────────────────────
  const visual = buildVisualPrompt(title, description);
  const fullPrompt = `${STYLE_CONSTANTS}\n\nContent to visualize: ${visual}`;

  // ── 2. Call Gemini Imagen 4 ───────────────────────────────────────────────
  const modelId = 'imagen-4.0-generate-001';
  const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${geminiKey}`;

  let imageBytes;
  try {
    const imagenRes = await fetch(imagenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: fullPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          personGeneration: 'dont_allow',
          safetySetting: 'block_low_and_above',
        },
      }),
    });

    if (!imagenRes.ok) {
      const errText = await imagenRes.text();
      console.error('Gemini error:', errText);
      return res.status(502).json({ error: `Gemini API error: ${imagenRes.status}` });
    }

    const imagenData = await imagenRes.json();
    const b64 = imagenData?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) {
      return res.status(502).json({ error: 'Gemini returned no image — prompt may have been filtered' });
    }
    imageBytes = Buffer.from(b64, 'base64');
  } catch (err) {
    console.error('Gemini fetch error:', err);
    return res.status(502).json({ error: 'Failed to reach Gemini API' });
  }

  // ── 3. Upload to Supabase Storage ─────────────────────────────────────────
  const supabase = createClient(supabaseUrl, serviceKey);

  // Ensure bucket exists (idempotent — fails silently if already exists)
  await supabase.storage.createBucket('lesson-images', { public: true }).catch(() => {});

  // Filename: timestamp + sanitised title slug
  const timestamp  = Date.now();
  const slug       = (title || 'lesson').substring(0, 40).replace(/[^\u0590-\u05FFa-zA-Z0-9]+/g, '-');
  const filename   = `${timestamp}-${slug}.png`;

  const { error: uploadErr } = await supabase.storage
    .from('lesson-images')
    .upload(filename, imageBytes, { contentType: 'image/png', upsert: false });

  if (uploadErr) {
    console.error('Storage upload error:', uploadErr);
    return res.status(500).json({ error: `Storage upload failed: ${uploadErr.message}` });
  }

  // ── 4. Return public URL ──────────────────────────────────────────────────
  const { data: urlData } = supabase.storage.from('lesson-images').getPublicUrl(filename);

  return res.status(200).json({ url: urlData.publicUrl });
}
