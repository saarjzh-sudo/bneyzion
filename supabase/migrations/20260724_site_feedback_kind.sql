-- רמה 28 (יואב 24.7 11:30): רצועת-ההרצה מקבלת גם "הצעת תוכן לאתר".
-- kind: 'bug' (דיווח תקלה, ברירת-מחדל) | 'content' (הצעת תוכן).
ALTER TABLE public.site_feedback ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'bug';
