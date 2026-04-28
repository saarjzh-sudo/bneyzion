import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// .trim() everywhere — `vercel env add` via piping sometimes appends "\n",
// which silently breaks downstream string routing/comparisons.
const GROW_API_URL = (process.env.GROW_API_URL || "").trim();
const GROW_USER_ID = (process.env.GROW_USER_ID || "").trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

interface CreatePaymentBody {
  sum: number;
  description: string;
  fullName: string;
  phone: string;
  email?: string;
  // Legacy field names — preserved so the existing Checkout/Donate flows
  // keep working. New callers should send `product` in meta and let the
  // server resolve the flow type from payment_products.
  type: "product" | "donation" | "wallet" | "directDebit";
  orderId?: string;
  installments?: number;
  successUrl: string;
  cancelUrl: string;
  meta?: {
    product?: string;       // payment_products.id (e.g. 'book-megilat-esther')
    session_title?: string;
    user_id?: string;
    quantity?: number;
    // ToS / legal consent audit trail (required for Grow live approval)
    tos_accepted?: boolean;
    tos_accepted_at?: string;
  };
  // Donation-only metadata (one-time vs monthly, dedications)
  donationMeta?: {
    is_monthly?: boolean;
    dedication_type?: string;
    dedication_name?: string;
    donor_email?: string;
    user_id?: string;
  };
}

// Conservative fallback if the payment_products row/table isn't there yet.
// Prevents a brand-new env from breaking, and keeps test buys flowing
// while Saar tunes the DB.
const FALLBACK_PRODUCTS: Record<
  string,
  {
    active: boolean;
    type: "wallet" | "directDebit";
    page_code_env: string;
    max_installments: number;
    target_table: "orders" | "donations";
    display_name: string;
  }
