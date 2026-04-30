import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
// subscribeToSmoove is defined locally below — it handles the 409 "already
// exists" case by looking up the contact and adding to the list via PUT.
// splitFullName is imported for any future use but not currently needed here.

// .trim() everywhere — `vercel env add` via piping sometimes appends "\n",
// which silently breaks string routing/comparisons.
const GROW_API_URL = (process.env.GROW_API_URL || "").trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const SMOOVE_API_KEY = (process.env.SMOOVE_API_KEY || "").trim();

// Disable Vercel's automatic body parser. Grow webhooks arrive as
// application/x-www-form-urlencoded (and occasionally multipart/form-data)
// with bracket-notation keys like data[transactionId] and
// data[customFields][cField1]. The default parser leaves req.body broken
// for our needs, so we read the raw body and parse it ourselves.
export const config = {
  api: { bodyParser: false },
};

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ───────────────────────────── Body parsing ─────────────────────────────

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as any) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

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

function parseMultipart(body: Buffer, boundary: string): Record<string, any> {
  const out: Record<string, any> = {};
  const text = body.toString("utf8");
  const parts = text.split(`--${boundary}`);
  for (const part of parts) {
    const nameMatch = part.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const idx = part.indexOf("\r\n\r\n");
    if (idx < 0) continue;
    const value = part.slice(idx + 4).replace(/\r\n$/, "").replace(/--\s*$/, "");
    assignBracket(out, nameMatch[1], value);
  }
  return out;
}

async function parseBody(req: VercelRequest): Promise<any> {
  // KEEP raw Content-Type — boundary extraction is case-sensitive, while
  // the body delimiters keep their original case.
  const contentTypeRaw = String(req.headers["content-type"] || "");
  const contentType = contentTypeRaw.toLowerCase();
  const raw = await readRawBody(req);
  if (!raw.length) return null;

  if (contentType.includes("application/json")) {
    try { return JSON.parse(raw.toString("utf8")); } catch { return null; }
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return parseUrlEncoded(raw.toString("utf8"));
  }
  if (contentType.includes("multipart/form-data")) {
    const bm = contentTypeRaw.match(/boundary=("?)([^";]+)\1/);
    if (bm) return parseMultipart(raw, bm[2].trim());
  }

  // Fallback: try JSON, then urlencoded
  const text = raw.toString("utf8");
  try { return JSON.parse(text); } catch {}
  return parseUrlEncoded(text);
}

