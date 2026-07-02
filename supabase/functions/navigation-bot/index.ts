/**
 * navigation-bot — Bnei Zion knowledge assistant (בנצי)
 *
 * v4 (2026-06-19) — reliability + precision rebuild:
 *   1. Timeout + retry (429/503/5xx/network) with backoff — survives load spikes.
 *   2. Module-cached knowledge (10 min TTL) — no per-request DB hammering.
 *   3. Live content index (rabbis/series/topics, 15 min TTL) — the bot redirects
 *      to REAL pages (validated slugs/ids), never hallucinated routes.
 *   4. Public-only index: status=active, audience has 'general' & NOT 'teachers'
 *      (mirrors the strict public filter — no teacher-content leak).
 *   5. Always returns 200 with a graceful body — never throws to the client.
 *
 * v5 (2026-06-30, T02) — quality + cost guard:
 *   • thinkingBudget 0 → 768 (bounded) with maxOutputTokens 1024 → 2048. The old
 *     "0" disabled reasoning (the Miki mistake); the old crash was the *600*-token
 *     ceiling colliding with thinking, not thinking itself. Now thinking is capped
 *     and the JSON has ample room after it, so it reasons AND never truncates.
 *   • Per-session in-memory rate-limit (best-effort, per warm instance) — a single
 *     abusive session can't hammer Gemini. Returns a calm 200 body, never a 429.
 *
 * Pure logic lives in ./shared.ts (unit-tested in ./test.ts).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildContentIndex,
  buildSafeResponse,
  buildSystemPrompt,
  type ContentIndex,
  FALLBACK_KNOWLEDGE,
  FALLBACK_RESPONSE,
  formatRetrieval,
  parseModelJson,
  searchIndex,
} from "./shared.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─────────────────────────────────────────────────────────────────────────────
// fetch with timeout + retry (transient errors only)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  { timeoutMs = 12000, retries = 2, backoffMs = 500 } = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(timer);
      // Retry only on transient server/rate errors.
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastErr ?? new Error("fetch failed");
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHED LOADERS — module scope survives across warm invocations
// ─────────────────────────────────────────────────────────────────────────────
const KNOWLEDGE_TTL_MS = 10 * 60 * 1000;
const INDEX_TTL_MS = 15 * 60 * 1000;

// Gemini generation tuning. thinkingBudget > 0 (vs the Miki :0 mistake) lets the
// model reason about intent + routing; maxOutputTokens is kept well above
// thinkingBudget so the JSON answer always completes after thinking.
const GEMINI_THINKING_BUDGET = 768;
const GEMINI_MAX_OUTPUT_TOKENS = 2048;

let knowledgeCache: { text: string; ts: number } | null = null;
let indexCache: { index: ContentIndex; ts: number } | null = null;

// ── per-session rate-limit (best-effort, in-memory; resets on cold start) ─────
// Defends a single warm instance from one abusive session hammering Gemini.
// Not a hard quota across instances — the client also rate-limits — but a cheap
// guard that returns a calm 200 body instead of a 429.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateBuckets = new Map<string, number[]>();

function rateLimited(sessionId: string): boolean {
  if (!sessionId) return false;
  const now = Date.now();
  const recent = (rateBuckets.get(sessionId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    rateBuckets.set(sessionId, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(sessionId, recent);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return false;
}

const RATE_LIMIT_RESPONSE = {
  reply_text: "רגע, יש פה הרבה הודעות בזמן קצר. תן לי כמה שניות ונמשיך.",
  cta_buttons: [{ label: "דף הבית", route: "/", icon: "compass" }],
  intent_detected: "other",
  persona_guess: null,
  route_suggestion: "/",
  refused_content: false,
  suggestions: [] as string[],
};

async function sbSelect(
  url: string, key: string, path: string, timeoutMs = 8000,
): Promise<unknown[]> {
  const res = await fetchWithRetry(
    `${url}/rest/v1/${path}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    { timeoutMs, retries: 1 },
  );
  if (!res.ok) throw new Error(`supabase ${path} → ${res.status}`);
  return await res.json();
}

async function loadKnowledge(url: string, key: string): Promise<string> {
  const now = Date.now();
  if (knowledgeCache && now - knowledgeCache.ts < KNOWLEDGE_TTL_MS) {
    return knowledgeCache.text;
  }
  try {
    const rows = await sbSelect(
      url, key, "benzi_knowledge?select=title,content&is_active=eq.true&order=id",
    ) as Array<{ title: string; content: string }>;
    const text = rows.length
      ? rows.map((r) => `${r.title}:\n${(r.content ?? "").trim()}`).join("\n\n")
      : FALLBACK_KNOWLEDGE;
    knowledgeCache = { text, ts: now };
    return text;
  } catch (e) {
    console.warn("[navigation-bot] knowledge load failed:", String(e));
    return knowledgeCache?.text ?? FALLBACK_KNOWLEDGE;
  }
}

async function loadIndex(url: string, key: string): Promise<ContentIndex | null> {
  const now = Date.now();
  if (indexCache && now - indexCache.ts < INDEX_TTL_MS) return indexCache.index;
  try {
    // Public-only: active rabbis; active+general (not teachers) series; all topics.
    // ordered by lesson_count desc so the most important survive any row cap.
    const [rabbis, series, topics] = await Promise.all([
      sbSelect(url, key, "rabbis?select=name,slug,lesson_count&status=eq.active&order=lesson_count.desc&limit=2000"),
      sbSelect(url, key, "series?select=id,title,bible_book,lesson_count&status=eq.active&audience_tags=cs.%7Bgeneral%7D&audience_tags=not.cs.%7Bteachers%7D&order=lesson_count.desc&limit=3000"),
      sbSelect(url, key, "topics?select=name,slug&order=name&limit=2000"),
    ]) as [
      Array<{ name: string; slug: string; lesson_count?: number }>,
      Array<{ id: string; title: string; bible_book?: string; lesson_count?: number }>,
      Array<{ name: string; slug: string }>,
    ];
    const index = buildContentIndex(rabbis, series, topics);
    indexCache = { index, ts: now };
    console.log(`[navigation-bot] index: ${rabbis.length} rabbis, ${series.length} series, ${topics.length} topics`);
    return index;
  } catch (e) {
    console.warn("[navigation-bot] index load failed:", String(e));
    return indexCache?.index ?? null; // stale is fine; null disables id-validation gracefully
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI
// ─────────────────────────────────────────────────────────────────────────────
async function callGemini(apiKey: string, systemPrompt: string, history: unknown[], message: string) {
  const historyMessages = Array.isArray(history)
    ? history.slice(-6).flatMap((raw: unknown) => {
        const m = (raw ?? {}) as { role?: string; content?: unknown };
        if (m?.role === "user" && typeof m.content === "string") {
          return [{ role: "user", parts: [{ text: m.content }] }];
        }
        if (m?.role === "model") {
          const text = typeof m.content === "string"
            ? m.content
            : (m.content as { reply_text?: string })?.reply_text ?? "";
          return text ? [{ role: "model", parts: [{ text }] }] : [];
        }
        return [];
      })
    : [];

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [...historyMessages, { role: "user", parts: [{ text: message }] }],
    generationConfig: {
      temperature: 0.4,
      // Bounded thinking + generous output ceiling. thinkingBudget:0 (the Miki
      // mistake) makes 2.5-flash answer without reasoning — fine for a pure
      // router, weak for Tanach Q&A + correct routing. Here thinking is capped at
      // GEMINI_THINKING_BUDGET so it can reason about intent, and maxOutputTokens
      // leaves ample room for the JSON AFTER thinking, so nothing truncates.
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: GEMINI_THINKING_BUDGET },
    },
  };

  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    { timeoutMs: 12000, retries: 2, backoffMs: 600 },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`gemini ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      message,
      session_id = "",
      persona = null,
      history = [],
      current_route = null,
      current_parasha = null,
    } = body as Record<string, unknown>;

    if (!message || typeof message !== "string") {
      return json({ error: "message is required" }, 400);
    }

    if (rateLimited(String(session_id))) {
      console.warn("[navigation-bot] rate-limited session:", String(session_id).slice(0, 8));
      return json(RATE_LIMIT_RESPONSE);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[navigation-bot] GEMINI_API_KEY not configured");
      return json(FALLBACK_RESPONSE);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Knowledge + index in parallel (both cached, both fail-soft).
    const [dynamicKnowledge, index] = await Promise.all([
      SUPABASE_URL && SERVICE_KEY ? loadKnowledge(SUPABASE_URL, SERVICE_KEY) : Promise.resolve(FALLBACK_KNOWLEDGE),
      SUPABASE_URL && SERVICE_KEY ? loadIndex(SUPABASE_URL, SERVICE_KEY) : Promise.resolve(null),
    ]);

    const matches = index ? searchIndex(index, message, 8) : [];
    const retrievalBlock = formatRetrieval(matches);

    const personaNote = persona ? `\nהמשתמש זוהה כ: ${persona}. התאם את הצעותיך.` : "";
    const systemPrompt = buildSystemPrompt(
      current_route as string | null,
      current_parasha as string | null,
      dynamicKnowledge,
      retrievalBlock,
    ) + personaNote;

    let rawText: string;
    try {
      rawText = await callGemini(GEMINI_API_KEY, systemPrompt, history as unknown[], message);
    } catch (e) {
      console.error("[navigation-bot] gemini failed:", String(e));
      return json(FALLBACK_RESPONSE);
    }

    const parsed = parseModelJson(rawText);
    if (!parsed) {
      console.error("[navigation-bot] unparseable model output:", rawText.slice(0, 200));
      return json(FALLBACK_RESPONSE);
    }

    const safeResponse = buildSafeResponse(parsed, index);

    // תיעוד השיחה ל-bot_sessions (fire-and-forget, fail-soft) — הדשבורד באדמין
    // קורא מכאן. upsert לפי session_id; history = כל חילופי-הדברים עד עכשיו.
    if (SUPABASE_URL && SERVICE_KEY && session_id) {
      const fullHistory = [
        ...(Array.isArray(history) ? history : []),
        { role: "user", text: String(message) },
        { role: "bot", text: (safeResponse as Record<string, unknown>).reply_text ?? "" },
      ];
      fetch(`${SUPABASE_URL}/rest/v1/bot_sessions?on_conflict=session_id`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          session_id: String(session_id),
          persona: persona ? String(persona) : null,
          history: fullHistory,
          last_route: current_route ? String(current_route) : null,
          user_agent: req.headers.get("user-agent")?.slice(0, 250) ?? null,
          updated_at: new Date().toISOString(),
        }),
      }).catch((e) => console.warn("[navigation-bot] session log failed:", String(e)));
    }

    return json(safeResponse);
  } catch (e) {
    console.error("[navigation-bot] unhandled:", String(e));
    return json(FALLBACK_RESPONSE);
  }
});
