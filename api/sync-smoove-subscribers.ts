/**
 * api/sync-smoove-subscribers.ts
 *
 * Vercel Cron Function — runs every hour (configured in vercel.json).
 * Syncs Smoove list 1045078 ("מנוי הפרק השבועי") ↔ user_access_tags
 * with tag = "program:weekly-chapter".
 *
 * Why cron and not webhook:
 *   Smoove REST API v1 does NOT have a webhooks endpoint.
 *   Confirmed: GET /v1/Webhooks → "No HTTP resource found".
 *
 * Logic:
 *   1. Fetch all active contacts from Smoove list 1045078 (paginated).
 *   2. Fetch all rows from user_access_tags where tag='program:weekly-chapter'
 *      and source like 'smoove%' (only manage our own rows — never touch
 *      rows created by Grow webhook which have source='grow_webhook').
 *   3. INSERT missing emails (upsert by email+tag, conflict do nothing).
 *   4. FLAG rows whose email is no longer in the Smoove list (notes only).
 *      ⚠️ 2.7.2026 (החלטת סער): הסנכרון לעולם לא מסיים מנוי. חברוּת ברשימת
 *      Smoove היא רשימת-מייל — לא סטטוס תשלום. מקור-האמת למנויים פעילים הוא
 *      Monday (לוח 5094750546). ב-2.6.2026 הגרסה הישנה סימנה 165 מנויים
 *      משלמים כפגי-תוקף כי ירדו מרשימת המייל — שוחזרו ב-monday_reconcile.
 *   5. Returns JSON report: { added, removed, unchanged, total_smoove, total_db }
 *
 * Security:
 *   - Protected by CRON_SECRET header check (Vercel injects Authorization header
 *     with CRON_SECRET value when invoking the cron).
 *   - Also callable manually with ?secret=<CRON_SECRET> for testing.
 *
 * Env vars needed (already set on Vercel):
 *   SMOOVE_API_KEY          — Smoove Bearer token for bnei-zion account
 *   SUPABASE_URL            — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (bypasses RLS)
 *   CRON_SECRET             — random secret to protect manual invocation
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SMOOVE_API_KEY = (process.env.SMOOVE_API_KEY || "").trim();
const SMOOVE_LIST_ID = 1045078;
const ACCESS_TAG = "program:weekly-chapter";
// Only manage rows created by Smoove import/sync — never touch grow_webhook rows.
const MANAGED_SOURCES = ["smoove_import", "smoove_sync", "smoove_removed"];

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const CRON_SECRET = (process.env.CRON_SECRET || "").trim();

// Smoove paginates at 500/page max. We use 500 to minimize requests.
const PAGE_SIZE = 500;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  // Vercel cron adds: Authorization: Bearer <CRON_SECRET>
  // Manual test:      ?secret=<CRON_SECRET>   (dev convenience)
  const authHeader = req.headers["authorization"] || "";
  const querySecret = (req.query?.secret as string) || "";
  const isCronCall = authHeader === `Bearer ${CRON_SECRET}`;
  const isManualTest = CRON_SECRET && querySecret === CRON_SECRET;

  if (!isCronCall && !isManualTest) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!SMOOVE_API_KEY) {
    return res.status(500).json({ error: "SMOOVE_API_KEY not configured" });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Supabase env vars not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const smooveHeaders = {
    Authorization: `Bearer ${SMOOVE_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    // ── Step 1: Fetch all active Smoove contacts (paginated) ─────────────────
    const smooveEmails = new Set<string>();
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `https://rest.smoove.io/v1/Lists/${SMOOVE_LIST_ID}/Contacts?page=${page}&pageSize=${PAGE_SIZE}`;
      const resp = await fetch(url, { headers: smooveHeaders });

      if (!resp.ok) {
        const errText = await resp.text();
        return res.status(502).json({
          error: `Smoove API error on page ${page}: ${resp.status}`,
          detail: errText.slice(0, 300),
        });
      }

      const contacts: any[] = await resp.json();

      if (!Array.isArray(contacts) || contacts.length === 0) {
        hasMore = false;
        break;
      }

      for (const c of contacts) {
        // Skip deleted contacts and contacts with no email
        if (c.deleted || !c.email) continue;
        smooveEmails.add(c.email.toLowerCase().trim());
      }

      // If fewer results than PAGE_SIZE, we've hit the last page
      if (contacts.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // ── Step 2: Fetch current DB rows we manage ───────────────────────────────
    // Fetch all managed rows (any source we own) for this tag.
    // We use a large limit — there won't be more than a few thousand ever.
    const { data: dbRows, error: dbErr } = await supabase
      .from("user_access_tags")
      .select("id, email, source")
      .eq("tag", ACCESS_TAG)
      .in("source", MANAGED_SOURCES);

    if (dbErr) {
      return res.status(500).json({ error: "DB fetch failed", detail: dbErr.message });
    }

    const dbRows_ = dbRows || [];

    // Build maps: email (lowercase) → row id and current source
    const activeDbEmails = new Map<string, string>(); // email → id (only non-removed)
    const removedDbEmails = new Map<string, string>(); // email → id (soft-removed)

    for (const row of dbRows_) {
      const email = (row.email || "").toLowerCase().trim();
      if (!email) continue;
      if (row.source === "smoove_removed") {
        removedDbEmails.set(email, row.id);
      } else {
        activeDbEmails.set(email, row.id);
      }
    }

    const now = new Date().toISOString();
    const importNote = `Synced from Smoove list ${SMOOVE_LIST_ID} on ${now.slice(0, 10)}`;

    // ── Step 3: INSERT new subscribers not in DB ──────────────────────────────
    const toInsert: object[] = [];
    const toReactivate: string[] = []; // ids of previously-removed rows to restore

    for (const email of smooveEmails) {
      if (activeDbEmails.has(email)) continue; // already active — no action needed

      if (removedDbEmails.has(email)) {
        // Was previously removed from Smoove but now re-subscribed — reactivate
        toReactivate.push(removedDbEmails.get(email)!);
      } else {
        // Brand new subscriber
        toInsert.push({
          email,
          tag: ACCESS_TAG,
          granted_at: now,
          source: "smoove_sync",
          pending_user_link: true,
          notes: importNote,
        });
      }
    }

    let insertedCount = 0;
    let reactivatedCount = 0;

    if (toInsert.length > 0) {
      // Batch insert in chunks of 100 to stay within PostgREST limits
      const CHUNK = 100;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK);
        const { error: insErr } = await supabase
          .from("user_access_tags")
          .insert(chunk);
        if (insErr) {
          console.error("Insert chunk error:", insErr.message);
        } else {
          insertedCount += chunk.length;
        }
      }
    }

    if (toReactivate.length > 0) {
      const { error: reactErr } = await supabase
        .from("user_access_tags")
        .update({ source: "smoove_sync", valid_until: null, notes: `Re-subscribed — ${importNote}` })
        .in("id", toReactivate);
      if (reactErr) {
        console.error("Reactivate error:", reactErr.message);
      } else {
        reactivatedCount = toReactivate.length;
      }
    }

    // ── Step 4: Flag (only!) members who left the Smoove list ────────────────
    // ⚠️ אסור לסיים מנוי מכאן: רשימת Smoove = רשימת מייל, לא סטטוס תשלום.
    // מקור-האמת לפעילים הוא Monday. כאן רק מסמנים בהערה, בלי לגעת
    // ב-valid_until וב-source.
    const toFlag: string[] = [];
    for (const [email, id] of activeDbEmails.entries()) {
      if (!smooveEmails.has(email)) {
        toFlag.push(id);
      }
    }

    let removedCount = 0; // נשאר בשם הזה בדוח לתאימות; סופר "סומנו", לא הוסרו
    if (toFlag.length > 0) {
      const { error: flagErr } = await supabase
        .from("user_access_tags")
        .update({
          notes: `שים לב: ירד מרשימת Smoove ${SMOOVE_LIST_ID} ב-${now.slice(0, 10)} (מנוי לא הוסר — לאמת מול Monday)`,
        })
        .in("id", toFlag);
      if (flagErr) {
        console.error("Flag error:", flagErr.message);
      } else {
        removedCount = toFlag.length;
      }
    }

    const unchanged = smooveEmails.size - toInsert.length - toReactivate.length;

    const report = {
      ok: true,
      synced_at: now,
      smoove_list: SMOOVE_LIST_ID,
      total_smoove: smooveEmails.size,
      total_db_before: activeDbEmails.size,
      added: insertedCount,
      reactivated: reactivatedCount,
      removed: removedCount,
      unchanged: Math.max(0, unchanged),
    };

    console.log("sync-smoove-subscribers:", JSON.stringify(report));
    return res.status(200).json(report);
  } catch (err: any) {
    console.error("sync-smoove-subscribers fatal:", err);
    return res.status(500).json({ error: err?.message || "Unknown error" });
  }
}
