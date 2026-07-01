/**
 * grow-webhook-sync — מקלט webhook מ-Grow (account-level) לתיעוד וסנכרון ל-DB.
 *
 * שלא כמו `api/grow/webhook.ts` (שדורש orderId של האתר ומאשר עסקה), מקלט זה:
 *  - מתעד כל payload גולמי ל-`grow_webhook_log` (כדי ללמוד מבנה + דיבאג).
 *  - מפרסר בסובלנות (מחפש asmachta/sum/name/email/phone/description בכל עומק).
 *  - מסווג תרומה/הזמנה לפי תיאור-העסקה, ו-upsert לפי אסמכתא (idempotent — לא משכפל היסטוריה).
 *  - **לא מאשר עסקה** (דפי-Grow העצמאיים מאשרים לבד) — תיעוד בלבד, בטוח.
 *
 * אבטחה: `?secret=` אופציונלי מול env `GROW_WEBHOOK_SECRET`.
 * Deploy: functions deploy grow-webhook-sync (verify_jwt=false).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// חיפוש-עומק אחרי מפתח מתוך רשימת שמות אפשריים
function deepFind(obj: any, keys: string[]): any {
  if (obj == null || typeof obj !== "object") return undefined;
  for (const k of Object.keys(obj)) {
    if (keys.some((n) => n.toLowerCase() === k.toLowerCase())) {
      const v = obj[k];
      if (v != null && v !== "") return v;
    }
  }
  for (const k of Object.keys(obj)) {
    const v = deepFind(obj[k], keys);
    if (v != null && v !== "") return v;
  }
  return undefined;
}

async function parseBody(req: Request): Promise<any> {
  const ct = req.headers.get("content-type") || "";
  const text = await req.text();
  if (ct.includes("application/json")) { try { return JSON.parse(text); } catch { /* fall */ } }
  // urlencoded (bracket-notation) → nested object
  if (text.includes("=")) {
    const out: any = {};
    for (const pair of text.split("&")) {
      const [rawK, rawV = ""] = pair.split("=");
      const k = decodeURIComponent(rawK.replace(/\+/g, " "));
      const v = decodeURIComponent(rawV.replace(/\+/g, " "));
      const path = k.replace(/\]/g, "").split("[");
      let cur = out;
      for (let i = 0; i < path.length - 1; i++) { cur[path[i]] = cur[path[i]] || {}; cur = cur[path[i]]; }
      cur[path[path.length - 1]] = v;
    }
    return out;
  }
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

function classify(desc: string): "donations" | "orders" {
  const d = desc || "";
  if (/יהושע|סעדיה|תרומ/.test(d)) return "donations";
  return "orders";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let raw: any = null;
  try {
    const secret = Deno.env.get("GROW_WEBHOOK_SECRET");
    if (secret) {
      const url = new URL(req.url);
      if (url.searchParams.get("secret") !== secret) return json({ ok: false, error: "bad secret" }, 401);
    }

    raw = await parseBody(req);

    const asmachta = String(deepFind(raw, ["asmachta", "asmachta_num", "reference"]) ?? "").trim() || null;
    const sum = Number(deepFind(raw, ["sum", "paymentSum", "amount", "total"]) ?? 0) || 0;
    const name = deepFind(raw, ["fullName", "payerName", "customerName", "name"]) ?? null;
    const email = (deepFind(raw, ["payerEmail", "email", "customerEmail"]) ?? null);
    const phone = deepFind(raw, ["payerPhone", "phone", "cellphone", "customerPhone"]) ?? null;
    const desc = String(deepFind(raw, ["paymentDesc", "description", "pageTitle", "transactionDesc"]) ?? "");
    const cardSuffix = deepFind(raw, ["cardSuffix", "card_suffix", "last4"]) ?? null;
    const statusCode = String(deepFind(raw, ["statusCode", "status"]) ?? "");
    const target = classify(desc);

    let action = "logged-only";
    if (asmachta && sum > 0) {
      // idempotent: skip if this asmachta already recorded in either table
      const [{ data: inDon }, { data: inOrd }] = await Promise.all([
        supabase.from("donations").select("id").eq("asmachta", asmachta).maybeSingle(),
        supabase.from("orders").select("id").eq("asmachta", asmachta).maybeSingle(),
      ]);
      if (!inDon && !inOrd) {
        if (target === "donations") {
          await supabase.from("donations").insert({
            donor_name: name, donor_email: email ? String(email).toLowerCase() : null,
            amount: sum, payment_status: "completed", asmachta, description: desc || null,
            phone: phone ? String(phone) : null, card_suffix: cardSuffix ? String(cardSuffix) : null,
            source: "grow-webhook", payment_method: "credit",
            product: /יהושע/.test(desc) ? "yehoshua-campaign" : /סעדיה/.test(desc) ? "saadia-campaign" : "general-donation",
          });
        } else {
          await supabase.from("orders").insert({
            order_number: "GROW-" + asmachta, status: "confirmed", payment_status: "completed",
            payment_method: "credit", customer_name: name, customer_email: email ? String(email).toLowerCase() : null,
            customer_phone: phone ? String(phone) : null, subtotal: sum, discount: 0, total: sum,
            currency: "ILS", installments: 1, invoice_type: "receipt", asmachta,
            card_suffix: cardSuffix ? String(cardSuffix) : null, description: desc || null, notes: "grow-webhook",
          });
        }
        action = "inserted:" + target;
      } else {
        action = "duplicate-skip";
      }
    }

    await supabase.from("grow_webhook_log").insert({
      event_hint: desc.slice(0, 120) || null, asmachta, target_table: target, action,
      parsed: { asmachta, sum, name, email, phone, desc, statusCode }, raw,
    });

    return json({ ok: true, action });
  } catch (e) {
    // never fail the webhook — always log + 200 so Grow doesn't retry-storm
    try { await supabase.from("grow_webhook_log").insert({ action: "error", parsed: { error: String(e) }, raw }); } catch { /* ignore */ }
    return json({ ok: true, action: "error-logged" });
  }
});
