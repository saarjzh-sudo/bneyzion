-- רמה 28ב (יואב 25.7 23:07: אגף המורים איטי)
-- ספירות-יוצרים במכה אחת (החליף 31 שאילתות HEAD מהסיידבר):
CREATE OR REPLACE VIEW public.creator_published_counts AS
SELECT rabbi_id, count(*)::int AS published_count, COALESCE(sum(views_count),0)::int AS total_views
FROM public.lessons
WHERE status='published' AND rabbi_id IS NOT NULL
GROUP BY rabbi_id;
GRANT SELECT ON public.creator_published_counts TO anon, authenticated;

-- שאילתת "חדש באגף" (teachers+order created_at) ירדה מ-1.4ש' ל-0.17ש':
CREATE INDEX IF NOT EXISTS idx_lessons_teachers_created
ON public.lessons (created_at DESC)
WHERE audience_tags @> '{teachers}' AND status='published';
