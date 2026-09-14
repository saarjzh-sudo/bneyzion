/**
 * api/admin/search-console — נתוני Google Search Console לדשבורד האדמין (/admin/analytics).
 *
 * GET → { configured, range, totals, days[], topQueries[], topPages[] } עבור 28 הימים
 * האחרונים (עד אתמול — הנתונים הטריים של גוגל מתייצבים באיחור של יומיים-שלושה).
 *
 * אימות מול גוגל: service account bneyzion-gsc-reader@site-bz.iam.gserviceaccount.com
 * (משתמש "מוגבל" על נכס-הדומיין sc-domain:bneyzion.co.il, נוסף 14.9.2026).
 * המפתח ב-env GSC_SA_KEY_B64 — ה-JSON המלא של מפתח ה-service account, מקודד base64.
 * בלי ספריות: JWT RS256 עם node:crypto וקריאת fetch ישירה.
 *
 * שער: requireAdmin (JWT + role admin) — כמו api/donations/receipt-fixes.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSign } from "node:crypto";
import { requireAdmin } from "../lib/admin-auth.js";

const SITE = "sc-domain:bneyzion.co.il";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const DAY_MS = 24 * 60 * 60 * 1000;

// מטמון פר-אינסטנס של הלמבדה — GSC מעדכן נתונים יומיים, אין טעם להציק לו בכל טעינת דשבורד.
const CACHE_MS = 30 * 60 * 1000;
let cache: { at: number; payload: Record<string, unknown> } | null = null;

interface GscRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function googleAccessToken(): Promise<string> {
  const raw = (process.env.GSC_SA_KEY_B64 || "").trim();
  if (!raw) throw new Error("GSC_SA_KEY_B64 not configured");
  const sa = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as {
    client_email: string;
    private_key: string;
  };
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`google token: ${data.error || res.status} ${data.error_description || ""}`);
  }
  return data.access_token;
}

async function queryGsc(token: string, body: Record<string, unknown>): Promise<{ rows?: GscRow[] }> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gsc query ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { rows?: GscRow[] };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (!(process.env.GSC_SA_KEY_B64 || "").trim()) {
    // המפתח עוד לא הוגדר ב-Vercel — הדשבורד מציג הודעת "ממתין להגדרה" במקום להישבר.
    return res.status(200).json({ configured: false });
  }
  if (cache && Date.now() - cache.at < CACHE_MS) return res.status(200).json(cache.payload);

  try {
    const token = await googleAccessToken();
    const end = new Date(Date.now() - DAY_MS); // עד אתמול
    const start = new Date(end.getTime() - 27 * DAY_MS); // 28 ימים כולל
    const range = { startDate: iso(start), endDate: iso(end) };
    const [byDate, byQuery, byPage, summary] = await Promise.all([
      queryGsc(token, { ...range, dimensions: ["date"], rowLimit: 40 }),
      queryGsc(token, { ...range, dimensions: ["query"], rowLimit: 10 }),
      queryGsc(token, { ...range, dimensions: ["page"], rowLimit: 10 }),
      queryGsc(token, range), // בלי dimensions — סיכום משוקלל (CTR ומיקום ממוצע נכונים)
    ]);
    const days = (byDate.rows ?? []).map((r) => ({
      date: r.keys?.[0] ?? "",
      clicks: r.clicks,
      impressions: r.impressions,
    }));
    const s = summary.rows?.[0];
    const totals = {
      clicks: s?.clicks ?? days.reduce((sum, d) => sum + d.clicks, 0),
      impressions: s?.impressions ?? days.reduce((sum, d) => sum + d.impressions, 0),
      ctr: s?.ctr ?? 0,
      position: s?.position ?? null,
    };
    const payload = {
      configured: true,
      site: SITE,
      range,
      totals,
      days,
      topQueries: (byQuery.rows ?? []).map((r) => ({
        query: r.keys?.[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        position: r.position,
      })),
      topPages: (byPage.rows ?? []).map((r) => {
        const path = (r.keys?.[0] ?? "").replace(/^https?:\/\/(www\.)?bneyzion\.co\.il/, "") || "/";
        // GSC מחזיר נתיבים מקודדי-URL; נתיב עברי מוצג אחרת כ-%D7%… במקום טקסט קריא.
        let readable = path;
        try { readable = decodeURIComponent(path); } catch { /* נתיב פגום — משאירים כמות שהוא */ }
        return { page: readable, clicks: r.clicks, impressions: r.impressions };
      }),
    };
    cache = { at: Date.now(), payload };
    return res.status(200).json(payload);
  } catch (e) {
    console.error("[admin/search-console]", e);
    return res.status(502).json({ error: "search console fetch failed" });
  }
}
