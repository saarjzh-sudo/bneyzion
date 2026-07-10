import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * "שאל את הרב" — טבלת `site_questions`.
 *
 * זרימה: גולש שולח שאלה (name חובה, email רשות) → נכנסת כ-pending לתור האדמין →
 * האדמין עונה ומפרסם → התשובה מופיעה בעמוד הציבורי /ask-rabbi, ואם השואל השאיר
 * מייל — נשלח לו עותק דרך edge function ‏notify-question-answered.
 *
 * ⚠️ הטבלה לא קיימת ב-generated types (src/integrations/supabase/types.ts) —
 * קריאה/כתיבה עוברות דרך `as never` (התבנית המבוססת ב-useLessonDedications.ts).
 *
 * RLS (כבר חל ב-DB):
 * - SELECT ציבורי: רק is_published=true וגם answer IS NOT NULL.
 * - INSERT ציבורי: רק status='pending', is_published=false, בלי answer/answered_by.
 *   לכן useSubmitQuestion לא עושה `.select()` אחרי insert — לשורה החדשה אין SELECT לאנונימי.
 * - אדמין (has_role admin): גישה מלאה.
 *
 * עתידי (מתוכנן, לא בנוי): מתן הרשאת מענה גם ל-creators — השדה answered_by הוא
 * טקסט חופשי בכוונה, כך שכל עונה עתידי רק ימלא שם תצוגה ואין תלות ב-role plumbing.
 */

export type QuestionStatus = "pending" | "answered" | "rejected" | "archived";

export interface SiteQuestion {
  id: string;
  asker_name: string;
  asker_email: string | null;
  question: string;
  answer: string | null;
  /** שם תצוגה של העונה (למשל "הרב יואב אוריאל"). */
  answered_by: string | null;
  status: string;
  is_published: boolean;
  email_sent_at: string | null;
  created_at: string;
  answered_at: string | null;
  updated_at: string;
}

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  pending: "ממתינה",
  answered: "נענתה",
  rejected: "נדחתה",
  archived: "בארכיון",
};

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** שאלות שנענו ופורסמו — לעמוד הציבורי. החדשה ביותר ראשונה. */
export function usePublishedQuestions() {
  return useQuery({
    queryKey: ["site-questions", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_questions" as never)
        .select("id, asker_name, question, answer, answered_by, answered_at, created_at")
        .eq("is_published" as never, true)
        .not("answer", "is", null)
        .order("answered_at" as never, { ascending: false, nullsFirst: false })
        .order("created_at" as never, { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SiteQuestion[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export interface SubmitQuestionInput {
  asker_name: string;
  asker_email?: string;
  question: string;
}

/** שליחת שאלה חדשה מהאתר — נכנסת לתור כ-pending. */
export function useSubmitQuestion() {
  return useMutation({
    mutationFn: async (input: SubmitQuestionInput) => {
      const payload = {
        asker_name: input.asker_name.trim(),
        asker_email: input.asker_email?.trim() || null,
        question: input.question.trim(),
        // חייב להתאים במדויק למדיניות ה-INSERT הציבורית.
        status: "pending",
        is_published: false,
      };
      // בלי .select() — לאנונימי אין SELECT על שורות לא-מפורסמות (RLS).
      const { error } = await supabase
        .from("site_questions" as never)
        .insert(payload as never);
      if (error) throw error;
    },
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** כל השאלות (כל הסטטוסים) — לתור האדמין. */
export function useAllQuestions() {
  return useQuery({
    queryKey: ["admin-site-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_questions" as never)
        .select("*")
        .order("created_at" as never, { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SiteQuestion[];
    },
  });
}

/**
 * שליחת עותק התשובה למייל השואל — edge function ‏notify-question-answered.
 * לא-חוסם בכוונה: כישלון מייל לעולם לא שובר את זרימת המענה.
 * הפונקציה עצמה אידמפוטנטית (שומרת email_sent_at), אז בטוח לקרוא שוב.
 */
export function useNotifyQuestionAnswered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { data, error } = await supabase.functions.invoke("notify-question-answered", {
        body: { question_id: questionId },
      });
      if (error) throw error;
      if (data && data.ok === false && !data.skipped) {
        throw new Error(data.error || "שליחת המייל נכשלה");
      }
      return data as { ok: boolean; sent?: boolean; skipped?: string };
    },
    onSuccess: () => {
      // email_sent_at התעדכן — לרענן את התור.
      qc.invalidateQueries({ queryKey: ["admin-site-questions"] });
    },
  });
}

export interface AnswerQuestionInput {
  id: string;
  answer: string;
  answered_by: string;
  /** true = מפרסם מיד בעמוד הציבורי. false = נענתה אבל לא מפורסמת. */
  publish: boolean;
  /** true = אחרי שמירה מוצלחת, להפעיל את מייל-העותק לשואל (לא-חוסם). */
  notify?: boolean;
}

/** מענה לשאלה: answer + answered_by + status='answered' + answered_at (+ פרסום). */
export function useAnswerQuestion() {
  const qc = useQueryClient();
  const notifyMutation = useNotifyQuestionAnswered();
  return useMutation({
    mutationFn: async (input: AnswerQuestionInput) => {
      const updates = {
        answer: input.answer.trim(),
        answered_by: input.answered_by.trim(),
        status: "answered",
        answered_at: new Date().toISOString(),
        is_published: input.publish,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("site_questions" as never)
        .update(updates as never)
        .eq("id" as never, input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-site-questions"] });
      qc.invalidateQueries({ queryKey: ["site-questions", "published"] });
      if (vars.notify) {
        // fire-and-forget: כישלון מייל לא מפיל את זרימת המענה.
        notifyMutation.mutate(vars.id, { onError: () => undefined });
      }
    },
  });
}

export type UpdateQuestionInput = Partial<
  Pick<SiteQuestion, "answer" | "answered_by" | "status" | "is_published">
> & { id: string };

/** עדכון כללי: פרסום/הסרה מפרסום, דחייה, ארכיון, החזרה לתור, עריכת תשובה. */
export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateQuestionInput) => {
      const { error } = await supabase
        .from("site_questions" as never)
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq("id" as never, id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-site-questions"] });
      qc.invalidateQueries({ queryKey: ["site-questions", "published"] });
    },
  });
}
