/**
 * api/store/order-download.ts — קישורי הורדה טריים לרוכש (דף התודה) — רמה 17.
 *
 * POST { orderIds: string[] } → { items: [{ title, url }], pending: boolean }
 *
 * אבטחה: ה-orderId הוא UUID בלתי-ניתן-לניחוש שמוחזר רק לרוכש בזמן התשלום
 * (המודל המקובל בדפי-תודה). הקישורים חתומים לשעה בלבד; הקבצים עצמם יושבים
 * ב-bucket פרטי בלי שום גישת-קליינט. מוחזרים קבצים רק להזמנות ששולמו.
 * pending=true כשה-webhook של Grow עדיין לא אישר — הדף מציג "בדרך אליך במייל".
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { loadDigitalItems, signItems } from "../lib/digital-delivery.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const LINK_EXPIRY_SEC = 3600;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "server misconfigured" });
  }

  const orderIds: string[] = Array.isArray(req.body?.orderIds)
    ? req.body.orderIds.filter((x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x as string)).slice(0, 10)
    : [];
  if (!orderIds.length) return res.status(400).json({ error: "orderIds required" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const items: Array<{ title: string; url: string }> = [];
  // יואב 22.7 (06:55): רוכש קורס מקבל בדף התודה כפתור כניסה ישיר לקורס
  const courses: Array<{ id: string; title: string }> = [];
  let pending = false;

  for (const orderId of orderIds) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) continue;

    // החזר/ביטול (אודיט M11): ממשק-האדמין כותב `status` בלבד ולא נוגע ב-
    // `payment_status`, ולכן הזמנה שהוחזרה נשארה completed והמשיכה להנפיק
    // signed URLs לנצח — ה-UUID נוסע ב-URL של דף-התודה (היסטוריית-דפדפן,
    // Referer), אז "רק הרוכש מכיר אותו" מפסיק להחזיק אחרי ההחזר.
    const fulfilmentStatus = String((order as any).status || "").toLowerCase();
    if (["cancelled", "canceled", "refunded", "payment_failed"].includes(fulfilmentStatus)) {
      console.warn("order-download: refusing download for cancelled/refunded order", {
        orderId, status: fulfilmentStatus,
      });
      continue;
    }
    if (String((order as any).payment_status || "").toLowerCase() === "refunded") continue;
    const digital = await loadDigitalItems(supabase as any, orderId);

    // קורסים שההזמנה פותחת — דרך order_items → products.slug → community_courses
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("products:product_id (slug)")
      .eq("order_id", orderId);
    const slugs = (orderItems ?? [])
      .map((r: any) => r.products?.slug)
      .filter((s: unknown): s is string => typeof s === "string" && !!s);
    let orderCourses: Array<{ id: string; title: string }> = [];
    if (slugs.length) {
      const { data: linked } = await supabase
        .from("community_courses")
        .select("id, title, store_product_slug")
        .in("store_product_slug", slugs);
      orderCourses = (linked ?? []).map((c: any) => ({ id: String(c.id), title: String(c.title) }));
    }

    if (!digital.length && !orderCourses.length) continue;
    if ((order as any).payment_status !== "completed") {
      pending = true;
      continue;
    }
    items.push(...(await signItems(supabase as any, digital, LINK_EXPIRY_SEC)));
    courses.push(...orderCourses);
  }

  return res.status(200).json({ items, courses, pending });
}
