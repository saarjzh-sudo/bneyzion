/**
 * Admin · שאל את הרב — /admin/questions
 *
 * תור מסודר לשאלות מהאתר (טבלת site_questions): טאבים לפי סטטוס עם מוני
 * שאלות, כרטיס לכל שאלה עם עורך מענה מוטמע ("מי עונה" ברירת מחדל: הרב יואב
 * אוריאל), פעולות מענה/פרסום/דחייה/ארכיון, וסטטוס מייל-עותק לשואל.
 *
 * ⚠️ דורש route ב-App.tsx + פריט ב-AdminSidebar (ראה תיעוד בסוף העבודה).
 * דגם: src/pages/admin/Dedications.tsx + Messages.tsx (gold/navy/parchment, RTL).
 *
 * עתידי: מענה ע"י מנהלים/יוצרים נוספים — "מי עונה" הוא טקסט חופשי בכוונה,
 * כך שפתיחת העמוד ל-creator בהמשך היא רק שינוי allowedRoles ב-route.
 */

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Archive,
  ArchiveRestore,
  AtSign,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  Mail,
  MailCheck,
  Send,
  XCircle,
} from "lucide-react";
import {
  useAllQuestions,
  useAnswerQuestion,
  useUpdateQuestion,
  useNotifyQuestionAnswered,
  QUESTION_STATUS_LABELS,
  type QuestionStatus,
  type SiteQuestion,
} from "@/hooks/useSiteQuestions";
import { useToast } from "@/hooks/use-toast";

const C = {
  navy: "#1A2744",
  gold: "#8B6F47",
  goldShimmer: "#E8D5A0",
  parchment: "#FAF6F0",
  text: "#2D1F0E",
  textMuted: "#6B5C4A",
  green: "#059669",
  amber: "#b45309",
  red: "#b91c1c",
  slate: "#64748b",
};

const DEFAULT_ANSWERER = "הרב יואב אוריאל";

const STATUS_META: Record<QuestionStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "ממתינה", color: C.amber, bg: "#fef3c7", icon: Clock },
  answered: { label: "נענתה", color: C.green, bg: "#dcfce7", icon: CheckCircle2 },
  rejected: { label: "נדחתה", color: C.red, bg: "#fee2e2", icon: XCircle },
  archived: { label: "בארכיון", color: C.slate, bg: "#f1f5f9", icon: Archive },
};