// ───────────────────────────── Webhook handler ─────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const contentType = req.headers["content-type"];
    const payload = await parseBody(req);
    console.log("Grow webhook received. Content-Type:", contentType);
    console.log("Parsed payload:", JSON.stringify(payload));

    if (!payload || payload.status !== "1") {
      console.error("Webhook: invalid or failed transaction", payload);
      return res.status(200).json({ received: true, processed: false });
    }

    const txData = payload.data || {};
    const orderId: string | undefined = txData.customFields?.cField1;
    const flowType: string | undefined = txData.customFields?.cField2; // 'product' | 'donation' | 'directDebit' | 'wallet'
    const productSlug: string | undefined = txData.customFields?.cField3; // payment_products.id
    const transactionId = txData.transactionId;
    const statusCode = txData.statusCode; // "2" = paid

    if (!orderId) {
      console.error("Webhook: no orderId in cField1");
      return res.status(200).json({ received: true, processed: false });
    }

    const supabase = getSupabaseAdmin();

    // Decide which table to update. Donations stay in `donations`, everything
    // else (products + subscriptions) lives in `orders`.
    const targetTable = flowType === "donation" ? "donations" : "orders";

    // Preserve existing raw_payload (e.g. consent audit from create-payment)
    let mergedPayload: any = { webhook: payload };
    try {
      const { data: existing } = await supabase
        .from(targetTable)
        .select("raw_payload")
        .eq("id", orderId)
        .maybeSingle();
      if (existing?.raw_payload && typeof existing.raw_payload === "object") {
        mergedPayload = { ...existing.raw_payload, webhook: payload };
      }
    } catch (e) {
      console.warn("Webhook: failed to read existing raw_payload, will overwrite", e);
    }

    // Capture Grow-issued receipt fields if present — Grow handles invoicing
    // for bnei zion (no Morning/Paperless), so whatever it returns about the
    // document URL/number we want stored.
    const invoiceNumber =
      txData.invoiceNumber || txData.invoice_number || txData.documentNumber || null;
    const invoiceUrl =
      txData.invoiceUrl || txData.invoice_url || txData.documentUrl || null;
    const invoiceId = txData.invoiceId || txData.invoice_id || txData.documentId || null;

    // Update the row with all transaction details + receipt links
    const updateRow: Record<string, any> = {
      payment_status: statusCode === "2" ? "completed" : "failed",
      payment_method: txData.cardBrand || "credit",
      payment_id: String(transactionId),
      transaction_type_id: txData.transactionTypeId
        ? Number(txData.transactionTypeId)
        : null,
      asmachta: txData.asmachta || null,
      card_suffix: txData.cardSuffix || null,
      raw_payload: mergedPayload,
      invoice_number: invoiceNumber,
      invoice_url: invoiceUrl,
      invoice_id: invoiceId,
    };
    // `orders` has a `status` column that Lovable used for fulfilment
    // tracking — flip it on success so old admin views keep working.
    if (targetTable === "orders") {
      updateRow.status = statusCode === "2" ? "confirmed" : "payment_failed";
    }

    const { error: updateErr } = await supabase
      .from(targetTable)
      .update(updateRow)
      .eq("id", orderId);

    if (updateErr) {
      console.error(`Webhook: failed to update ${targetTable}`, updateErr);
    }

    // Approve the transaction (REQUIRED by Grow — חנה actively monitors and
    // flags integrations that don't approve within seconds of the webhook).
    // Explicit logging so we have proof for live-approval review.
    console.log(
      "[Grow ApproveTransaction] Starting for orderId:",
      orderId,
      "txId:",
      transactionId,
      "flow:",
      flowType
    );
    await approveTransaction(txData, productSlug, supabase);
    console.log("[Grow ApproveTransaction] Completed for orderId:", orderId);

    // Post-purchase side effects (only on successful payment)
    if (statusCode === "2") {
      try {
        await runPostPurchaseSideEffects({
          supabase,
          targetTable,
          orderId,
          productSlug,
        });
      } catch (e) {
        console.error("Post-purchase side effects exception:", e);
      }
    }

    // Donations: subscribe the donor to the Smoove marketing list. Skips
    // silently if SMOOVE_API_KEY is unset, the email is empty, or the call
    // fails — donation completion is never blocked on this.
    if (flowType === "donation" && statusCode === "2") {
      await subscribeToSmoove({
        email: txData.payerEmail,
        fullName: txData.fullName || "",
        phone: txData.payerPhone || "",
        company: "תרומה",
        listId: parseInt(process.env.SMOOVE_DEFAULT_LIST_ID || "1118798", 10),
      });
    }

    return res.status(200).json({ received: true, processed: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    // Always 200 so Grow doesn't retry forever
    return res.status(200).json({ received: true, error: error.message });
  }
}

// ───────────────────────────── Side effects ─────────────────────────────

const FALLBACK_PRODUCTS: Record<string, any> = {
  "weekly-chapter-subscription": {
    id: "weekly-chapter-subscription",
    display_name: "מנוי הפרק השבועי",
    type: "directDebit",
    page_code_env: "SUBSCRIPTION",
    smoove_list_id: 1045078,
    smoove_list_name: "הפרק השבועי - תכנית מנויים",
  },
  "book-megilat-esther": {
    id: "book-megilat-esther",
    display_name: "מגילת אסתר",
    type: "wallet",
    page_code_env: "PRODUCTS",
    smoove_list_id: 1131982,
    smoove_list_name: "מגילת אסתר",
  },
};

