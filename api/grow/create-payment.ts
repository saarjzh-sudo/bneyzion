import type { VercelRequest, VercelResponse } from "@vercel/node";

const GROW_API_URL = process.env.GROW_API_URL!;
const GROW_USER_ID = process.env.GROW_USER_ID!;
const GROW_PAGECODE_PRODUCTS = process.env.GROW_PAGECODE_PRODUCTS!;
const GROW_PAGECODE_DONATIONS = process.env.GROW_PAGECODE_DONATIONS!;

interface CreatePaymentBody {
  sum: number;
  description: string;
  fullName: string;
  phone: string;
  email?: string;
  type: "product" | "donation";
  orderId: string;
  installments?: number;
  successUrl: string;
  cancelUrl: string;
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
      orderId,
      installments,
      successUrl,
      cancelUrl,
    } = body;

    if (!sum || !description || !fullName || !phone || !type || !orderId) {
      return res.status(400).json({ error: "Missing required fields" });
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
    });
  } catch (error: any) {
    console.error("create-payment error:", error);
    return res.status(500).json({ error: error.message });
  }
}
