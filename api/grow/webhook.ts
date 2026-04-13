import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const GROW_API_URL = process.env.GROW_API_URL!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with admin privileges
function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body;
    console.log("Grow webhook received:", JSON.stringify(payload));

    // Grow sends { err, status, data: { ... } }
    if (!payload || payload.status !== "1") {
      console.error("Webhook: invalid or failed transaction", payload);
      return res.status(200).json({ received: true, processed: false });
    }

    const txData = payload.data;
    const orderId = txData.customFields?.cField1;
    const type = txData.customFields?.cField2; // 'product' or 'donation'
    const transactionId = txData.transactionId;
    const statusCode = txData.statusCode; // "2" = paid

    if (!orderId) {
      console.error("Webhook: no orderId in cField1");
      return res.status(200).json({ received: true, processed: false });
    }

    const supabase = getSupabaseAdmin();

    // Update the right table based on type
    if (type === "donation") {
      const { error } = await supabase
        .from("donations")
        .update({
          payment_status: statusCode === "2" ? "completed" : "failed",
        })
        .eq("id", orderId);

      if (error) console.error("Webhook: failed to update donation", error);
    } else {
      // Product order
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: statusCode === "2" ? "completed" : "failed",
          payment_method: txData.cardBrand || "credit",
          payment_id: String(transactionId),
          status: statusCode === "2" ? "confirmed" : "payment_failed",
        })
        .eq("id", orderId);

      if (error) console.error("Webhook: failed to update order", error);
    }

    // Approve the transaction (required by Grow)
    await approveTransaction(txData);

    return res.status(200).json({ received: true, processed: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    // Return 200 to prevent Grow from retrying
    return res.status(200).json({ received: true, error: error.message });
  }
}

async function approveTransaction(txData: any) {
  try {
    const pageCode =
      txData.customFields?.cField2 === "donation"
        ? process.env.GROW_PAGECODE_DONATIONS!
        : process.env.GROW_PAGECODE_PRODUCTS!;

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

    const response = await fetch(
      `${GROW_API_URL}/approveTransaction`,
      { method: "POST", body: formData }
    );

    const result = await response.json();
    console.log("approveTransaction result:", result);
  } catch (error) {
    console.error("approveTransaction error:", error);
    // Non-critical — transaction processes even if approve fails
  }
}
