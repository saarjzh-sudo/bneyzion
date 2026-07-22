/**
 * digital-delivery.ts — מסירת ספרים דיגיטליים + התראת רכישה למשרד (רמה 17, 14.7.2026).
 *
 * הקבצים יושבים ב-bucket **פרטי** `digital-products` (אפס policies — רק service_role).
 * `products.digital_file_url` נושא נתיב storage בפורמט `storage:digital-products/wc-403.pdf`
 * (קישורי http ישנים/ידניים נתמכים כ-fallback ונשלחים כמו-שהם).
 *
 * שני ערוצי מסירה:
 *   1. מייל לרוכש עם קישורים חתומים (30 יום) — נשלח מה-webhook אחרי אישור תשלום.
 *   2. דף התודה מושך קישורים טריים דרך api/store/order-download (שעה אחת).
 *
 * מייל דרך Smoove בדפוס נמען-בודד המאומת (notify-question-answered):
 * ⚠️ fromEmail חובה — קמפיין בלי שולח מפורש מקבל "Successful" אבל לא נמסר.
 * ⚠️ לעולם לא toListsById — זה משגר לרשימה שלמה.
 */
// הקליינט מגיע מהקורא (service_role). טיפוס רופף בכוונה — supabase-js עם
// גנריקים לא-ידועים מקשיח insert/update ל-never (זה מה ששבר את בילד-הפונקציות).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = any;

const SMOOVE_BASE = "https://rest.smoove.io/v1";
const FROM_NAME = "בני ציון";
const FROM_EMAIL = "office@bneyzion.co.il";
const OFFICE_EMAIL = "office@bneyzion.co.il";
const BUYER_LINK_EXPIRY_SEC = 30 * 24 * 3600; // חודש — ואפשר תמיד למשוך שוב מדף התודה

export interface DigitalItem {
  title: string;
  /** storage:<bucket>/<path> או URL מלא (fallback ישן) */
  fileRef: string;
}

export interface SignedItem {
  title: string;
  url: string;
}

/** מוצרים דיגיטליים עם קובץ עבור הזמנה — דרך order_items → products. */
export async function loadDigitalItems(
  supabase: SupabaseAdmin,
  orderId: string,
): Promise<DigitalItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("title, products:product_id (title, is_digital, digital_file_url)")
    .eq("order_id", orderId);
  if (error || !data) return [];
  const items: DigitalItem[] = [];
  for (const row of data as any[]) {
    const p = row.products;
    if (p?.is_digital && p?.digital_file_url) {
      items.push({ title: p.title || row.title, fileRef: String(p.digital_file_url) });
    }
  }
  return items;
}

