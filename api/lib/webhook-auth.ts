/**
 * api/lib/webhook-auth — authenticity for the Grow payment callback.
 *
 * WHY THIS EXISTS (audit H1, 2.8.2026):
 *   Grow's createPaymentProcess has no HMAC signature and no shared-secret
 *   header on its server-to-server callback. Before this module the webhook
 *   trusted the request body outright: the only checks were `payload.status`
 *   and `txData.statusCode`, both attacker-controlled. Anyone could POST
 *   `status=1&data[statusCode]=2&data[customFields][cField1]=<orderId>` and
 *   flip an order to `completed` — which mails signed download URLs, grants
 *   course access tags, and (with cField3) opens a recurring subscription.
 *
 * THE MECHANISM:
 *   We control `notifyUrl` — create-payment builds it and hands it to Grow,
 *   and Grow calls back that exact URL. So we mint a per-order token there and
 *   require it on the way back. The token is an HMAC over the order id, so it
 *   is neither guessable nor transferable to a different order.
 *
 *   This is not a substitute for Grow signing its callbacks; it is the
 *   strongest control available on our side of the integration. It is layered
 *   with two independent checks in the webhook: the charged sum must match the
 *   stored row total, and a row already marked `completed` is never
 *   re-processed (see the idempotency guard there).
 *
 * OPERATIONAL REQUIREMENT:
 *   GROW_WEBHOOK_SECRET must be set in the Vercel environment BEFORE deploying
 *   this change. It fails closed — an unset secret rejects every callback
 *   rather than falling back to the old trust-the-body behaviour. Generate one
 *   with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Query-string parameter carrying the token on the callback URL. */
export const WEBHOOK_TOKEN_PARAM = "wt";

function secret(): string {
  return (process.env.GROW_WEBHOOK_SECRET || "").trim();
}

export function isWebhookSecretConfigured(): boolean {
  return secret().length >= 16;
}

/**
 * Per-order callback token. Truncated to 32 hex chars — 128 bits, far beyond
 * guessing, and short enough to keep the notifyUrl comfortably within the
 * length Grow accepts.
 */
export function signOrderCallback(orderId: string): string {
  return createHmac("sha256", secret()).update(String(orderId)).digest("hex").slice(0, 32);
}

/**
 * Constant-time verification. Returns false for an unset secret, a missing
 * token, or any mismatch — never throws, so the caller decides the response.
 */
export function verifyOrderCallback(orderId: string, token: unknown): boolean {
  if (!isWebhookSecretConfigured()) return false;
  if (!orderId || typeof token !== "string" || !token) return false;

  const expected = Buffer.from(signOrderCallback(orderId), "utf8");
  const actual = Buffer.from(token, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
