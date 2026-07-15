#!/usr/bin/env python3
"""
backfill חיובי Grow מ-grow_webhook_log אל orders/donations — רמה 17 (14.7.2026).

הרקע: grow-webhook-sync v3 דחה כל payload בלי statusCode — אבל ה-webhook
החשבוני של Grow לא שולח statusCode בכלל. התוצאה: מאז 2.7 כל החיובים
(כולל חיובי-הו"ק חודשיים) נרשמו בלוג בלבד ולא הגיעו ל-orders/donations
("ה-feed נעצר ב-1.7"). ה-edge תוקן; הסקריפט הזה משלים את החוסר מהלוג.

בטיחות:
  * ברירת-מחדל = dry-run (ספירה + דוגמאות, אפס כתיבה).
  * ‏--apply: יוצר snapshot ‏orders_bak_growfeed_YYYYMMDD + donations_bak_...
    לפני ההכנסה, ואז insert אידמפוטנטי (NOT EXISTS על אסמכתא+charge_date).
  * אידמפוטנטי — ריצה חוזרת לא מכפילה (אפשר להריץ שוב אחרי פריסת ה-edge).

שימוש:
  python3 scripts/bz_grow_backfill.py            # dry-run
  python3 scripts/bz_grow_backfill.py --apply    # אחרי אישור סער בלבד
"""
import sys, json, re, urllib.request
from datetime import date

KEYS_FILE = "/Users/srhlq/Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md"
PROJECT = "pzvmwfexeiruelwiujxn"
SINCE = "2026-07-01"  # ה-feed נעצר ב-1.7; דדופ מגן על חפיפה עם 2.7

# ── בסיס משותף: פירוק הלוג לעסקאות-הצלחה ייחודיות ──────────────────────────
# הצלחה = יש asmachta + paymentDate + paymentSum, אין error_message.
# דדופ בתוך הלוג עצמו (אותו חיוב יכול להופיע פעמיים) לפי אסמכתא+תאריך.
BASE_CTE = f"""
WITH ok AS (
  SELECT DISTINCT ON (raw->>'asmachta', to_date(raw->>'paymentDate','DD/MM/YY'))
    raw->>'asmachta'                                   AS asm,
    to_date(raw->>'paymentDate','DD/MM/YY')            AS charge_date,
    (raw->>'paymentSum')::numeric                      AS sum,
    raw->>'paymentDesc'                                AS de,
    raw->>'fullName'                                   AS nm,
    nullif(lower(trim(raw->>'payerEmail')),'')         AS em,
    nullif(raw->>'payerPhone','')                      AS ph,
    nullif(raw->>'cardSuffix','')                      AS card_suffix,
    nullif(raw->>'cardBrand','')                       AS card_brand,
    nullif(raw->>'invoiceName','')                     AS invoice_name,
    nullif(raw->>'paymentSource','')                   AS page_name,
    coalesce(raw->>'paymentType','')                   AS pt,
    coalesce((raw->>'paymentsNum')::int, 0)            AS payments_num,
    coalesce((raw->>'allPaymentNum')::int, 0)          AS all_payments
  FROM grow_webhook_log
  WHERE received_at > '{SINCE}'
    AND raw ? 'asmachta' AND raw ? 'paymentDate'
    AND NOT (raw ? 'error_message')
    AND coalesce(raw->>'paymentSum','') ~ '^[0-9.]+$'
    AND (raw->>'paymentSum')::numeric > 0
    AND coalesce(raw->>'cField1','') = ''
    AND coalesce(raw->>'paymentDesc','') !~ 'בדיקה'
    AND coalesce(raw->>'fullName','')    !~ 'בדיק'
  ORDER BY raw->>'asmachta', to_date(raw->>'paymentDate','DD/MM/YY'), id DESC
), typed AS (
  SELECT ok.*,
    CASE WHEN de ~ 'יהושע|סעדיה|תרומ' THEN 'donations' ELSE 'orders' END AS target,
    CASE WHEN de ~ 'יהושע' THEN 'yehoshua-campaign'
         WHEN de ~ 'סעדיה' THEN 'saadia-campaign'
         WHEN de ~ 'תרומ'  THEN 'general-donation'
         WHEN de ~ 'לחיות|מנוי חודשי|הפרק השבועי|חידוש הוראת קבע|תשלום לתכנית|הרשמה לתכנית'
              THEN 'weekly-chapter-subscription'
         WHEN de ~ 'בית המדרש' THEN 'beit-midrash-participation'
         ELSE 'other' END AS product,
    (pt ~ 'הו"ק|הוראת קבע') AS is_rec,
    CASE WHEN payments_num > 0
         THEN 'תשלום ' || payments_num || CASE WHEN all_payments > 1 THEN ' מתוך ' || all_payments ELSE '' END
         ELSE nullif(pt,'') END AS payment_label
  FROM ok
), missing AS (
  -- ⚠️ תיקון 15.7.2026: שורות שדף-הקמפיין יצר נשארו עם charge_date=NULL,
  -- ולכן ההשוואה = לא תפסה אותן — ה-backfill מ-14.7 הכניס 56 כפילויות-יהושע
  -- (~₪7.7K ניפוח). אסמכתא זהה עם charge_date NULL = אותה עסקה.
  SELECT t.* FROM typed t
  WHERE NOT EXISTS (SELECT 1 FROM orders o    WHERE o.asmachta = t.asm AND (o.charge_date = t.charge_date OR o.charge_date IS NULL))
    AND NOT EXISTS (SELECT 1 FROM donations d WHERE d.asmachta = t.asm AND (d.charge_date = t.charge_date OR d.charge_date IS NULL))
)
"""