/** קישור חתום לכל פריט. שם-הקובץ שהרוכש מוריד = שם הספר. */
export async function signItems(
  supabase: SupabaseAdmin,
  items: DigitalItem[],
  expiresInSec: number,
): Promise<SignedItem[]> {
  const out: SignedItem[] = [];
  for (const item of items) {
    const m = item.fileRef.match(/^storage:([^/]+)\/(.+)$/);
    if (!m) {
      // fallback — קישור חיצוני ישן (Drive וכד'): נשלח כמו-שהוא
      if (/^https?:\/\//.test(item.fileRef)) out.push({ title: item.title, url: item.fileRef });
      continue;
    }
    const [, bucket, path] = m;
    const downloadName = `${item.title.replace(/[|/\\]/g, "-").trim()}.pdf`;
    const { data, error } = await (supabase.storage as any)
      .from(bucket)
      .createSignedUrl(path, expiresInSec, { download: downloadName });
    if (!error && data?.signedUrl) out.push({ title: item.title, url: data.signedUrl });
    else console.error(`[DigitalDelivery] sign failed for ${item.fileRef}:`, error?.message);
  }
  return out;
}

/** שליחת מייל טרנזקציוני לנמען יחיד דרך Smoove (הדפוס המאומת). */
export async function sendSingleEmail(
  toEmail: string,
  toName: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const apiKey = (process.env.SMOOVE_API_KEY || "").trim();
  if (!apiKey) {
    console.error("[DigitalDelivery] SMOOVE_API_KEY missing — email not sent");
    return false;
  }
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const contactRes = await fetch(
    `${SMOOVE_BASE}/Contacts?updateIfExists=true&restoreIfDeleted=true`,
    { method: "POST", headers, body: JSON.stringify({ email: toEmail, firstName: toName }) },
  );
  if (!contactRes.ok) {
    console.error("[DigitalDelivery] smoove contact upsert failed:", contactRes.status);
    return false;
  }
  const campaignRes = await fetch(`${SMOOVE_BASE}/Campaigns?sendnow=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      subject,
      fromName: FROM_NAME,
      fromEmail: FROM_EMAIL,
      body: html,
      toMembersByEmail: [toEmail],
      customUnsubscribeMode: "None",
    }),
  });
  const bodyText = await campaignRes.text();
  let campaignId: number | undefined;
  try { campaignId = JSON.parse(bodyText || "{}")?.id; } catch { /* not json */ }
  if (!campaignRes.ok || !campaignId) {
    console.error("[DigitalDelivery] smoove campaign failed:", campaignRes.status, bodyText.slice(0, 200));
    return false;
  }
  return true;
}

const emailShell = (inner: string) => `
<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#F4EFE6;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5dcc9">
    <div style="background:#1A2744;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold">בני ציון — אתר התנ"ך של ישראל</div>
    <div style="padding:24px;color:#241a0c;font-size:15px;line-height:1.7">${inner}</div>
    <div style="background:#FAF6F0;padding:14px 24px;font-size:12px;color:#6B5C4A">בכל שאלה אפשר להשיב למייל הזה — office@bneyzion.co.il</div>
  </div>
</div>`;

/** מייל הספרים לרוכש. מחזיר true אם נשלח. */
export async function sendBuyerDeliveryEmail(params: {
  email: string;
  name: string;
  items: SignedItem[];
  orderNumber?: string | null;
}): Promise<boolean> {
  const { email, name, items, orderNumber } = params;
  if (!items.length) return false;
  const firstName = (name || "").trim().split(/\s+/)[0] || "";
  const links = items
    .map(
      (i) => `<div style="margin:10px 0">
        <a href="${i.url}" style="display:inline-block;background:#1A2744;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">להורדת ${i.title} »</a>
      </div>`,
    )
    .join("");
  const inner = `
    <p>שלום ${firstName || "וברכה"},</p>
    <p>תודה על הרכישה! ${items.length > 1 ? "הספרים הדיגיטליים שרכשת מחכים לך כאן:" : "הספר הדיגיטלי שרכשת מחכה לך כאן:"}</p>
    ${links}
    <p style="font-size:13px;color:#6B5C4A">הקישורים תקפים לחודש. אפשר להוריד את הקובץ ולשמור אותו אצלך לתמיד.</p>
    <p style="font-size:13px;color:#6B5C4A">הקובץ אישי, לשימושך בלבד — נשמח שלא יועבר הלאה. כך אנחנו יכולים להמשיך להוציא ספרים חדשים 🙏</p>
    ${orderNumber ? `<p style="font-size:12px;color:#A69882">אסמכתת הזמנה: ${orderNumber}</p>` : ""}`;
  const subject = items.length > 1 ? "הספרים הדיגיטליים שרכשת — בני ציון" : `${items[0].title} — הספר הדיגיטלי שרכשת`;
  return sendSingleEmail(email, name, subject, emailShell(inner));
}

/**
 * מייל תודה לתורם (רמה 18, אודיט תרומות): עד עכשיו תורם קיבל רק קבלה מ-Grow —
 * בלי שום מילה חמה מהעמותה. נשלח פעם אחת, מיד אחרי אישור התשלום.
 */
export async function sendDonationThankYouEmail(params: {
  email: string;
  name: string;
  amount: number;
  isMonthly: boolean;
}): Promise<boolean> {
  const { email, name, amount, isMonthly } = params;
  if (!email) return false;
  const firstName = (name || "").trim().split(/\s+/)[0] || "";
  const inner = `
    <p>שלום ${firstName || "וברכה"},</p>
    <p>תודה מכל הלב על ${isMonthly ? "ההצטרפות למעגל השותפים הקבועים" : "התרומה"} לבני ציון${amount ? ` — ₪${Number(amount).toLocaleString()}` : ""}.</p>
    <p>בזכות שותפים כמוך התנ"ך פתוח לכולם: שיעורים, סדרות וספרים שמגיעים לאלפי לומדים בכל שבוע.</p>
    ${isMonthly ? `<p style="font-size:13px;color:#6B5C4A">התרומה תתחדש מדי חודש. לכל שינוי או ביטול אפשר פשוט להשיב למייל הזה.</p>` : ""}
    <p style="font-size:13px;color:#6B5C4A">קבלה רשמית (מוכרת לזיכוי מס לפי סעיף 46) נשלחת אליך במייל נפרד ממערכת הסליקה.</p>
    <p>בברכת התורה,<br/>צוות בני ציון</p>`;
  return sendSingleEmail(
    email,
    name,
    "תודה על תרומתך לבני ציון",
    emailShell(inner),
  );
}

/** התראת רכישה למייל המשרדי — כל הזמנת-חנות שאושרה (פיזי ודיגיטלי). */
export async function notifyOfficeNewOrder(params: {
  orderNumber: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  itemTitles: string[];
  shippingAddress?: string | null;
  shippingCity?: string | null;
  description?: string | null;
  hasDigital: boolean;
  /** יואב 22.7: קורסים שנפתחו לרוכש בעקבות ההזמנה — מוצג במייל המשרד */
  courseTitles?: string[];
}): Promise<boolean> {
  const p = params;
  const itemsHtml = p.itemTitles.length
    ? `<ul>${p.itemTitles.map((t) => `<li>${t}</li>`).join("")}</ul>`
    : `<p>${p.description || "—"}</p>`;
  const coursesHtml = p.courseTitles?.length
    ? `<p><b>נפתחה גישה לקורס:</b> ${p.courseTitles.join(" · ")} (לפי מייל הרוכש)</p>`
    : "";
  const shipping = p.shippingAddress
    ? `<p><b>משלוח:</b> ${p.shippingAddress}${p.shippingCity ? ", " + p.shippingCity : ""}</p>`
    : `<p><b>משלוח:</b> ${p.hasDigital ? "דיגיטלי — נשלח אוטומטית במייל" : "איסוף עצמי / לא צוין"}</p>`;
  const inner = `
    <p><b>התקבלה רכישה חדשה בחנות 🎉</b></p>
    <p><b>לקוח:</b> ${p.customerName || "—"}<br/>
       <b>מייל:</b> ${p.customerEmail || "—"}<br/>
       <b>טלפון:</b> ${p.customerPhone || "—"}</p>
    <p><b>מוצרים:</b></p>${itemsHtml}
    ${coursesHtml}
    <p><b>סכום:</b> ₪${Number(p.total).toLocaleString()}</p>
    ${shipping}
    ${p.orderNumber ? `<p style="font-size:12px;color:#A69882">הזמנה: ${p.orderNumber}</p>` : ""}
    <p style="font-size:13px"><a href="https://bneyzion.vercel.app/admin/orders">לטבלת ההזמנות באדמין »</a></p>`;
  return sendSingleEmail(
    OFFICE_EMAIL,
    "משרד בני ציון",
    `רכישה חדשה בחנות — ₪${Number(p.total).toLocaleString()}${p.customerName ? " · " + p.customerName : ""}`,
    emailShell(inner),
  );
}

/**
 * המסירה המלאה אחרי אישור תשלום. אידמפוטנטי — מדלג אם כבר נמסר
 * (raw_payload.digital_delivered_at) כדי ש-webhook כפול לא ישלח מייל כפול.
 */
export async function deliverOrder(supabase: SupabaseAdmin, orderId: string): Promise<void> {
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_email, customer_phone, total, description, shipping_address, shipping_city, raw_payload")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;
  const rawPayload = ((order as any).raw_payload || {}) as Record<string, unknown>;
  if (rawPayload.digital_delivered_at) {
    console.log("[DigitalDelivery] already delivered — skip", orderId);
    return;
  }

  const digitalItems = await loadDigitalItems(supabase, orderId);
  const { data: allItems } = await supabase
    .from("order_items")
    .select("title, quantity, total_price, products:product_id (slug)")
    .eq("order_id", orderId);
  const itemTitles = (allItems ?? [])
    .map((r: any) => {
      const qty = Number(r.quantity) || 1;
      const price = Number(r.total_price) || 0;
      return `${r.title}${qty > 1 ? ` ×${qty}` : ""}${price ? ` — ₪${price.toLocaleString()}` : ""}`;
    })
    .filter(Boolean);

  // יואב 22.7: אם ההזמנה פותחת קורס דיגיטלי — מציינים את זה במייל המשרד
  let courseTitles: string[] = [];
  try {
    const slugs = (allItems ?? [])
      .map((r: any) => r.products?.slug)
      .filter((s: unknown): s is string => typeof s === "string" && !!s);
    if (slugs.length) {
      const { data: courses } = await supabase
        .from("community_courses")
        .select("title, store_product_slug")
        .in("store_product_slug", slugs);
      courseTitles = (courses ?? []).map((c: any) => String(c.title)).filter(Boolean);
    }
  } catch { /* non-fatal */ }

  let deliveredToBuyer = false;
  if (digitalItems.length && (order as any).customer_email) {
    const signed = await signItems(supabase, digitalItems, BUYER_LINK_EXPIRY_SEC);
    if (signed.length) {
      deliveredToBuyer = await sendBuyerDeliveryEmail({
        email: (order as any).customer_email,
        name: (order as any).customer_name || "",
        items: signed,
        orderNumber: (order as any).order_number,
      });
    }
  }

  // התראת משרד — על כל הזמנת-חנות (עם order_items), לא על מנויים/תרומות
  let officeNotified = false;
  if (itemTitles.length) {
    officeNotified = await notifyOfficeNewOrder({
      orderNumber: (order as any).order_number,
      customerName: (order as any).customer_name || "",
      customerEmail: (order as any).customer_email || "",
      customerPhone: (order as any).customer_phone || "",
      total: Number((order as any).total || 0),
      itemTitles,
      shippingAddress: (order as any).shipping_address,
      shippingCity: (order as any).shipping_city,
      description: (order as any).description,
      hasDigital: digitalItems.length > 0,
      courseTitles,
    });
  }

  if (deliveredToBuyer || officeNotified) {
    await supabase
      .from("orders")
      .update({
        raw_payload: {
          ...rawPayload,
          ...(deliveredToBuyer ? { digital_delivered_at: new Date().toISOString() } : {}),
          ...(officeNotified ? { office_notified_at: new Date().toISOString() } : {}),
        },
      })
      .eq("id", orderId);
  }
  console.log(`[DigitalDelivery] order=${orderId} buyerEmail=${deliveredToBuyer} office=${officeNotified} digitalItems=${digitalItems.length}`);
}
