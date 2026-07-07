/**
 * cancel-subscription — ביטול אמיתי של הוראת-קבע ב-Grow (רמה 11).
 *
 * עד עכשיו "סיים מנוי" באדמין רק קטע את הגישה באתר (valid_until=now) —
 * ההו"ק המשיכה לחייב, והחיוב החודשי הבא החזיר את המנוי לחיים דרך ה-webhook.
 *
 * הזרימה כאן:
 *   1. אימות אדמין (JWT של המשתמש → user_roles.role='admin').
 *   2. איתור מזהי העסקה המקורית (transactionId + transactionToken + asmachta)
 *      מ-grow_orders / orders — נשמרו ע"י ה-webhook בחיוב הראשון.
 *   3. POST {GROW_API_URL}/updateDirectDebit עם changeStatus=2 (=ביטול).
 *   4. סימון השורה ב-user_access_tags: cancelled_at + valid_until=now.
 *
 * אם אין מזהי Grow (מנוי שיובא מ-Monday/Smoove בלי עסקה מקושרת) — מסומן
 * cancelled_at עם הערת "נדרש ביטול ידני בדשבורד Grow" ומוחזר mode=manual_needed,
 * כדי שהאדמין יציג את זה ביושר ולא יעמיד פני ביטול.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const GROW_API_URL = (process.env.GROW_API_URL || "").trim();
const GROW_USER_ID = (process.env.GROW_USER_ID || "").trim();
const GROW_USER_ID_SUBSCRIPTION = (process.env.GROW_USER_ID_SUBSCRIPTION || "").trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

interface GrowIdentifiers {
  transactionId: string;
  transactionToken: string;
  asmachta: string;
  merchantUserId: string;
  foundIn: string;
}

/** חילוץ מזהי העסקה מכל מקום שה-webhook שמר אותם בו */
async function findGrowIdentifiers(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tagRow: { grow_order_id: string | null; email: string | null },
): Promise<GrowIdentifiers | null> {
  const candidates: Array<Record<string, any>> = [];

  // 1. grow_orders דרך grow_order_id (הקישור הישיר שה-webhook שמר)
  if (tagRow.grow_order_id) {
    const { data } = await supabase
      .from("grow_orders")
      .select("grow_transaction_id, process_token, asmachta, merchant_user_id, raw_payload")
      .eq("id", tagRow.grow_order_id)
      .maybeSingle();
    if (data) candidates.push({ ...data, _src: "grow_orders" });
  }

  // 2. orders לפי אימייל — עסקת המנוי האחרונה שהושלמה
  if (tagRow.email) {
    const { data } = await supabase
      .from("orders")
      .select("payment_id, asmachta, raw_payload, customer_email, created_at")
      .ilike("customer_email", tagRow.email)
      .eq("payment_status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);
    for (const row of data ?? []) candidates.push({ ...row, _src: "orders" });
  }

  for (const c of candidates) {
    const wh = c.raw_payload?.webhook?.data ?? c.raw_payload?.data ?? {};
    const transactionId = String(c.grow_transaction_id ?? c.payment_id ?? wh.transactionId ?? "");
    const transactionToken = String(c.process_token ?? wh.transactionToken ?? "");
    const asmachta = String(c.asmachta ?? wh.asmachta ?? "");
    const merchantUserId = String(
      c.merchant_user_id ?? GROW_USER_ID_SUBSCRIPTION ?? GROW_USER_ID ?? "",
    );
    if (transactionId && transactionToken && asmachta && merchantUserId) {
      return { transactionId, transactionToken, asmachta, merchantUserId, foundIn: c._src };
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAdmin();

    // ── אימות אדמין ──────────────────────────────────────────────────
    const authHeader = String(req.headers.authorization || "");
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) return res.status(401).json({ error: "Missing auth token" });

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid auth token" });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (roleRow?.role !== "admin") {
      return res.status(403).json({ error: "Admin role required" });
    }

    // ── טעינת שורת המנוי ─────────────────────────────────────────────
    const { tagId } = (req.body ?? {}) as { tagId?: string };
    if (!tagId) return res.status(400).json({ error: "Missing tagId" });

    const { data: tagRow, error: tagErr } = await supabase
      .from("user_access_tags")
      .select("id, email, display_name, tag, grow_order_id, notes, cancelled_at")
      .eq("id", tagId)
      .maybeSingle();
    if (tagErr || !tagRow) return res.status(404).json({ error: "Subscription not found" });

    const now = new Date().toISOString();
    const who = tagRow.email || tagRow.display_name || tagId;

    // ── ניסיון ביטול אמיתי ב-Grow ────────────────────────────────────
    const ids = await findGrowIdentifiers(supabase, tagRow);

    if (ids && GROW_API_URL) {
      const formData = new FormData();
      formData.append("userId", ids.merchantUserId);
      formData.append("transactionId", ids.transactionId);
      formData.append("transactionToken", ids.transactionToken);
      formData.append("asmachta", ids.asmachta);
      formData.append("changeStatus", "2"); // 2 = ביטול ההו"ק

      console.log(`[CancelSub] updateDirectDebit for ${who} (ids from ${ids.foundIn})`);
      const growRes = await fetch(`${GROW_API_URL}/updateDirectDebit`, {
        method: "POST",
        body: formData,
      });
      const growData = await growRes.json().catch(() => ({}));
      const growOk = String(growData?.status) === "1";

      if (growOk) {
        await supabase
          .from("user_access_tags")
          .update({
            valid_until: now,
            cancelled_at: now,
            cancel_note: `הו"ק בוטלה ב-Grow ע"י ${userData.user.email} (transactionId=${ids.transactionId})`,
          })
          .eq("id", tagId);
        console.log(`[CancelSub] Grow cancel OK for ${who}`);
        return res.status(200).json({ ok: true, mode: "grow_cancelled" });
      }

      // Grow דחה — לא מעמידים פנים שבוטל
      console.error("[CancelSub] Grow updateDirectDebit failed:", JSON.stringify(growData));
      await supabase
        .from("user_access_tags")
        .update({
          valid_until: now,
          cancelled_at: now,
          cancel_note: `⚠️ Grow דחה את הביטול (${growData?.err?.message || "unknown"}) — נדרש ביטול ידני בדשבורד Grow`,
        })
        .eq("id", tagId);
      return res.status(200).json({
        ok: true,
        mode: "manual_needed",
        reason: growData?.err?.message || "Grow rejected the cancellation",
      });
    }

    // ── אין מזהי Grow — סימון + הפניה לביטול ידני ────────────────────
    await supabase
      .from("user_access_tags")
      .update({
        valid_until: now,
        cancelled_at: now,
        cancel_note: "לא נמצאה עסקת Grow מקושרת — נדרש ביטול ידני בדשבורד Grow (מנוי שמקורו ב-Monday/Smoove)",
      })
      .eq("id", tagId);
    console.log(`[CancelSub] No Grow identifiers for ${who} — flagged for manual cancel`);
    return res.status(200).json({ ok: true, mode: "manual_needed", reason: "no_grow_identifiers" });
  } catch (error: any) {
    console.error("[CancelSub] error:", error);
    return res.status(500).json({ error: error.message });
  }
}
