-- רמה 18ב (סער 15.7): שני מבני-קורס נפרדים.
-- ספרי הפרק-השבועי: פרק (bible_chapter) + שלוש שכבות (base/enrichment/weekly) — ללא שינוי.
-- קורס רגיל (בלי program_slug): קיבוץ לפי "נושא/פרק" בשם חופשי — כמו מערכות קורסים רגילות.
ALTER TABLE public.community_course_lessons
  ADD COLUMN IF NOT EXISTS section_title text;
