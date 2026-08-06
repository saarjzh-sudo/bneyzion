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
const MONDAY_API_TOKEN = (process.env.MONDAY_API_TOKEN || "").trim();

// לוח "מנויי הפרק השבועי" — עדכון סטטוס ל"ביטל" אחרי ביטול מוצלח (אידמפוטנטי)
const MONDAY_BOARD_ID = 5094750546;
const MONDAY_COL_EMAIL = "email_mm2f6efy";
const MONDAY_COL_STATUS = "color_mm2fcgcg";

/**
 * עדכון Monday אחרי ביטול הו"ק (הוראת סער 8.7, אידמפוטנטי):
 * מאתר את הפריט לפי המייל; מעדכן סטטוס ל"ביטל" רק אם אינו כבר ביטל/הסתיימה —
 * כך אין עדכון-כפול גם אם הלוח כבר עודכן מדוח Grow. כשל כאן לא מפיל את הביטול.
 */
async function markCancelledInMonday(email: string): Promise<string> {
  if (!MONDAY_API_TOKEN || !email) return "skipped";
  // אודיט M3: המייל שורשר גולמית לתוך מחרוזת ה-GraphQL. מייל שמכיל `"` סוגר
  // את המחרוזת ומאפשר להזריק ארגומנטים/שדות לשאילתה — והמייל מגיע מגוף
  // create-payment, שאינו מאומת. עוברים ל-**משתני GraphQL**: הערך נוסע ב-JSON
  // נפרד ולעולם אינו חלק מטקסט השאילתה, ולכן אין מה לברוח ממנו.
  const gql = async (query: string, variables?: Record<string, unknown>) => {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { Authorization: MONDAY_API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: variables ?? {} }),
    });
    return r.json();
  };
  const find = await gql(
    `query ($boardId: ID!, $emailCol: String!, $email: String!, $statusCol: String!) {
       items_page_by_column_values(
         board_id: $boardId, limit: 5,
         columns: [{ column_id: $emailCol, column_values: [$email] }]
       ) { items { id name column_values(ids: [$statusCol]) { text } } }
     }`,
    {
      boardId: String(MONDAY_BOARD_ID),
      emailCol: MONDAY_COL_EMAIL,
      email: String(email),
      statusCol: MONDAY_COL_STATUS,
    },
  );
  const item = find?.data?.items_page_by_column_values?.items?.[0];
  if (!item) return "not_found_in_monday";
  const current = item.column_values?.[0]?.text || "";
  if (current === "ביטל" || current === "הסתיימה") return "already_cancelled";
  const upd = await gql(
    `mutation ($boardId: ID!, $itemId: ID!, $statusCol: String!, $value: String!) {
       change_simple_column_value(
         board_id: $boardId, item_id: $itemId, column_id: $statusCol, value: $value
       ) { id }
     }`,
    {
      boardId: String(MONDAY_BOARD_ID),
      itemId: String(item.id),
      statusCol: MONDAY_COL_STATUS,
      value: "ביטל",
    },
  );
  return upd?.data?.change_simple_column_value ? "updated" : `failed: ${JSON.stringify(upd).slice(0, 120)}`;
}

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
        // עדכון Monday (אידמפוטנטי) — לא חוסם את הביטול אם נכשל
        let mondayResult = "skipped";
        try {
          mondayResult = await markCancelledInMonday(tagRow.email || "");
        } catch (e) {
          console.warn("[CancelSub] Monday update failed (non-fatal):", e);
          mondayResult = "error";
        }
        await supabase
          .from("user_access_tags")
          .update({
            valid_until: now,
            cancelled_at: now,
            cancel_note: `הו"ק בוטלה ב-Grow ע"י ${userData.user.email} (transactionId=${ids.transactionId}) · Monday: ${mondayResult}`,
          })
          .eq("id", tagId);
        console.log(`[CancelSub] Grow cancel OK for ${who} | Monday: ${mondayResult}`);
        return res.status(200).json({ ok: true, mode: "grow_cancelled", monday: mondayResult });
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
