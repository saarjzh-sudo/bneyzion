/**
 * issue-paperless-invoice — Supabase Edge Function
 *
 * Issues a Paperless invoice for an orders or donations row that
 * doesn't yet have an invoice_url. Calls the Paperless API, stores
 * the resulting invoice_url + invoice_number back on the row.
 *
 * ─── Security ───────────────────────────────────────────────────────────────
 * • Called only by admin-authed users (verified via Supabase JWT + admin role check).
 * • PAPERLESS_API_KEY is stored as a Supabase Edge Function secret — never
 *   exposed to the browser.
 * • Service-role DB access via SUPABASE_SERVICE_ROLE_KEY secret.
 *
 * ─── iType logic ────────────────────────────────────────────────────────────
 * Per MEMORY.md reference_paperless_api_issue_receipts:
 *   iType=2 → חשבון עסקה ששולם (transfer — standard for most payments)
 *   iType=3 → חשבונית-מס-קבלה (credit receipt when existing invoice exists)
 *   iType=5 → App payment
 *
 * For bneyzion we default to iType=2 for both orders and donations.
 * The caller can override via request body.
 *
 * ─── Request body ───────────────────────────────────────────────────────────
 * {
 *   source_table: "orders" | "donations",  // which table the row lives in
 *   record_id: string,                      // UUID of the row
 *   iType?: number,                         // default 2
 * }
 *
 * ─── Response ───────────────────────────────────────────────────────────────
 * {
 *   ok: true,
 *   invoice_number: string,
 *   invoice_url: string,
 * }
 * OR { ok: false, error: string }
 *
 * ─── Status: SKELETON ───────────────────────────────────────────────────────
 * The Paperless endpoint, field names, and auth mechanism are documented in
 * MEMORY.md (reference_paperless_api_issue_receipts). They reference the
 * OMS/aboulafia Paperless account. Bnei Zion does NOT yet have Paperless
 * configured (profile.md has "(למלא)" for the billing section).
 *
 * TODO before going live:
 *   1. Obtain Paperless credentials for bneyzion (ask Saar).
 *   2. Set Edge Function secrets:
 *        supabase secrets set PAPERLESS_API_KEY="<key>" PAPERLESS_BUSINESS_ID="<id>"
 *   3. Test with a REAL order row on staging, verify invoice appears in Paperless dashboard.
 *   4. Confirm iType mapping with accountant (is iType=2 correct for subscription orders?).
 *   5. Remove SKELETON comment from this file.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Secrets (set via `supabase secrets set`) ──────────────────────────────────
const PAPERLESS_API_KEY = Deno.env.get("PAPERLESS_API_KEY") ?? "";
const PAPERLESS_API_URL = Deno.env.get("PAPERLESS_API_URL") ??
  "https://pl-apis-prod-il.paperless.co.il";
const PAPERLESS_BUSINESS_ID = Deno.env.get("PAPERLESS_BUSINESS_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ── Type helpers ──────────────────────────────────────────────────────────────
interface IssueRequest {
  source_table: "orders" | "donations";
  record_id: string;
  iType?: number; // default 2 (transfer/paid)
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Auth check — must be admin ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, "Missing authorization");
    }

    // Use the caller's JWT to verify role (not service role)
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return jsonError(401, "Unauthorized");
    }

    // Check admin role
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleRow?.role !== "admin") {
      return jsonError(403, "Admin access required");
    }

    // ── 2. Parse request ───────────────────────────────────────────────────
    const body = await req.json() as IssueRequest;
    const { source_table, record_id, iType = 2 } = body;

    if (!source_table || !record_id) {
      return jsonError(400, "source_table and record_id are required");
    }
    if (!["orders", "donations"].includes(source_table)) {
      return jsonError(400, "source_table must be 'orders' or 'donations'");
    }

    // ── 3. Load the row ────────────────────────────────────────────────────
    const selectCols = source_table === "orders"
      ? "id, customer_name, customer_email, customer_phone, total, invoice_url, invoice_number, product, created_at"
      : "id, donor_name, donor_email, phone, amount, invoice_url, product, created_at";

    const { data: row, error: rowErr } = await adminClient
      .from(source_table)
      .select(selectCols)
      .eq("id", record_id)
      .maybeSingle();

    if (rowErr || !row) {
      return jsonError(404, `Record not found: ${record_id}`);
    }

    // Guard: already has invoice
    const existingInvoice = (row as any).invoice_url;
    if (existingInvoice) {
      return jsonError(409, "חשבונית כבר קיימת לרשומה זו");
    }

    // ── 4. Check Paperless is configured ──────────────────────────────────
    if (!PAPERLESS_API_KEY) {
      // Skeleton mode: log and return informative error
      console.error("[PaperlessInvoice] PAPERLESS_API_KEY not set — SKELETON mode");
      return jsonError(503, "Paperless לא מוגדר עדיין לבני ציון — ראה TODO בקובץ ה-edge function");
    }

    // ── 5. Build Paperless payload ─────────────────────────────────────────
    const customerName = (row as any).customer_name || (row as any).donor_name || "לקוח";
    const customerEmail = (row as any).customer_email || (row as any).donor_email || null;
    const customerPhone = (row as any).customer_phone || (row as any).phone || null;
    const amount = Number((row as any).total || (row as any).amount || 0);
    const description = (row as any).product || "רכישה / תרומה";
    const date = new Date((row as any).created_at).toISOString().slice(0, 10).replace(/-/g, "/");

    // Paperless invoice payload (field names per MEMORY.md reference)
    const paperlessPayload = {
      iType,
      businessId: PAPERLESS_BUSINESS_ID,
      sName: customerName,
      sEmail: customerEmail,
      sPhone: customerPhone,
      docDate: date,
      // Line items array
      items: [
        {
          iType: 1, // regular item
          description,
          amount,
          quantity: 1,
          price: amount,
          vatType: 0, // 0 = regular VAT
        },
      ],
      // Payment details (single payment — Grow webhook already approved)
      payments: [
        {
          date,
          type: 1, // credit card / bank transfer
          amount,
        },
      ],
    };

    // ── 6. Call Paperless API ──────────────────────────────────────────────
    console.log(`[PaperlessInvoice] Issuing iType=${iType} for ${source_table}/${record_id}, amount=₪${amount}`);

    const paperlessRes = await fetch(`${PAPERLESS_API_URL}/api/invoices/create`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": PAPERLESS_API_KEY,
      },
      body: JSON.stringify(paperlessPayload),
    });

    const paperlessJson = await paperlessRes.json().catch(() => ({}));

    if (!paperlessRes.ok) {
      console.error("[PaperlessInvoice] Paperless API error:", paperlessRes.status, paperlessJson);
      return jsonError(502, `Paperless API שגיאה: ${paperlessJson?.message || paperlessRes.status}`);
    }

    // Extract invoice details from response
    const invoiceNumber = paperlessJson?.documentNumber || paperlessJson?.invoice_number || null;
    const invoiceUrl = paperlessJson?.documentUrl || paperlessJson?.invoice_url || paperlessJson?.url || null;

    if (!invoiceUrl) {
      console.error("[PaperlessInvoice] No invoice URL in response:", paperlessJson);
      return jsonError(502, "Paperless לא החזיר URL לחשבונית");
    }

    // ── 7. Write back to DB ────────────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      invoice_url: invoiceUrl,
    };
    if (invoiceNumber) {
      updatePayload.invoice_number = invoiceNumber;
    }

    const { error: updateErr } = await adminClient
      .from(source_table)
      .update(updatePayload)
      .eq("id", record_id);

    if (updateErr) {
      console.error("[PaperlessInvoice] DB update error:", updateErr);
      // Non-fatal: invoice was issued, just failed to write back
      return new Response(
        JSON.stringify({
          ok: true,
          invoice_number: invoiceNumber,
          invoice_url: invoiceUrl,
          db_update_error: updateErr.message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PaperlessInvoice] Done. invoice_url=${invoiceUrl}`);

    return new Response(
      JSON.stringify({ ok: true, invoice_number: invoiceNumber, invoice_url: invoiceUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PaperlessInvoice] Exception:", msg);
    return jsonError(500, msg);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonError(status: number, error: string) {
  return new Response(
    JSON.stringify({ ok: false, error }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