async function loadProductConfig(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  productSlug: string | undefined
) {
  if (!productSlug) return null;
  try {
    const { data } = await supabase
      .from("payment_products")
      .select(
        "id, display_name, type, page_code_env, smoove_list_id, smoove_list_name, target_table"
      )
      .eq("id", productSlug)
      .maybeSingle();
    if (data) return data;
  } catch (e) {
    console.warn("payment_products table unavailable, using fallback wiring", e);
  }
  return FALLBACK_PRODUCTS[productSlug] || null;
}

// ── Product → access tag mapping ────────────────────────────────────────────
// Maps a payment_products slug to the access tag it grants.
// Extend this map when new subscription products are added.
const PRODUCT_ACCESS_TAGS: Record<string, string> = {
  "weekly-chapter-subscription": "program:weekly-chapter",
};

// How long does a successful charge extend the subscription?
// For direct-debit (monthly) we add 35 days (5-day grace period over 30-day month).
// For one-time wallet purchases with no recurrence we set null (forever).
const PRODUCT_VALID_DURATION_DAYS: Record<string, number | null> = {
  "weekly-chapter-subscription": 35, // monthly direct debit — 30 days + 5-day grace
  "book-megilat-esther": null,         // one-time purchase — forever
};

async function grantAccessTag(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  email: string;
  productSlug: string | undefined;
  orderId: string;
}) {
  const { supabase, email, productSlug, orderId } = params;
  if (!productSlug) return;

  const tag = PRODUCT_ACCESS_TAGS[productSlug];
  if (!tag) {
    console.log(`[AccessTag] No tag mapped for product "${productSlug}" — skipping`);
    return;
  }

  const durationDays = PRODUCT_VALID_DURATION_DAYS[productSlug];
  const validUntil = durationDays != null
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Look up the Supabase auth user by email
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 });
  const authUsers = (authData as any)?.users as Array<{ id: string; email?: string }> | undefined;
  const user = authUsers?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  const userId = user?.id || null;

  // Resolve grow_orders id if the table exists (it may not yet)
  let growOrderId: string | null = null;
  try {
    const { data: goRow } = await supabase
      .from("grow_orders")
      .select("id")
      .eq("id", orderId)
      .maybeSingle();
    if (goRow?.id) growOrderId = goRow.id;
  } catch (_) { /* grow_orders table may not exist */ }

  const row = {
    user_id: userId,
    email: email.toLowerCase(),
    tag,
    valid_until: validUntil,
    source: "grow_webhook",
    grow_order_id: growOrderId,
    pending_user_link: userId == null,
    notes: `Auto-granted by Grow webhook. product=${productSlug} orderId=${orderId}`,
  };

  console.log(`[AccessTag] Upserting tag="${tag}" for email="${email}" valid_until=${validUntil}`);

  if (userId) {
    // If we have a real user, upsert on (user_id, tag)
    const { error } = await supabase
      .from("user_access_tags")
      .upsert(row, { onConflict: "user_id,tag" });
    if (error) console.error("[AccessTag] Upsert error (by user_id):", error.message);
    else console.log(`[AccessTag] Granted tag="${tag}" to user_id=${userId}`);
  } else {
    // No auth user yet — upsert on (lower(email), tag) pending link
    const { error } = await supabase
      .from("user_access_tags")
      .upsert(row, { onConflict: "email,tag" });
    if (error) console.error("[AccessTag] Upsert error (by email):", error.message);
    else console.log(`[AccessTag] Granted tag="${tag}" to email=${email} (pending_user_link=true)`);
  }
}

