import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const GROW_API_URL = process.env.GROW_API_URL!;
const GROW_USER_ID = process.env.GROW_USER_ID!;
const GROW_PAGECODE_PRODUCTS = process.env.GROW_PAGECODE_PRODUCTS!;
const GROW_PAGECODE_DONATIONS = process.env.GROW_PAGECODE_DONATIONS!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface CreatePaymentBody {
  sum: number;
  description: string;
  fullName: string;
  phone: string;
  email?: string;
  type: "product" | "donation";
  orderId?: string;
  installments?: number;
  successUrl: string;
  cancelUrl: string;
  // Donation-specific fields (when orderId is missing, we create it here)
  donationMeta?: {
    is_monthly?: boolean;
    dedication_type?: string;
    dedication_name?: string;
    donor_email?: string;
    user_id?: string;
  };
}

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
      donationMeta,
    } = body;
    let { orderId } = body;

    if (!sum || !description || !fullName || !phone || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // For donations without an existing orderId, create the donation record server-side
    // (RLS blocks anonymous client inserts — we use service role here)
    if (type === "donation" && !orderId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: donation, error: donationErr } = await supabase
        .from("donations")
        .insert({
          amount: sum,
          donor_name: fullName,
          donor_email: email || donationMeta?.donor_email || null,
          is_monthly: donationMeta?.is_monthly || false,
          dedication_type: donationMeta?.dedication_type || "regular",
          dedication_name: donationMeta?.dedication_name || null,
          user_id: donationMeta?.user_id || null,
          payment_status: "pending",
        })
        .select("id")
        .single();

      if (donationErr) {
        console.error("Donation insert error:", donationErr);
        return res
          .status(500)
          .json({ error: "Failed to create donation record", details: donationErr.message });
      }
      orderId = donation.id;
    }

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    const pageCode =
      type === "donation" ? GROW_PAGECODE_DONATIONS : GROW_PAGECODE_PRODUCTS;

    // Build multipart/form-data — Grow doesn't accept JSON
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
    if (installments && installments > 1) {
      formData.append("paymentNum", String(installments));
    }

    // Store orderId in custom field so webhook can link back
    formData.append("cField1", orderId);
    // Store type so webhook knows which table to update
    formData.append("cField2", type);

    // Webhook URL for server-to-server notification
    const webhookUrl = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/grow/webhook`;
    formData.append("notifyUrl", webhookUrl);

    const response = await fetch(
      `${GROW_API_URL}/createPaymentProcess`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (data.status !== 1) {
      console.error("Grow createPaymentProcess error:", data);
      return res.status(400).json({
        error: data.err || "Payment creation failed",
        details: data,
      });
    }

    // Wallet (products) returns authCode, redirect (donations) returns url
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