> = {
  "weekly-chapter-subscription": {
    active: true,
    type: "directDebit",
    page_code_env: "SUBSCRIPTION",
    max_installments: 1,
    target_table: "orders",
    display_name: "מנוי הפרק השבועי",
  },
  "book-megilat-esther": {
    active: true,
    type: "wallet",
    page_code_env: "PRODUCTS",
    max_installments: 3,
    target_table: "orders",
    display_name: "מגילת אסתר",
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as CreatePaymentBody;
    const {
      sum,
      description,
      fullName,
      phone,
      email,
      type,
      installments,
      successUrl,
      cancelUrl,
      meta,
      donationMeta,
    } = body;
    let { orderId } = body;

    if (!sum || !description || !fullName || !phone || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ───── ToS enforcement (server-side) ─────
    // Hard-required for the new product-driven flow (quick-buy dialogs).
    // For legacy callers (Checkout.tsx cart, Donate.tsx form) we only warn —
    // those forms predate this server and will be retrofitted with a ToS
    // checkbox in a follow-up. Required for Grow live-approval review.
    if (meta?.product && !meta?.tos_accepted) {
      console.warn("create-payment rejected: ToS not accepted", {
        product: meta.product,
        fullName,
      });
      return res.status(400).json({
        error: "יש לאשר את תקנון האתר ומדיניות הפרטיות לפני המשך לתשלום",
      });
    }
    if (!meta?.tos_accepted) {
      console.warn(
        "create-payment legacy call without ToS consent — retrofit this form with a ToS gate",
        { type, fullName }
      );
    }

    // ───── Consent audit ─────
    const consentAudit = {
      tos_accepted: !!meta?.tos_accepted,
      tos_accepted_at: meta?.tos_accepted_at || new Date().toISOString(),
      ip:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        null,
      user_agent: (req.headers["user-agent"] as string) || null,
    };
    console.log("create-payment ToS consent recorded:", consentAudit);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ───── Resolve product config (DB → fallback) ─────
    const productSlug = meta?.product;
    let productCfg: any = null;
    if (productSlug) {
      try {
        const { data, error } = await supabaseAdmin
          .from("payment_products")
          .select(
            "id, display_name, active, type, page_code_env, max_installments, target_table, default_amount"
          )
          .eq("id", productSlug)
          .maybeSingle();
        if (!error && data) productCfg = data;
      } catch (e) {
        console.warn("payment_products table unavailable, using fallback", e);
      }
      if (!productCfg) {
        const fb = FALLBACK_PRODUCTS[productSlug];
        if (fb) productCfg = { id: productSlug, ...fb };
      }
    }

    // For LEGACY callers (existing Checkout.tsx, Donate.tsx) we still accept
    // `type` directly without a product. Quick-buy callers MUST pass a product.
    const isLegacyCart =
      !productSlug && (type === "product" || type === "donation");

    if (!isLegacyCart) {
      if (!productCfg) {
        return res.status(400).json({
          error: "Missing or unknown product",
          details: { product: productSlug },
        });
      }
      if (!productCfg.active) {
        return res
          .status(403)
          .json({ error: "Payments are not enabled for this product" });
      }
    }

    // ───── Decide flow type + pageCode ─────
    // Modern (product-driven): productCfg.type → page_code_env → env var
    // Legacy: type='product' → PRODUCTS, type='donation' → DONATIONS
    let flowType: "wallet" | "directDebit";
    let pageCode: string;
    let cField2Value: string;

    if (productCfg) {
      flowType = productCfg.type;
      const envKey = `GROW_PAGECODE_${productCfg.page_code_env}`;
      pageCode = (process.env[envKey] || "").trim();
      cField2Value = flowType;
      if (!pageCode) {
        console.error(`Missing env ${envKey} for product ${productCfg.id}`);
        return res
          .status(500)
          .json({ error: `Payment page not configured (${envKey})` });
      }
    } else {
      // Legacy path
      if (type === "donation" || type === "directDebit") {
        flowType = "directDebit";
        pageCode = (process.env.GROW_PAGECODE_DONATIONS || "").trim();
        cField2Value = "donation";
      } else {
        flowType = "wallet";
        pageCode = (process.env.GROW_PAGECODE_PRODUCTS || "").trim();
        cField2Value = "product";
      }
      if (!pageCode) {
        return res
          .status(500)
          .json({ error: "Payment page not configured (legacy)" });
      }
    }

    // ───── Installments cap ─────
    const requestedInstallments =
      installments && installments > 1 ? installments : 1;
    const maxInstallments = productCfg?.max_installments || 1;
    const safeInstallments = Math.min(requestedInstallments, maxInstallments);

    // ───── Create the order/donation row if not provided ─────
    if (!orderId) {
      // Donation flow (legacy or product-as-donation)
      if (
        type === "donation" ||
        productCfg?.target_table === "donations"
      ) {
        const { data: donation, error: donationErr } = await supabaseAdmin
          .from("donations")
          .insert({
            amount: sum,
            donor_name: fullName,
            donor_email: email || donationMeta?.donor_email || null,
            phone,
            description,
            product: productSlug || null,
            is_monthly: donationMeta?.is_monthly || flowType === "directDebit",
            dedication_type: donationMeta?.dedication_type || "regular",
            dedication_name: donationMeta?.dedication_name || null,
            user_id: donationMeta?.user_id || meta?.user_id || null,
            payment_status: "pending",
            raw_payload: { consent: consentAudit },
          })
          .select("id")
          .single();

        if (donationErr) {
          console.error("Donation insert error:", donationErr);
          return res.status(500).json({
            error: "Failed to create donation record",
            details: donationErr.message,
          });
        }
        orderId = donation.id;
      } else {
        // Product / subscription flow → orders table
        const { data: order, error: orderErr } = await supabaseAdmin
          .from("orders")
          .insert({
            user_id: meta?.user_id || null,
            customer_name: fullName,
            customer_email: email || null,
            customer_phone: phone,
            subtotal: sum,
            total: sum,
            installments: safeInstallments,
            invoice_type: "receipt",
            product: productSlug || null,
            description,
            payment_status: "pending",
            raw_payload: { consent: consentAudit },
          })
          .select("id")
          .single();

        if (orderErr) {
          console.error("Order insert error:", orderErr);
          return res.status(500).json({
            error: "Failed to create order record",
            details: orderErr.message,
          });
        }
        orderId = order.id;
      }
    }

    // ───── Build Grow createPaymentProcess payload ─────
    const formData = new FormData();
    formData.append("pageCode", pageCode);
    formData.append("userId", GROW_USER_ID);
    formData.append("sum", String(sum));
    formData.append("description", description);
    formData.append("successUrl", successUrl);
    formData.append("cancelUrl", cancelUrl);
    formData.append("pageField[fullName]", fullName);
    formData.append("pageField[phone]", phone);
    if (email) {
      formData.append("pageField[email]", email);
    }
    if (safeInstallments > 1) {
      formData.append("paymentNum", String(safeInstallments));
    }

    // Custom fields for webhook routing
    formData.append("cField1", orderId!);  // → updates the right row
    formData.append("cField2", cField2Value); // → 'product' | 'donation' | 'wallet' | 'directDebit'
    if (productSlug) {
      formData.append("cField3", productSlug); // → product wiring lookup
    }

    // Build notifyUrl from request headers — works automatically on custom domains
    const webhookUrl = `${
      req.headers["x-forwarded-proto"] || "https"
    }://${req.headers.host}/api/grow/webhook`;
    formData.append("notifyUrl", webhookUrl);

    const response = await fetch(`${GROW_API_URL}/createPaymentProcess`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.status !== 1) {
      console.error("Grow createPaymentProcess error:", data);
      return res.status(400).json({
        error: data.err || "Payment creation failed",
        details: data,
      });
    }

    // Wallet → authCode (open SDK overlay). DirectDebit → url (redirect).
    return res.status(200).json({
      authCode: data.data.authCode || null,
      url: data.data.url || null,
      processId: data.data.processId,
      processToken: data.data.processToken,
      orderId,
    });
  } catch (error: any) {
    console.error("create-payment error:", error);
    return res.status(500).json({ error: error.message });
  }
}
