-- Y6 (יואב 21.7.2026): סדרה שמסומנת מופיעה תמיד בפינת פרשת השבוע.
-- מסומנת באדמין ← סדרות ← עריכה ← "מופיעה תמיד בפינת פרשת השבוע".
-- useParasha ממזג את הסדרות המסומנות לרשימה הקבועה שבקוד (PARASHA_ARTICLE_SERIES)
-- ומאתר בתוכן את מאמר הפרשה הנוכחית לפי שם הפרשה בכותרת השיעור.
-- הוחל על הפרודקשן ב-21.7.2026 דרך Management API (לפני פריסת הקוד — דאטה קודם).

ALTER TABLE series ADD COLUMN IF NOT EXISTS show_in_parasha boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN series.show_in_parasha IS
  'יואב 21.7.2026 (Y6): סדרה מסומנת מופיעה תמיד בפינת פרשת השבוע, בנוסף לרשימה הקבועה בקוד';