async function runPostPurchaseSideEffects(args: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  targetTable: string;
  orderId: string;
  productSlug: string | undefined;
}) {
  const { supabase, targetTable, orderId, productSlug } = args;

  // Load buyer details from the row we just updated
  const buyerCols =
    targetTable === "donations"
      ? "id, donor_name, donor_email, amount"
      : "id, customer_name, customer_email, customer_phone, total";
  const { data: row, error: rowErr } = await supabase
    .from(targetTable)
    .select(buyerCols)
    .eq("id", orderId)
    .maybeSingle();
  if (rowErr || !row) {
    console.warn("Post-purchase: failed to reload row", rowErr);
    return;
  }

  const fullName =
    (row as any).customer_name || (row as any).donor_name || "";
  const email =
    (row as any).customer_email || (row as any).donor_email || "";
  const phone = (row as any).customer_phone || "";

  if (!email) {
    console.log("Post-purchase: no email — skipping Smoove subscribe + access tag");
    return;
  }

  // ── Grant user_access_tags (subscriptions only) ──────────────────────────
  // This runs on EVERY successful Grow webhook — including monthly recurring
  // charges. On recurring charges, valid_until is extended by 35 days.
  // If the user_access_tags table doesn't exist yet (migration not yet applied)
  // this fails silently and doesn't break the overall flow.
  try {
    await grantAccessTag({ supabase, email, productSlug, orderId });
  } catch (e) {
    console.error("[AccessTag] Exception (non-fatal):", e);
  }

  // ── Smoove subscribe ─────────────────────────────────────────────────────
  const productCfg = await loadProductConfig(supabase, productSlug);
  if (!productCfg?.smoove_list_id) {
    console.log("Post-purchase: no smoove_list_id wired — skipping subscribe");
    return;
  }

  const ok = await subscribeToSmoove({
    email,
    fullName,
    phone,
    company: productCfg.display_name || productSlug || "רכישה",
    listId: productCfg.smoove_list_id,
  });

  try {
    await supabase
      .from(targetTable)
      .update({
        smoove_subscribed: ok,
        smoove_list_id: productCfg.smoove_list_id,
      })
      .eq("id", orderId);
  } catch (e) {
    // Column may not exist yet — try a minimal update
    try {
      await supabase
        .from(targetTable)
        .update({ smoove_subscribed: ok })
        .eq("id", orderId);
    } catch {}
  }
}

// ───────────────────────────── Smoove ─────────────────────────────

