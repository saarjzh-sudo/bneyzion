/**
 * api/sync-monday-subscribers.ts — Monday = מקור האמת לגישת מנויים (8.7.2026, הוראת סער).
 *
 * Vercel Cron (יומי). מראה מלאה של לוח "מנויי הפרק השבועי" (5094750546):
 *   • סטטוס הו"ק "פעילה" + מייל  → גישה (tag program:weekly-chapter, ללא תפוגה)
 *   • "ביטל" / "הסתיימה" / לא-בלוח → הגישה נקטעת (valid_until=now)
 *   • פעילים בלי מייל → שורת display_name (ממתינה להשלמת מייל ב-Monday)
 *
 * הגנות:
 *   • שורות שנוצרו ב-7 הימים האחרונים לא נקטעות — נרשם חדש דרך האתר מקבל
 *     גישה מה-webhook לפני שיואב הספיק להוסיף אותו ללוח.
 *   • שורות program:eicha-monday לא מנוהלות כאן דרך Monday — הקוהורט מנוהל
 *     בנפרד (למטה) ומתמזג לרגילים אחרי ט' באב.
 *
 * קוהורט איכה (עד המיזוג): מוסיף tag program:eicha-monday לפי
 *   (א) רשימת Smoove "מנויי איכה" (1148311) (ב) משלמי עמוד "לחיות תנ״ך" ב-orders.
 *   מוסיף בלבד — הסרה רק בפעולת המיזוג.
 *
 * ⚠️ הסנכרון הזה החליף את הוספות-Smoove האוטומטיות (cron הוסר מ-vercel.json) —
 *   שני מקורות שמוסיפים במקביל = הסטייה שיצרה את פער ה-300/276.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const MONDAY_API_TOKEN = (process.env.MONDAY_API_TOKEN || "").trim();
const SMOOVE_API_KEY = (process.env.SMOOVE_API_KEY || "").trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const CRON_SECRET = (process.env.CRON_SECRET || "").trim();

const BOARD_ID = 5094750546;
const COL_EMAIL = "email_mm2f6efy";
const COL_PHONE = "phone_mm2f7xzf";
const COL_STATUS = "color_mm2fcgcg"; // סטטוס הו"ק: פעילה / ביטל / הסתיימה / נדרש טיפול
const WEEKLY_TAG = "program:weekly-chapter";
const EICHA_TAG = "program:eicha-monday";
const EICHA_SMOOVE_LIST = 1148311; // "מנויי איכה"
const NEW_ROW_GRACE_DAYS = 7;

interface MondayItem { id: string; name: string; email: string; phone: string; status: string }

async function fetchMondayItems(): Promise<MondayItem[]> {
  const items: MondayItem[] = [];
  let cursor: string | null = null;
  do {
    const cur = cursor ? `, cursor: "${cursor}"` : "";
    const query = `query { boards(ids: [${BOARD_ID}]) { items_page(limit: 500${cur}) { cursor items { id name column_values(ids: ["${COL_EMAIL}","${COL_PHONE}","${COL_STATUS}"]) { id text } } } } }`;
    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { Authorization: MONDAY_API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    const page = data?.data?.boards?.[0]?.items_page;
    if (!page) throw new Error(`Monday API error: ${JSON.stringify(data).slice(0, 200)}`);
    for (const it of page.items) {
      const col = (id: string) =>
        (it.column_values.find((c: any) => c.id === id)?.text as string) || "";
      items.push({
        id: it.id,
        name: it.name,
        email: col(COL_EMAIL).trim().toLowerCase(),
        phone: col(COL_PHONE).trim(),
        status: col(COL_STATUS).trim(),
      });
    }
    cursor = page.cursor;
  } while (cursor);
  return items;
}

async function fetchEichaSmooveEmails(): Promise<string[]> {
  const emails: string[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://rest.smoove.io/v1/Lists/${EICHA_SMOOVE_LIST}/Contacts?page=${page}&itemsPerPage=100&fields=email`,
      { headers: { Authorization: `Bearer ${SMOOVE_API_KEY}`, Accept: "application/json" } },
    );
    if (!res.ok) break;
    const rows = await res.json();
    for (const c of rows) {
      const e = String(c.email || "").trim().toLowerCase();
      if (e.includes("@")) emails.push(e);
    }
    if (rows.length < 100) break;
    page++;
  }
  return emails;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers["authorization"] || "";
  const querySecret = (req.query?.secret as string) || "";
  const isCronCall = authHeader === `Bearer ${CRON_SECRET}`;
  const isManualTest = CRON_SECRET && querySecret === CRON_SECRET;
  if (!isCronCall && !isManualTest) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const dryRun = String(req.query?.dryrun || "") === "1";

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();
    const graceCutoff = new Date(Date.now() - NEW_ROW_GRACE_DAYS * 86400000).toISOString();

    // ── 1. Monday ────────────────────────────────────────────────────────
    const monday = await fetchMondayItems();
    const actives = monday.filter((m) => m.status === "פעילה");
    const activeEmails = new Set(actives.filter((m) => m.email).map((m) => m.email));
    const activeNames = new Set(actives.map((m) => m.name.trim()));
    const noEmailActives = actives.filter((m) => !m.email);

    // ── 2. DB rows for the weekly tag ────────────────────────────────────
    const { data: dbRows, error: dbErr } = await supabase
      .from("user_access_tags")
      .select("id, email, display_name, valid_until, source, created_at, cancelled_at")
      .eq("tag", WEEKLY_TAG);
    if (dbErr) throw dbErr;
    const byEmail = new Map<string, any>();
    for (const r of dbRows ?? []) if (r.email) byEmail.set(String(r.email).toLowerCase(), r);

    const report = { granted: 0, extended: 0, ended: 0, no_email_actives: noEmailActives.length, grace_skipped: 0, monday_active: actives.length, db_rows: dbRows?.length ?? 0, eicha_granted: 0 };

    // ── 3. פעילים עם מייל → גישה ─────────────────────────────────────────
    for (const m of actives) {
      if (!m.email) continue;
      const existing = byEmail.get(m.email);
      if (existing) {
        const needsUpdate = existing.valid_until !== null || existing.cancelled_at;
        if (needsUpdate && !dryRun) {
          await supabase.from("user_access_tags").update({
            valid_until: null, cancelled_at: null, cancel_note: null,
            source: "monday_sync",
            notes: `Monday item ${m.id} (${m.name}) — active`,
          }).eq("id", existing.id);
        }
        if (needsUpdate) report.extended++;
      } else {
        if (!dryRun) {
          await supabase.from("user_access_tags").insert({
            email: m.email, tag: WEEKLY_TAG, valid_until: null,
            source: "monday_sync", pending_user_link: true,
            notes: `Monday item ${m.id} (${m.name})`,
          });
        }
        report.granted++;
      }
    }

    // ── 4. מי שלא פעיל ב-Monday → קטיעה (עם חלון-חסד לנרשמים טריים) ─────
    for (const r of dbRows ?? []) {
      const email = String(r.email || "").toLowerCase();
      const isActiveInMonday =
        (email && activeEmails.has(email)) ||
        (!email && r.display_name && activeNames.has(String(r.display_name).trim()));
      const stillValid = !r.valid_until || new Date(r.valid_until) > new Date();
      if (isActiveInMonday || !stillValid) continue;
      if (r.created_at > graceCutoff) { report.grace_skipped++; continue; }
      if (!dryRun) {
        await supabase.from("user_access_tags").update({
          valid_until: now,
          cancel_note: "לא פעיל בלוח Monday (סנכרון אוטומטי)",
        }).eq("id", r.id);
      }
      report.ended++;
    }

    // ── 5. קוהורט איכה — הוספה בלבד ──────────────────────────────────────
    // ⚠️ 8.7 (תיקון): רק חיובי עמוד "לחיות תנ״ך" מאז השקת מבצע איכה (15.6) —
    // משלמי אפריל-מאי מאותו עמוד הם מנויים רגילים (הראשון תייג 109 במקום ~47).
    const EICHA_CAMPAIGN_START = "2026-06-15T00:00:00Z";
    try {
      const eichaEmails = new Set(await fetchEichaSmooveEmails());
      const { data: eichaOrders } = await supabase
        .from("orders")
        .select("customer_email")
        .ilike("page_name", "%לחיות%")
        .eq("payment_status", "completed")
        .gte("charge_date", EICHA_CAMPAIGN_START)
        .limit(2000);
      for (const o of eichaOrders ?? []) {
        const e = String(o.customer_email || "").trim().toLowerCase();
        if (e.includes("@")) eichaEmails.add(e);
      }
      const { data: eichaRows } = await supabase
        .from("user_access_tags").select("id, email, valid_until").eq("tag", EICHA_TAG);
      const eichaByEmail = new Map((eichaRows ?? []).map((r: any) => [String(r.email || "").toLowerCase(), r]));
      for (const e of eichaEmails) {
        const existing = eichaByEmail.get(e);
        if (existing) {
          // שוחזר אם נקטע בטעות (בעל-זכאות תמיד פעיל עד המיזוג)
          const expired = existing.valid_until && new Date(existing.valid_until) <= new Date();
          if (expired && !dryRun) {
            await supabase.from("user_access_tags")
              .update({ valid_until: null, cancel_note: null }).eq("id", existing.id);
          }
          if (expired) report.eicha_granted++;
          continue;
        }
        if (!dryRun) {
          await supabase.from("user_access_tags").insert({
            email: e, tag: EICHA_TAG, valid_until: null,
            source: "eicha_cohort_sync", pending_user_link: true,
            notes: "קוהורט איכה (Smoove מנויי-איכה / עמוד לחיות תנ״ך מאז 15.6)",
          });
        }
        report.eicha_granted++;
      }
    } catch (e) {
      console.warn("[MondaySync] eicha cohort step failed (non-fatal):", e);
    }

    console.log("[MondaySync]", dryRun ? "DRY-RUN" : "APPLIED", JSON.stringify(report));
    return res.status(200).json({ ok: true, dryRun, ...report });
  } catch (error: any) {
    console.error("[MondaySync] error:", error);
    return res.status(500).json({ error: error.message });
  }
}
