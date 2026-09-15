/**
 * creator-publications-digest — דוח יומי לאביה על מה שיוצרי תוכן העלו לאתר.
 *
 * רקע (15.9.2026): הרב יואב בחר באפשרות א' — יוצרי תוכן (role=creator) מפרסמים
 * ישירות, בלי אישור מראש (RLS: creator_insert_own / creator_update_own). התנאי
 * שלו היה שאביה יקבל כל יום רשימה של מה שעלה ויוכל להוריד מהר. זה הדוח.
 *
 * רץ ב-cron של Vercel (vercel.json). שותק כשאין העלאות — לא שולח מייל ריק.
 * אבטחה: נכשל סגור בלי CRON_SECRET, כמו sync-monday-subscribers.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { sendSingleEmail } from "../lib/digital-delivery.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const CRON_SECRET = (process.env.CRON_SECRET || "").trim();

const AVIA_EMAIL = "tchvesua41@gmail.com";
const SITE = "https://bneyzion.co.il";

const STATUS_LABEL: Record<string, string> = {
  published: "פורסם באתר",
  active: "פורסם באתר",
  pending_review: "ממתין לאישור",
  draft: "טיוטה",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!CRON_SECRET) {
    console.error("creator-publications-digest: CRON_SECRET is not configured — refusing the request.");
    return res.status(500).json({ error: "server not configured" });
  }
  const authHeader = req.headers["authorization"] || "";
  const querySecret = (req.query?.secret as string) || "";
  if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: roles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "creator");
  if (rolesErr) return res.status(500).json({ error: rolesErr.message });
  const creatorIds = (roles ?? []).map((r: any) => String(r.user_id));
  if (!creatorIds.length) return res.status(200).json({ sent: false, reason: "no creators" });

  const [{ data: lessons }, { data: series }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, status, submitted_by, created_at, series:series_id (title)")
      .in("submitted_by", creatorIds)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("series")
      .select("id, title, status, submitted_by, created_at")
      .in("submitted_by", creatorIds)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  const lessonRows = (lessons ?? []) as any[];
  const seriesRows = (series ?? []) as any[];
  if (!lessonRows.length && !seriesRows.length) {
    return res.status(200).json({ sent: false, reason: "nothing uploaded in 24h" });
  }

  // שמות המעלים — מ-auth (service role בלבד)
  const names: Record<string, string> = {};
  for (const id of new Set([...lessonRows, ...seriesRows].map((r) => String(r.submitted_by)))) {
    try {
      const { data } = await supabase.auth.admin.getUserById(id);
      const u = data?.user;
      names[id] = (u?.user_metadata as any)?.full_name || u?.email || id;
    } catch {
      names[id] = id;
    }
  }

  const lessonsHtml = lessonRows
    .map(
      (l) => `<li style="margin-bottom:8px"><b>${esc(l.title)}</b>${l.series?.title ? ` · ${esc(l.series.title)}` : ""}<br/>
        <span style="font-size:13px;color:#6B5C4A">${esc(names[String(l.submitted_by)])} · ${esc(STATUS_LABEL[l.status] || l.status)} ·
        <a href="${SITE}/lessons/${l.id}">צפייה בשיעור</a></span></li>`,
    )
    .join("");
  const seriesHtml = seriesRows
    .map(
      (s) => `<li style="margin-bottom:6px"><b>${esc(s.title)}</b> <span style="font-size:13px;color:#6B5C4A">· ${esc(names[String(s.submitted_by)])} · ${esc(STATUS_LABEL[s.status] || s.status)}</span></li>`,
    )
    .join("");

  const html = `<div dir="rtl" style="font-family:Arial;font-size:15px;line-height:1.7">
    <p>שלום אביה,</p>
    <p>זה מה שיוצרי התוכן העלו לאתר ב-24 השעות האחרונות:</p>
    ${lessonRows.length ? `<p><b>שיעורים (${lessonRows.length}):</b></p><ul>${lessonsHtml}</ul>` : ""}
    ${seriesRows.length ? `<p><b>סדרות חדשות (${seriesRows.length}):</b></p><ul>${seriesHtml}</ul>` : ""}
    <p style="font-size:14px">משהו לא תקין? אפשר להוריד אותו לטיוטה ברשימת השיעורים באדמין:
      <a href="${SITE}/admin/lessons">לרשימת השיעורים</a></p>
  </div>`;

  const ok = await sendSingleEmail(
    AVIA_EMAIL,
    "אביה",
    `מה עלה לאתר היום: ${lessonRows.length} שיעורים${seriesRows.length ? `, ${seriesRows.length} סדרות` : ""}`,
    html,
  );
  return res.status(200).json({ sent: ok, lessons: lessonRows.length, series: seriesRows.length });
}