// Smoove POST /v1/Contacts returns 409 for any email already in Smoove
// (any list). `updateIfExists: true` does NOT bypass this. We must lookup
// the contact and PUT the list subscription onto the existing record.
async function subscribeToSmoove(params: {
  email: string;
  fullName: string;
  phone: string;
  company: string;
  listId: number;
}): Promise<boolean> {
  if (!SMOOVE_API_KEY) {
    console.warn("SMOOVE_API_KEY not configured — skipping subscribe");
    return false;
  }
  const firstName = params.fullName.split(/\s+/)[0] || params.fullName;
  const lastName = params.fullName.split(/\s+/).slice(1).join(" ") || "";
  const email = params.email.toLowerCase().trim();
  const headers = {
    Authorization: `Bearer ${SMOOVE_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const createRes = await fetch("https://rest.smoove.io/v1/Contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        cellPhone: params.phone,
        company: params.company,
        canReceiveEmails: true,
        canReceiveSms: true,
        lists_ToSubscribe: [params.listId],
      }),
    });

    if (createRes.ok) return true;

    const createText = await createRes.text();
    const alreadyExists =
      createRes.status === 409 ||
      createText.toLowerCase().includes("already exists");

    if (!alreadyExists) {
      console.error("Smoove create failed:", createRes.status, createText);
      return false;
    }

    const lookupRes = await fetch(
      `https://rest.smoove.io/v1/Contacts/${encodeURIComponent(email)}?by=email`,
      { method: "GET", headers }
    );
    if (!lookupRes.ok) {
      console.error(
        "Smoove lookup-after-409 failed:",
        lookupRes.status,
        await lookupRes.text()
      );
      return false;
    }
    const contact = await lookupRes.json();
    if (!contact?.id) {
      console.error("Smoove lookup-after-409 returned no id:", contact);
      return false;
    }

    const updateRes = await fetch(
      `https://rest.smoove.io/v1/Contacts/${contact.id}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ lists_ToSubscribe: [params.listId] }),
      }
    );
    if (!updateRes.ok) {
      console.error(
        "Smoove PUT (add to list) failed:",
        updateRes.status,
        await updateRes.text()
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error("Smoove subscribe error:", e);
    return false;
  }
}

// ───────────────────────────── Approve transaction ─────────────────────────

async function approveTransaction(
  txData: any,
  productSlug: string | undefined,
  supabase: ReturnType<typeof getSupabaseAdmin>
) {
  try {
    // Resolve pageCode dynamically: each product has a `page_code_env`
    // (e.g. "PRODUCTS") and we read process.env["GROW_PAGECODE_PRODUCTS"].
    const productCfg = await loadProductConfig(supabase, productSlug);
    let pageCode: string | undefined;
    if (productCfg?.page_code_env) {
      const envKey = `GROW_PAGECODE_${productCfg.page_code_env}`;
      pageCode = (process.env[envKey] || "").trim();
    }
    // Last-resort fallback so approve still fires even without product wiring
    if (!pageCode) {
      const flowType = txData.customFields?.cField2;
      pageCode =
        flowType === "donation"
          ? (process.env.GROW_PAGECODE_DONATIONS || "").trim()
          : (process.env.GROW_PAGECODE_PRODUCTS || "").trim();
    }
    if (!pageCode) {
      console.error(
        "[Grow ApproveTransaction] No pageCode available — cannot approve"
      );
      return;
    }

    const formData = new FormData();
    formData.append("pageCode", pageCode);
    formData.append("transactionId", String(txData.transactionId));
    formData.append("transactionToken", txData.transactionToken);
    formData.append("transactionTypeId", String(txData.transactionTypeId));
    formData.append("paymentType", String(txData.paymentType));
    formData.append("sum", String(txData.sum));
    formData.append("paymentsNum", String(txData.paymentsNum));
    formData.append("allPaymentsNum", String(txData.allPaymentsNum));
    formData.append("asmachta", String(txData.asmachta));
    formData.append("description", txData.description || "");
    formData.append("fullName", txData.fullName || "");
    formData.append("payerPhone", txData.payerPhone || "");
    formData.append("payerEmail", txData.payerEmail || "");
    formData.append("cardSuffix", txData.cardSuffix || "");
    formData.append("cardType", txData.cardType || "");
    formData.append("cardTypeCode", String(txData.cardTypeCode || ""));
    formData.append("cardBrand", txData.cardBrand || "");
    formData.append("cardBrandCode", String(txData.cardBrandCode || ""));
    formData.append("cardExp", txData.cardExp || "");
    formData.append("processId", String(txData.processId));
    formData.append("processToken", txData.processToken);

    console.log(
      "[Grow ApproveTransaction] POST to:",
      `${GROW_API_URL}/approveTransaction`,
      {
        transactionId: txData.transactionId,
        processId: txData.processId,
        asmachta: txData.asmachta,
        sum: txData.sum,
        pageCode,
      }
    );

    const response = await fetch(`${GROW_API_URL}/approveTransaction`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    console.log(
      "[Grow ApproveTransaction] Response status:",
      result?.status,
      "err:",
      result?.err,
      "full:",
      JSON.stringify(result)
    );
    if (result?.status !== 1) {
      console.error(
        "[Grow ApproveTransaction] FAILED — Grow did not confirm the transaction",
        result
      );
    }
  } catch (error) {
    console.error("[Grow ApproveTransaction] EXCEPTION:", error);
  }
}
