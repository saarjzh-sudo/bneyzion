-- 3.9.2026 — סבב העומס (סער: "תוסיף את האינדקס ופרוס")
-- ה-views campaign_stats ו-campaign_tier_counts מסננים donations לפי product
-- (+payment_status), ורצו ב-Seq Scan על כל הטבלה בכל טעינת דף-קמפיין ובכל
-- רענון של הפס העליון. עם 1,097 שורות זה עוד זול, אבל זו השאילתה הכי נקראת
-- באתר ו-donations רק גדלה.
-- הופעל בפרודקשן ב-3.9.2026 עם CONCURRENTLY (בלי נעילת כתיבה).
-- אחרי: campaign_stats cost 122→55, Seq Scan→Bitmap Index Scan (0.34ms).
create index concurrently if not exists donations_product_status_idx
  on public.donations (product, payment_status);
