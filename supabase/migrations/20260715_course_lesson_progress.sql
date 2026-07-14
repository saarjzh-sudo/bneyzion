-- רמה 18 (יואב 14.7, אודיו 22:21): מעקב התקדמות אישי בקורסים —
-- "מה מהם הוא למד, מה מהם השלים, מסמן כזה — דברים בסיסיים שבכל מערכת קורסים".
-- שורת progress לכל (משתמש, פריט-תוכן). RLS: כל משתמש רואה וכותב רק את שלו.

CREATE TABLE IF NOT EXISTS public.course_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.community_course_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_clp_user_course
  ON public.course_lesson_progress (user_id, course_id);

ALTER TABLE public.course_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clp_select_own" ON public.course_lesson_progress;
CREATE POLICY "clp_select_own" ON public.course_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "clp_insert_own" ON public.course_lesson_progress;
CREATE POLICY "clp_insert_own" ON public.course_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "clp_delete_own" ON public.course_lesson_progress;
CREATE POLICY "clp_delete_own" ON public.course_lesson_progress
  FOR DELETE USING (auth.uid() = user_id);
