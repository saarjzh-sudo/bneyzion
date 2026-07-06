/**
 * grow-webhook-dedication — processes Grow payment webhooks for the
 * "הקדשת שיעור/סדרה" (lesson/series dedication) system.
 *
 * WHY A SEPARATE FUNCTION (not a change to api/grow/webhook.ts):
 *   This task's scope is `supabase/` only — api/ is owned elsewhere.
 *   api/grow/webhook.ts already special-cases `targetTable === 'orders'`
 *   (flips a `status` column) — it will need a similar small addition to
 *   special-case `targetTable === 'lesson_dedications'` OR to forward the
 *   payload here. Until that wiring lands, this function is a fully
 *   self-sufficient, idempotent processor that can be pointed at directly
 *   as a Grow page's notifyUrl (Grow supports a distinct notifyUrl per
 *   pageCode) — the cleanest option, since dedication-lesson /
 *   dedication-series are their own payment_products rows with their own
 *   pageCode already (see migration 20260706).
 *
 * CONTRACT — payload shape expected (Grow's standard POST, urlencoded or
 * JSON, matching api/grow/webhook.ts's `payload.data` / customFields):
 *   payload.status === "1"                      → outer envelope ok
 *   data.statusCode === "2"                      → charge succeeded
 *   data.customFields.cField1 = orderId          → lesson_dedications.id
 *                                                   (the PENDING row created
 *                                                   at checkout time by
 *                                                   api/grow/create-payment.ts,
 *                                                   exactly like orders/donations)
 *   data.customFields.cField2 = 'directDebit'|'wallet'  (flow type, unused here —
 *                                                   dedications are always
 *                                                   one-time/wallet)
 *   data.customFields.cField3 = 'dedication-lesson' | 'dedication-series'
 *                                                   (payment_products.id)
 *   data.asmachta, data.sum, data.transactionId, data.cardSuffix, ...  → same
 *     fields api/grow/webhook.ts already reads off `txData`.
 *
 * IDEMPOTENCY: unique index lesson_dedications_asmachta_uidx (partial,
 * WHERE asmachta IS NOT NULL) makes a duplicate insert/update a no-op —
 * this handler additionally checks by orderId (cField1) first, matching
 * the create-payment.ts convention (row already exists as 'pending', we
 * only ever UPDATE it, never insert a second row for the same order).
 *
 * SECURITY: service-role key — bypasses RLS. Optional `?secret=` guard
 * against env GROW_WEBHOOK_SECRET (same convention as grow-webhook-sync).
 * Always returns 200 (never fail the webhook — Grow retry-storms otherwise),
 * all failures are logged to grow_webhook_log for debugging.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function assignBracket(out: Record<string, any>, key: string, value: string) {
  // Support data[transactionId]=... and data[customFields][cField1]=...
  const m = key.match(/^(\w+)\[(\w+)\](?:\[(\w+)\])?$/);
  if (m) {
    out[m[1]] = out[m[1]] || {};
    if (m[3]) {
      out[m[1]][m[2]] = out[m[1]][m[2]] || {};
      out[m[1]][m[2]][m[3]] = value;
    } else {
      out[m[1]][m[2]] = value;
    }
  } else {
    out[key] = value;
  }
}

function parseUrlEncoded(body: string): Record<string, any> {
  const out: Record<string, any> = {};
  for (const pair of body.split("&")) {
    if (!pair) continue;
    const [k, v = ""] = pair.split("=");
    const key = decodeURIComponent(k.replace(/\+/g, " "));
    const val = decodeURIComponent(v.replace(/\+/g, " "));
    assignBracket(out, key, val);
  }
  return out;
}

async function parseBody(req: Request): Promise<any> {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const text = await req.text();
  if (!text) return null;
  if (ct.includes("application/json")) {
    try { return JSON.parse(text); } catch { /* fall through */ }
  }
  if (ct.includes("application/x-www-form-urlencoded") || text.includes("=")) {
    return parseUrlEncoded(text);
  }
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let payload: any = null;

  try {
    const secret = Deno.env.get("GROW_WEBHOOK_SECRET");
    if (secret) {
      const url = new URL(req.url);
      if (url.searchParams.get("secret") !== secret) return json({ ok: false, error: "bad secret" }, 401);
    }

    payload = await parseBody(req);

    if (!payload || payload.status !== "1") {
      await logEvent(supabase, "invalid-envelope", null, payload);
      return json({ ok: true, action: "invalid-envelope" });
    }

    const txData = payload.data || {};
    const orderId: string | undefined = txData.customFields?.cField1;
    const productSlug: string | undefined = txData.customFields?.cField3;
    const statusCode = String(txData.statusCode ?? "");
    const asmachta = txData.asmachta ? String(txData.asmachta) : null;
    const sum = Number(txData.sum ?? 0) || 0;

    if (!orderId) {
      await logEvent(supabase, "no-orderid", asmachta, payload);
      return json({ ok: true, action: "no-orderid" });
    }

    // Confirm this order really is a dedication row (defensive — a
    // misrouted notifyUrl should never write into an unrelated table).
    const { data: existing, error: fetchErr } = await supabase
      .from("lesson_dedications")
      .select("id, status, asmachta, lesson_id, series_id, scope")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr || !existing) {
      await logEvent(supabase, "order-not-found", asmachta, payload, { orderId, fetchErr: fetchErr?.message });
      return json({ ok: true, action: "order-not-found" });
    }

    if (statusCode !== "2") {
      // Failed / non-success charge — leave the row 'pending' (or mark it,
      // but never invent an 'active' dedication on a failed charge).
      await logEvent(supabase, `non-success:${statusCode || "none"}`, asmachta, payload, { orderId });
      return json({ ok: true, action: "non-success" });
    }

    // Idempotency: already active with the same asmachta → duplicate retry
    // from Grow, do nothing (never double-charge-effect a dedication).
    if (existing.status === "active" && existing.asmachta && existing.asmachta === asmachta) {
      await logEvent(supabase, "duplicate-skip", asmachta, payload, { orderId });
      return json({ ok: true, action: "duplicate-skip" });
    }

    const updateRow: Record<string, any> = {
      status: "active",
      asmachta,
      amount: sum || null,
      paid_at: new Date().toISOString(),
      raw_payload: payload,
    };

    const { error: updateErr } = await supabase
      .from("lesson_dedications")
      .update(updateRow)
      .eq("id", orderId);

    if (updateErr) {
      await logEvent(supabase, "update-error", asmachta, payload, { orderId, error: updateErr.message });
      return json({ ok: true, action: "update-error" });
    }

    await logEvent(supabase, "activated", asmachta, payload, { orderId, productSlug, scope: existing.scope });
    return json({ ok: true, action: "activated", orderId });
  } catch (e) {
    await logEvent(supabase, "error", null, payload, { error: String(e) });
    // never fail the webhook — always 200 so Grow doesn't retry-storm
    return json({ ok: true, action: "error-logged" });
  }
});

async function logEvent(
  supabase: ReturnType<typeof createClient>,
  action: string,
  asmachta: string | null,
  raw: any,
  parsed: any = null
) {
  try {
    await supabase.from("grow_webhook_log").insert({
      event_hint: "dedication:" + action,
      asmachta,
      target_table: "lesson_dedications",
      action,
      parsed,
      raw,
    });
  } catch {
    // grow_webhook_log is best-effort — never let logging failure surface
  }
}
