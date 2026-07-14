import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
// NOTE: ".js" extension is required — package.json has "type":"module", so the
// compiled function resolves ESM specifiers literally (coupon.ts → coupon.js).
import { validateCoupon, computeCouponDiscount } from "../lib/coupon.js";

// .trim() everywhere — `vercel env add` via piping sometimes appends "\n",
// which silently breaks downstream string routing/comparisons.
const GROW_API_URL = (process.env.GROW_API_URL || "").trim();
// GROW_USER_ID is the legacy single-merchant fallback. Live cutover (May 2026)
// introduced two separate Grow merchant accounts — one for store/subscription
// ("עם קבלה") and one for donations ("קבלת תרומה") — each with its own userId
// and pageCode. Read per-flow via GROW_USER_ID_{PAGE_CODE_ENV} (e.g.
// GROW_USER_ID_PRODUCTS, _SUBSCRIPTION, _DONATIONS) and fall back to this.
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
    // payment_products.id (e.g. 'book-megilat-esther')
    // OR 'store:<products.slug>' for direct products-table items
    product?: string;
    session_title?: string;
    user_id?: string;
    quantity?: number;
    // ToS / legal consent audit trail (required for Grow live approval)
    tos_accepted?: boolean;
    tos_accepted_at?: string;
    // Shipping (physical store products) — persisted to orders.shipping_* columns
    shipping_method?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_zip?: string;
    // רמה 17: פריטי עגלה (/checkout) → order_items לכל פריט
    cart_items?: Array<{
      product_id?: string;
      slug?: string;
      title?: string;
      quantity?: number;
      unit_price?: number;
    }>;
    // Coupon (store checkout) — server re-validates; sum must equal
    // pre_discount_sum - discount + shipping_fee or the request is rejected
    coupon_code?: string;
    pre_discount_sum?: number;
    shipping_fee?: number;
  };
  // Donation-only metadata (one-time vs monthly, dedications)
  donationMeta?: {
    is_monthly?: boolean;
    dedication_type?: string;
    dedication_name?: string;
    donor_email?: string;
    user_id?: string;
    // Campaign-specific routing (added by Donate.tsx when ?source= param exists)
    source?: string;   // e.g. "yehoshua-campaign"
    tier_id?: string;  // e.g. "tier-90"
  };
  // הקדשת שיעור/סדרה → lesson_dedications (products: dedication-lesson / dedication-series).
  // השרת יוצר את שורת ה-pending (service role — למשתמשים אין INSERT policy)
  // ואוכף את המחיר מול dedication_settings + פופולריות הרב / גודל הסדרה.
  dedicationMeta?: {
    scope: "lesson" | "series";
    lesson_id?: string;
    series_id?: string;
    dedication_type: string; // iluy_neshama | refua | hatzlacha | memory
    dedicated_name: string;
    dedicator_name?: string;
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
      dedicationMeta,
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

    // ───── Coupon — server-side authority ─────
    // The client already showed the discount via /api/store/validate-coupon,
    // but the charge amount is verified HERE: re-validate the coupon, recompute
    // the discount, and reject any sum that doesn't add up (₪1 rounding grace).
    let couponDiscount = 0;
    let couponCode: string | null = null;
    if (meta?.coupon_code) {
      const check = await validateCoupon(supabaseAdmin, meta.coupon_code);
      if (!check.valid) {
        return res.status(400).json({ error: check.reason || "קוד הקופון אינו תקף" });
      }
      const preDiscount = Number(meta.pre_discount_sum) || 0;
      const shippingFee = Number(meta.shipping_fee) || 0;
      couponDiscount = computeCouponDiscount(check, preDiscount);
      const expectedSum = preDiscount - couponDiscount + shippingFee;
      if (Math.abs(expectedSum - sum) > 1) {
        console.warn("create-payment coupon sum mismatch:", {
          code: check.code, preDiscount, couponDiscount, shippingFee, expectedSum, sum,
        });
        return res.status(400).json({ error: "סכום התשלום אינו תואם את ההנחה — רעננו את העמוד ונסו שוב" });
      }
      couponCode = check.code!;
    }

    // ───── Resolve product config (DB → fallback) ─────
    // meta.product can be:
    //   (a) a payment_products.id  e.g. 'book-megilat-esther'
    //   (b) 'store:<slug>'         e.g. 'store:sefer-bereshit' → reads products table
    const productSlug = meta?.product;
    let productCfg: any = null;
    let isStoreProduct = false; // true when sourced from products table
    let storeProductSlug: string | null = null; // the raw products.slug

    if (productSlug) {
      // ── Store product path (products table) ──────────────────────────────
      if (productSlug.startsWith("store:")) {
        isStoreProduct = true;
        storeProductSlug = productSlug.slice("store:".length);
        try {
          const { data: storeProduct, error: spErr } = await supabaseAdmin
            .from("products")
            .select("id, title, price, is_digital, slug, status")
            .eq("slug", storeProductSlug)
            .eq("status", "active")
            .maybeSingle();
          if (spErr || !storeProduct) {
            console.error("Store product not found:", storeProductSlug, spErr);
            return res.status(400).json({
              error: "מוצר לא נמצא או לא פעיל",
              details: { slug: storeProductSlug },
            });
          }
          // Build a synthetic productCfg compatible with the rest of the handler
          productCfg = {
            id: productSlug,
            display_name: storeProduct.title,
            active: true,
            type: "wallet" as const,           // all store products use wallet (one-time)
            page_code_env: "PRODUCTS",
            max_installments: 12,
            target_table: "orders",
            default_amount: storeProduct.price,
            _store_product_id: storeProduct.id, // extra: used when creating order_items
            _store_product_slug: storeProduct.slug,
          };
        } catch (e) {
          console.error("products table lookup failed:", e);
          return res.status(500).json({ error: "שגיאה בקריאת פרטי המוצר" });
        }
      } else {
        // ── payment_products path (existing flow) ──────────────────────────
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
    }

    // For LEGACY callers (existing Checkout.tsx, Donate.tsx) we still accept
    // `type` directly without a product. Quick-buy callers MUST pass a product.
    // Legacy callers (Donate.tsx, Checkout.tsx) pass `type` directly without a
    // meta.product. Donate.tsx sends type="donation" (one-time) OR
    // type="directDebit" (הוראת קבע / recurring). Both are legitimate legacy
    // paths to the DONATIONS merchant — include directDebit here so it doesn't
    // fall through to the "Missing or unknown product" guard.
    const isLegacyCart =
      !productSlug &&
      (type === "product" || type === "donation" || type === "directDebit");

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

    // ───── Dedication — server-side price authority ─────
    // The client shows the price, but the charged amount is verified HERE
    // against dedication_settings + the popularity/size rules. A tampered
    // sum is rejected before any row is created.
    const isDedication = productCfg?.target_table === "lesson_dedications";
    if (isDedication) {
      if (!dedicationMeta?.scope || !dedicationMeta?.dedicated_name?.trim()) {
        return res.status(400).json({ error: "חסרים פרטי הקדשה (סוג ושם)" });
      }
      if (dedicationMeta.scope === "lesson" && !dedicationMeta.lesson_id) {
        return res.status(400).json({ error: "חסר מזהה שיעור להקדשה" });
      }
      if (dedicationMeta.scope === "series" && !dedicationMeta.series_id) {
        return res.status(400).json({ error: "חסר מזהה סדרה להקדשה" });
      }
      const expectedPrice = await computeDedicationPrice(supabaseAdmin, dedicationMeta);
      if (Math.abs(expectedPrice - sum) > 1) {
        console.warn("create-payment dedication sum mismatch:", {
          expectedPrice, sum, scope: dedicationMeta.scope,
          lesson_id: dedicationMeta.lesson_id, series_id: dedicationMeta.series_id,
        });
        return res.status(400).json({
          error: "סכום ההקדשה אינו תואם את המחיר — רעננו את העמוד ונסו שוב",
        });
      }
    }

    // ───── Decide flow type + pageCode + userId ─────
    // Modern (product-driven): productCfg.type → page_code_env → env var
    // Legacy: type='product' → PRODUCTS, type='donation' → DONATIONS
    // Each flow resolves BOTH pageCode AND userId from the same suffix so that
    // donations route to the "קבלת תרומה" merchant and store/subscription
    // route to the "עם קבלה" merchant (two separate Grow accounts).
    let flowType: "wallet" | "directDebit";
    let pageCode: string;
    let userId: string;
    let cField2Value: string;

    if (productCfg) {
      flowType = productCfg.type;
      const envKey = `GROW_PAGECODE_${productCfg.page_code_env}`;
      const userEnvKey = `GROW_USER_ID_${productCfg.page_code_env}`;
      pageCode = (process.env[envKey] || "").trim();
      userId = (process.env[userEnvKey] || GROW_USER_ID).trim();
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
        userId = (process.env.GROW_USER_ID_DONATIONS || GROW_USER_ID).trim();
        cField2Value = "donation";
      } else {
        flowType = "wallet";
        pageCode = (process.env.GROW_PAGECODE_PRODUCTS || "").trim();
        userId = (process.env.GROW_USER_ID_PRODUCTS || GROW_USER_ID).trim();
        cField2Value = "product";
      }
      if (!pageCode) {
        return res
          .status(500)
          .json({ error: "Payment page not configured (legacy)" });
      }
    }
    if (!userId) {
      console.error("create-payment: no userId resolved (live env not set?)");
      return res
        .status(500)
        .json({ error: "Payment merchant not configured" });
    }

    // ───── Installments cap ─────
    const requestedInstallments =
      installments && installments > 1 ? installments : 1;
    const maxInstallments = productCfg?.max_installments || 1;
    const safeInstallments = Math.min(requestedInstallments, maxInstallments);

    // ───── Create the order/donation/dedication row if not provided ─────
    if (!orderId) {
      // Dedication flow → lesson_dedications (pending until webhook confirms)
      if (isDedication) {
        const { data: dedication, error: dedErr } = await supabaseAdmin
          .from("lesson_dedications")
          .insert({
            scope: dedicationMeta!.scope,
            lesson_id: dedicationMeta!.scope === "lesson" ? dedicationMeta!.lesson_id ?? null : null,
            series_id: dedicationMeta!.scope === "series" ? dedicationMeta!.series_id ?? null : null,
            dedication_type: dedicationMeta!.dedication_type || "iluy_neshama",
            dedicated_name: dedicationMeta!.dedicated_name.trim(),
            dedicator_name: dedicationMeta!.dedicator_name?.trim() || fullName,
            dedicator_email: email || null,
            dedicator_phone: phone,
            amount: sum,
            status: "pending",
            user_id: dedicationMeta!.user_id || meta?.user_id || null,
            raw_payload: { consent: consentAudit },
          })
          .select("id")
          .single();

        if (dedErr) {
          console.error("Dedication insert error:", dedErr);
          return res.status(500).json({
            error: "Failed to create dedication record",
            details: dedErr.message,
          });
        }
        orderId = dedication.id;
      } else if (
        type === "donation" ||
        productCfg?.target_table === "donations"
      ) {
        // source / tier_id come from Donate.tsx when a campaign redirect sets
        // ?source=yehoshua-campaign&tier=tier-90. The product column is set to
        // meta.product (same value as source) so stat views can filter on it.
        const donationSource = donationMeta?.source || null;
        const donationTierId = donationMeta?.tier_id || null;

        const { data: donation, error: donationErr } = await supabaseAdmin
          .from("donations")
          .insert({
            amount: sum,
            donor_name: fullName,
            donor_email: email || donationMeta?.donor_email || null,
            phone,
            description,
            product: productSlug || donationSource || null,
            source: donationSource,
            tier_id: donationTierId,
            is_monthly: donationMeta?.is_monthly || flowType === "directDebit",
            dedication_type: donationMeta?.dedication_type || "regular",
            dedication_name: donationMeta?.dedication_name || null,
            user_id: donationMeta?.user_id || meta?.user_id || null,
            payment_status: "pending",
            raw_payload: { consent: consentAudit },
            // Shipping address (populated when the buyer receives a physical product)
            shipping_street: (donationMeta as any)?.shipping_street || null,
            shipping_house_number: (donationMeta as any)?.shipping_house_number || null,
            shipping_city: (donationMeta as any)?.shipping_city || null,
            shipping_zip: (donationMeta as any)?.shipping_zip || null,
            shipping_notes: (donationMeta as any)?.shipping_notes || null,
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
        const rawPayloadBase: Record<string, any> = { consent: consentAudit };
        // Keep the chosen shipping method structured (no dedicated column on orders)
        if (meta?.shipping_method) {
          rawPayloadBase.shipping_method = meta.shipping_method;
        }
        // Coupon audit trail — webhook increments used_count on confirmed payment
        if (couponCode) {
          rawPayloadBase.coupon_code = couponCode;
          rawPayloadBase.coupon_discount = couponDiscount;
        }
        // For store products, stash the products-table id so webhook can write order_items
        if (isStoreProduct && productCfg?._store_product_id) {
          rawPayloadBase.store_product_id = productCfg._store_product_id;
          rawPayloadBase.store_product_slug = productCfg._store_product_slug;
          rawPayloadBase.product_source = "products"; // webhook routing key
        }
        // רמה 17 (יואב 14.7): רכישת-עגלה (/checkout) שולחת meta.cart_items —
        // בלעדיהם הזמנת-עגלה נוצרה בלי order_items, בלי גישה ובלי מסירת קובץ.
        const cartItems: Array<{ product_id?: string; title?: string; quantity?: number; unit_price?: number }> =
          Array.isArray(meta?.cart_items) ? meta.cart_items.slice(0, 50) : [];
        if (cartItems.length) {
          rawPayloadBase.product_source = "products";
          rawPayloadBase.cart_item_count = cartItems.length;
        }

        const { data: order, error: orderErr } = await supabaseAdmin
          .from("orders")
          .insert({
            user_id: meta?.user_id || null,
            customer_name: fullName,
            customer_email: email || null,
            customer_phone: phone,
            // With a coupon: subtotal = products before discount, total = charged.
            subtotal: meta?.pre_discount_sum ? Number(meta.pre_discount_sum) : sum,
            // orders.discount is NOT NULL — an explicit null overrides the column
            // default and violates the constraint, failing EVERY coupon-less
            // purchase ("Failed to create order record"). No coupon = 0, not null.
            discount: couponDiscount || 0,
            total: sum,
            installments: safeInstallments,
            invoice_type: "receipt",
            product: productSlug || (cartItems.length ? "store-order" : null),
            description,
            payment_status: "pending",
            raw_payload: rawPayloadBase,
            // Shipping — structured columns (previously only free-text in description)
            shipping_address: meta?.shipping_address || null,
            shipping_city: meta?.shipping_city || null,
            shipping_zip: meta?.shipping_zip || null,
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

        // For store products, create the order_items row immediately
        if (isStoreProduct && productCfg?._store_product_id) {
          try {
            await supabaseAdmin.from("order_items").insert({
              order_id: orderId,
              product_id: productCfg._store_product_id,
              title: productCfg.display_name,
              quantity: 1,
              unit_price: productCfg.default_amount ?? sum,
              total_price: sum,
              item_type: "product",
            });
          } catch (e) {
            // Non-fatal — order row is already created. Log and continue.
            console.warn("create-payment: order_items insert failed (non-fatal):", e);
          }
        }

        // רכישת-עגלה: order_items לכל פריט בסל (רמה 17)
        if (cartItems.length) {
          try {
            await supabaseAdmin.from("order_items").insert(
              cartItems.map((ci) => ({
                order_id: orderId,
                product_id: ci.product_id || null,
                title: String(ci.title || "פריט"),
                quantity: Number(ci.quantity) || 1,
                unit_price: Number(ci.unit_price) || 0,
                total_price: (Number(ci.unit_price) || 0) * (Number(ci.quantity) || 1),
                item_type: "product",
              })),
            );
          } catch (e) {
            console.warn("create-payment: cart order_items insert failed (non-fatal):", e);
          }
        }
      }
    }

    // ───── Build Grow createPaymentProcess payload ─────
    const formData = new FormData();
    formData.append("pageCode", pageCode);
    formData.append("userId", userId);
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
      // maxPaymentNum lets the customer choose 1–N in Grow's UI.
      // paymentNum would have forced a fixed count (no choice for the buyer).
      formData.append("maxPaymentNum", String(safeInstallments));
    }

    // Custom fields for webhook routing
    formData.append("cField1", orderId!);  // → updates the right row
    formData.append("cField2", cField2Value); // → 'product' | 'donation' | 'wallet' | 'directDebit'
    if (productSlug) {
      formData.append("cField3", productSlug); // → product wiring lookup
    }

    // DirectDebit (הוראת קבע) — required fields for recurring to appear in Grow dashboard.
    // Without these, Grow registers a one-time charge even though the page is a directDebit page.
    // Applies to: weekly-chapter-subscription (QuickBuyDialog) AND donation directDebit (Donate.tsx).
    if (flowType === "directDebit") {
      // chargeIdentifier — unique key per customer+product combo. orderId is already a UUID
      // created above and is unique per transaction, which is what Grow expects here.
      formData.append("chargeIdentifier", orderId!);
      // planName — human-readable label visible in Grow dashboard for the recurring plan.
      // productCfg?.display_name is set for both the FALLBACK and DB paths; description is
      // the caller-supplied fallback (e.g. "תרומה חודשית").
      formData.append("planName", productCfg?.display_name || description);
      // period — billing cadence. All current directDebit products are monthly.
      formData.append("period", "MONTHLY");
      // sumInstallments — 0 = recurring with no end date (until customer cancels).
      formData.append("sumInstallments", "0");
    }

    // Build notifyUrl from request headers — works automatically on custom domains.
    // For protected previews (Vercel SSO), append the WEBHOOK_PROTECTION_BYPASS query
    // param so Grow's server-to-server callback can pass through deployment protection.
    // The env var is set only on preview/sandbox; production has no SSO on its custom domain.
    const webhookBypass = (process.env.WEBHOOK_PROTECTION_BYPASS || "").trim();
    // NOTE: do NOT include `x-vercel-set-bypass-cookie` — that triggers a 307
    // redirect that server-to-server callers (like Grow) cannot follow. Plain
    // bypass query alone returns 200 directly.
    const bypassQuery = webhookBypass
      ? `?x-vercel-protection-bypass=${webhookBypass}`
      : "";
    const webhookUrl = `${
      req.headers["x-forwarded-proto"] || "https"
    }://${req.headers.host}/api/grow/webhook${bypassQuery}`;
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

/**
 * תמחור הקדשות — מקור אמת אחד לשרת וללקוח (הלקוח מציג, השרת אוכף):
 *   שיעור: מחיר בסיס; אם לרב של השיעור lesson_count >= popular_rabbi_min_lessons
 *           → מחיר "רב מבוקש" (price_lesson_popular).
 *   סדרה:  לפי גודל — עד series_mid_threshold שיעורים = בסיס;
 *           מעל = price_series_mid; מעל series_large_threshold = price_series_large.
 * כל הערכים נשלטים מ-dedication_settings (שורה יחידה) וניתנים לכוונון באדמין.
 */
async function computeDedicationPrice(
  supabaseAdmin: ReturnType<typeof createClient>,
  ded: { scope: "lesson" | "series"; lesson_id?: string; series_id?: string }
): Promise<number> {
  let settings: Record<string, any> = {};
  try {
    const { data } = await supabaseAdmin
      .from("dedication_settings")
      .select("*")
      .maybeSingle();
    if (data) settings = data as Record<string, any>;
  } catch (e) {
    console.warn("dedication_settings read failed, using defaults", e);
  }
  const priceLesson = Number(settings.price_lesson ?? 600);
  const priceLessonPopular = Number(settings.price_lesson_popular ?? 900);
  const popularMin = Number(settings.popular_rabbi_min_lessons ?? 100);
  const priceSeries = Number(settings.price_series ?? 1800);
  const priceSeriesMid = Number(settings.price_series_mid ?? 2400);
  const priceSeriesLarge = Number(settings.price_series_large ?? 3200);
  const midThreshold = Number(settings.series_mid_threshold ?? 21);
  const largeThreshold = Number(settings.series_large_threshold ?? 61);

  if (ded.scope === "series" && ded.series_id) {
    try {
      const { data: series } = await supabaseAdmin
        .from("series")
        .select("lesson_count")
        .eq("id", ded.series_id)
        .maybeSingle();
      const count = Number((series as any)?.lesson_count ?? 0);
      if (count >= largeThreshold) return priceSeriesLarge;
      if (count >= midThreshold) return priceSeriesMid;
    } catch (e) {
      console.warn("series lookup failed for dedication pricing", e);
    }
    return priceSeries;
  }

  if (ded.lesson_id) {
    try {
      const { data: lesson } = await supabaseAdmin
        .from("lessons")
        .select("rabbi_id")
        .eq("id", ded.lesson_id)
        .maybeSingle();
      const rabbiId = (lesson as any)?.rabbi_id;
      if (rabbiId) {
        const { data: rabbi } = await supabaseAdmin
          .from("rabbis")
          .select("lesson_count")
          .eq("id", rabbiId)
          .maybeSingle();
        if (Number((rabbi as any)?.lesson_count ?? 0) >= popularMin) {
          return priceLessonPopular;
        }
      }
    } catch (e) {
      console.warn("lesson/rabbi lookup failed for dedication pricing", e);
    }
  }
  return priceLesson;
}