const TABS: QuestionStatus[] = ["pending", "answered", "rejected", "archived"];
const TAB_LABELS: Record<QuestionStatus, string> = {
  pending: "ממתינות",
  answered: "נענו",
  rejected: "נדחו",
  archived: "ארכיון",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Single question card ───────────────────────────────────────────────────

function QuestionCard({ q }: { q: SiteQuestion }) {
  const { toast } = useToast();
  const answerQuestion = useAnswerQuestion();
  const updateQuestion = useUpdateQuestion();
  const notify = useNotifyQuestionAnswered();

  const [answer, setAnswer] = useState(q.answer ?? "");
  const [answeredBy, setAnsweredBy] = useState(q.answered_by ?? DEFAULT_ANSWERER);
  const [editing, setEditing] = useState(q.status === "pending");

  const status = (STATUS_META[q.status as QuestionStatus] ?? STATUS_META.pending);
  const StatusIcon = status.icon;
  const busy = answerQuestion.isPending || updateQuestion.isPending;

  const validateAnswer = () => {
    if (!answer.trim()) {
      toast({ title: "חסרה תשובה", description: "כתבו את התשובה לפני שמירה.", variant: "destructive" });
      return false;
    }
    if (!answeredBy.trim()) {
      toast({ title: "חסר שם עונה", description: 'מלאו "מי עונה".', variant: "destructive" });
      return false;
    }
    return true;
  };

  const submitAnswer = async (publish: boolean) => {
    if (!validateAnswer()) return;
    try {
      await answerQuestion.mutateAsync({
        id: q.id,
        answer,
        answered_by: answeredBy,
        publish,
        // מייל-עותק נשלח רק כשהתשובה מתפרסמת, ורק אם השואל השאיר מייל.
        notify: publish && !!q.asker_email && !q.email_sent_at,
      });
      setEditing(false);
      toast({
        title: publish ? "התשובה נשמרה ופורסמה" : "התשובה נשמרה בלי פרסום",
        description:
          publish && q.asker_email && !q.email_sent_at
            ? `עותק נשלח למייל של ${q.asker_name}.`
            : undefined,
      });
    } catch (e) {
      toast({ title: "שגיאה בשמירת התשובה", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const setStatus = async (nextStatus: QuestionStatus, extra?: { is_published?: boolean }) => {
    try {
      await updateQuestion.mutateAsync({ id: q.id, status: nextStatus, ...extra });
      toast({ title: `השאלה סומנה: ${QUESTION_STATUS_LABELS[nextStatus]}` });
    } catch (e) {
      toast({ title: "שגיאה", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const togglePublish = async () => {
    try {
      await updateQuestion.mutateAsync({ id: q.id, is_published: !q.is_published });
      toast({ title: q.is_published ? "הוסרה מהעמוד הציבורי" : "פורסמה בעמוד הציבורי" });
      // פרסום מאוחר של תשובה קיימת: אם לשואל יש מייל ועוד לא נשלח עותק — שולחים עכשיו.
      if (!q.is_published && q.answer && q.asker_email && !q.email_sent_at) {
        notify.mutate(q.id, { onError: () => undefined });
      }
    } catch (e) {
      toast({ title: "שגיאה", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const sendEmailCopy = async () => {
    try {
      const res = await notify.mutateAsync(q.id);
      if (res?.skipped) {
        toast({ title: "המייל לא נשלח", description: `סיבה: ${res.skipped}` });
      } else {
        toast({ title: "עותק התשובה נשלח למייל השואל" });
      }
    } catch (e) {
      toast({ title: "שליחת המייל נכשלה", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  return (
    <Card className="rounded-2xl border shadow-sm" style={{ borderColor: C.goldShimmer }}>
      <CardContent className="p-5 space-y-4">
        {/* Header row: asker + meta + status */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-ploni" style={{ color: C.textMuted }}>
            <span className="font-bold" style={{ color: C.text }}>{q.asker_name}</span>
            {q.asker_email ? (
              <span className="flex items-center gap-1" dir="ltr">
                <AtSign className="h-3.5 w-3.5" />
                {q.asker_email}
              </span>
            ) : (
              <span className="text-xs">בלי מייל</span>
            )}
            <span className="flex items-center gap-1 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(q.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge style={{ background: status.bg, color: status.color }} className="gap-1 font-ploni">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            {q.status === "answered" && (
              <Badge
                variant="outline"
                className="gap-1 font-ploni"
                style={{ borderColor: C.goldShimmer, color: q.is_published ? C.green : C.textMuted }}
              >
                {q.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {q.is_published ? "מפורסמת" : "לא מפורסמת"}
              </Badge>
            )}
            {q.email_sent_at && (
              <Badge variant="outline" className="gap-1 font-ploni" style={{ borderColor: C.goldShimmer, color: C.green }}>
                <MailCheck className="h-3 w-3" />
                מייל נשלח
              </Badge>
            )}
          </div>
        </div>

        {/* Question body */}
        <div className="rounded-lg p-4" style={{ background: C.parchment, border: `1px solid ${C.goldShimmer}` }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-ploni" style={{ color: C.text }}>
            {q.question}
          </p>
        </div>

        {/* Existing answer (read mode) */}
        {!editing && q.answer && (
          <div className="rounded-lg p-4" style={{ background: "#f6fdf8", border: "1px solid #bbe5c8" }}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap font-ploni" style={{ color: C.text }}>
              {q.answer}
            </p>
            {q.answered_by && (
              <p className="text-xs font-bold font-ploni mt-2" style={{ color: C.gold }}>
                {q.answered_by}
                {q.answered_at ? ` · ${fmtDate(q.answered_at)}` : ""}
              </p>
            )}
          </div>
        )}

        {/* Inline answer editor */}
        {editing && (
          <div className="space-y-3">
            <div>
              <Label className="font-ploni">תשובה</Label>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                dir="rtl"
                placeholder="כתבו כאן את התשובה לשואל..."
                className="mt-1 font-ploni"
              />
            </div>
            <div className="max-w-xs">
              <Label className="font-ploni">מי עונה</Label>
              <Input
                value={answeredBy}
                onChange={(e) => setAnsweredBy(e.target.value)}
                dir="rtl"
                className="mt-1 font-ploni"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={() => submitAnswer(true)}
                disabled={busy}
                className="font-ploni gap-1.5"
                style={{ background: C.navy, color: "#fff" }}
              >
                <Send className="h-4 w-4" />
                {answerQuestion.isPending ? "שומר..." : "ענה ופרסם"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => submitAnswer(false)}
                disabled={busy}
                className="font-ploni"
                style={{ borderColor: C.goldShimmer, color: C.navy }}
              >
                ענה בלי לפרסם
              </Button>
              {q.status !== "pending" && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy} className="font-ploni">
                  ביטול עריכה
                </Button>
              )}
            </>
          ) : (
            q.status === "answered" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={togglePublish}
                  disabled={busy}
                  className="font-ploni gap-1.5"
                  style={{ borderColor: C.goldShimmer, color: C.navy }}
                >
                  {q.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {q.is_published ? "הסר מפרסום" : "פרסם"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={busy} className="font-ploni">
                  ערוך תשובה
                </Button>
                {q.asker_email && !q.email_sent_at && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={sendEmailCopy}
                    disabled={notify.isPending}
                    className="font-ploni gap-1.5"
                    style={{ color: C.gold }}
                  >
                    <Mail className="h-4 w-4" />
                    {notify.isPending ? "שולח..." : "שלח עותק למייל"}
                  </Button>
                )}
              </>
            )
          )}

          <span className="flex-1" />

          {q.status === "pending" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStatus("rejected", { is_published: false })}
              disabled={busy}
              className="font-ploni gap-1.5"
              style={{ color: C.red }}
            >
              <XCircle className="h-4 w-4" />
              דחה
            </Button>
          )}
          {(q.status === "rejected" || q.status === "archived") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStatus(q.answer ? "answered" : "pending")}
              disabled={busy}
              className="font-ploni gap-1.5"
              style={{ color: C.green }}
            >
              <ArchiveRestore className="h-4 w-4" />
              החזר לתור
            </Button>
          )}
          {q.status !== "archived" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStatus("archived", { is_published: false })}
              disabled={busy}
              className="font-ploni gap-1.5"
              style={{ color: C.slate }}
            >
              <Archive className="h-4 w-4" />
              ארכיון
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Questions() {
  const { data: questions, isLoading, isError } = useAllQuestions();
  const [tab, setTab] = useState<QuestionStatus>("pending");

  const rows = useMemo(() => questions ?? [], [questions]);

  const counts = useMemo(() => {
    const c: Record<QuestionStatus, number> = { pending: 0, answered: 0, rejected: 0, archived: 0 };
    for (const q of rows) {
      const s = q.status as QuestionStatus;
      if (s in c) c[s] += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => rows.filter((q) => q.status === tab), [rows, tab]);

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-kedem font-bold flex items-center gap-2" style={{ color: C.navy }}>
              <HelpCircle className="w-7 h-7" style={{ color: C.gold }} aria-hidden />
              שאל את הרב
            </h1>
            <p className="font-ploni mt-1" style={{ color: C.textMuted }}>
              {counts.pending} ממתינות למענה · {counts.answered} נענו · {rows.filter((q) => q.is_published).length} מפורסמות באתר
            </p>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className="px-3 py-1.5 rounded-full text-xs font-ploni border transition-colors inline-flex items-center gap-1.5"
              style={{
                borderColor: tab === s ? C.navy : C.goldShimmer,
                background: tab === s ? C.navy : "#fff",
                color: tab === s ? "#fff" : C.textMuted,
              }}
            >
              {TAB_LABELS[s]}
              <span
                className="rounded-full px-1.5 text-[10px] font-bold"
                style={{
                  background: tab === s ? "rgba(255,255,255,0.2)" : STATUS_META[s].bg,
                  color: tab === s ? "#fff" : STATUS_META[s].color,
                }}
              >
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 font-ploni" style={{ color: C.textMuted }}>
            <p>טעינת השאלות נכשלה. רעננו את הדף ונסו שוב.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 font-ploni" style={{ color: C.textMuted }}>
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>
              {tab === "pending"
                ? "אין שאלות שממתינות למענה. כשגולש ישלח שאלה מהאתר, היא תופיע כאן."
                : `אין שאלות בסטטוס "${TAB_LABELS[tab]}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