DRY_SQL = BASE_CTE + """
SELECT target, product, is_rec, count(*)::int AS n, sum(sum)::numeric AS total,
       min(charge_date)::text AS first, max(charge_date)::text AS last
FROM missing GROUP BY 1,2,3 ORDER BY n DESC;
"""

def apply_sql(stamp: str) -> str:
    return f"""
CREATE TABLE IF NOT EXISTS orders_bak_growfeed_{stamp}    AS SELECT * FROM orders;
CREATE TABLE IF NOT EXISTS donations_bak_growfeed_{stamp} AS SELECT * FROM donations;
""" + BASE_CTE + """
, ins_don AS (
  INSERT INTO donations (donor_name, donor_email, amount, payment_status, asmachta,
    description, phone, card_suffix, source, payment_method, product, grow_status,
    payment_label, card_brand, page_name, invoice_name, charge_date, is_monthly)
  SELECT nm, em, sum, 'completed', asm, de, ph, card_suffix, 'grow-backfill-20260714',
    'credit', product, 'חוייב', payment_label, card_brand, page_name, invoice_name,
    charge_date, is_rec
  FROM missing WHERE target = 'donations'
  RETURNING 1
), ins_ord AS (
  INSERT INTO orders (order_number, status, payment_status, payment_method,
    customer_name, customer_email, customer_phone, subtotal, discount, total,
    currency, installments, invoice_type, asmachta, product, card_suffix,
    description, notes, grow_status, payment_label, card_brand, page_name,
    invoice_name, charge_date)
  SELECT 'GROW-' || asm || '-' || charge_date, 'confirmed', 'completed', 'credit',
    nm, em, ph, sum, 0, sum, 'ILS', greatest(all_payments, 1), 'receipt', asm,
    product, card_suffix, de, 'grow-backfill-20260714', 'חוייב', payment_label,
    card_brand, page_name, invoice_name, charge_date
  FROM missing WHERE target = 'orders'
  RETURNING 1
)
SELECT (SELECT count(*) FROM ins_don)::int AS inserted_donations,
       (SELECT count(*) FROM ins_ord)::int AS inserted_orders;
"""

VERIFY_SQL = BASE_CTE + """
SELECT count(*)::int AS still_missing FROM missing;
"""


def run(sql: str):
    pat = re.search(r"(sbp_bddd[0-9a-f]+)", open(KEYS_FILE).read()).group(1)
    url = f"https://api.supabase.com/v1/projects/{PROJECT}/database/query"
    req = urllib.request.Request(url, data=json.dumps({"query": sql}).encode(), method="POST", headers={
        "Authorization": f"Bearer {pat}", "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36",
    })
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(req, timeout=180) as r:
        return json.loads(r.read().decode())


if __name__ == "__main__":
    if "--apply" in sys.argv:
        stamp = date.today().strftime("%Y%m%d")
        print("== APPLY (עם snapshot) ==")
        print(json.dumps(run(apply_sql(stamp)), ensure_ascii=False, indent=1))
        print("== VERIFY (חייב 0) ==")
        print(json.dumps(run(VERIFY_SQL), ensure_ascii=False, indent=1))
    else:
        print("== DRY-RUN — מה יוכנס ==")
        print(json.dumps(run(DRY_SQL), ensure_ascii=False, indent=1, default=str))
        print("\nלהרצה אמיתית (אחרי אישור): python3 scripts/bz_grow_backfill.py --apply")
