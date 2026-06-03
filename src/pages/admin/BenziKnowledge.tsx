/**
 * /admin/benzi — עריכת ידע של בנצי
 *
 * ממשק עריכה פשוט: רשימת בלוקי ידע עם textarea לכל בלוק.
 * שמירה → סופהבייס → edge function navigation-bot טוענת בריצה הבאה.
 * אין צורך ב-deploy. השינוי נכנס לתוקף מיד.
 */

import { useState } from "react";
import { Bot, Save, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ────────────────────────────────────────────────────────────────────
interface BenziKnowledgeRow {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function useBenziKnowledge() {
  return useQuery({
    queryKey: ["benzi_knowledge"],
    queryFn: async (): Promise<BenziKnowledgeRow[]> => {
      const { data, error } = await db
        .from("benzi_knowledge")
        .select("*")
        .order("id");
      if (error) throw error;
      return (data ?? []) as BenziKnowledgeRow[];
    },
  });
}

function useUpdateBenziBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await db
        .from("benzi_knowledge")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["benzi_knowledge"] }),
  });
}

function useToggleBenziBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db
        .from("benzi_knowledge")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["benzi_knowledge"] }),
  });
}

// ── Block editor ─────────────────────────────────────────────────────────────
function KnowledgeBlock({ row }: { row: BenziKnowledgeRow }) {
  const [draft, setDraft] = useState(row.content);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const updateMutation = useUpdateBenziBlock();
  const toggleMutation = useToggleBenziBlock();

  const isDirty = draft !== row.content;

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ id: row.id, content: draft });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "נשמר", description: `הבלוק "${row.title}" עודכן בהצלחה.` });
    } catch {
      toast({ title: "שגיאה", description: "לא ניתן לשמור. נסה שוב.", variant: "destructive" });
    }
  };

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync({ id: row.id, is_active: !row.is_active });
      toast({
        title: row.is_active ? "בלוק כובה" : "בלוק הופעל",
        description: `"${row.title}" ${row.is_active ? "לא יוצג לבנצי" : "יוצג לבנצי"}.`,
      });
    } catch {
      toast({ title: "שגיאה", description: "לא ניתן לשנות סטטוס.", variant: "destructive" });
    }
  };

  const updatedAt = new Date(row.updated_at).toLocaleString("he-IL", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card className={`transition-opacity ${!row.is_active ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              {row.title}
              {saved && (
                <span className="flex items-center gap-1 text-green-600 text-xs font-normal">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  נשמר
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 font-mono text-muted-foreground/70">
              id: {row.id} · עודכן: {updatedAt}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant={row.is_active ? "default" : "secondary"}
              className="cursor-pointer select-none"
              onClick={handleToggle}
            >
              {row.is_active ? "פעיל" : "כבוי"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[160px] font-mono text-sm leading-relaxed resize-y text-right"
          dir="rtl"
          disabled={!row.is_active}
          placeholder="תוכן הבלוק..."
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {draft.length} תווים
          </span>
          <div className="flex gap-2">
            {isDirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDraft(row.content)}
                className="h-8 text-xs"
              >
                <RefreshCw className="w-3 h-3 ml-1" />
                בטל שינויים
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending || !row.is_active}
              className="h-8 text-xs"
            >
              <Save className="w-3 h-3 ml-1" />
              {updateMutation.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BenziKnowledge() {
  const { data: rows, isLoading, error } = useBenziKnowledge();

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-12" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">אימון בנצי</h1>
            <p className="text-sm text-muted-foreground">
              עריכת ידע ישירה — שמור ובנצי יידע בשיחה הבאה, בלי deploy
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-0.5">איך זה עובד</p>
            <p className="text-amber-700">
              כל בלוק שמור בסופהבייס. בכל שיחה עם בנצי, ה-edge function טוענת את
              הבלוקים הפעילים ומזריקה אותם לפרומפט. שינוי כאן = שינוי מיידי בתשובות בנצי.
              הידע "הקשיח" (routes, פורמט JSON) נשאר בקוד ואינו עריך כאן.
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-32 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">
                שגיאה בטעינת הידע — ודא שהמיגרציה רצה וטבלת benzi_knowledge קיימת.
              </p>
              <p className="text-muted-foreground text-xs mt-1 font-mono">
                {String(error)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Knowledge blocks */}
        {rows && rows.length > 0 && (
          <div className="space-y-4">
            {rows.map((row) => (
              <KnowledgeBlock key={row.id} row={row} />
            ))}
          </div>
        )}

        {/* Empty state — table exists but no rows */}
        {rows && rows.length === 0 && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p className="text-sm">אין בלוקי ידע עדיין.</p>
              <p className="text-xs mt-1">
                הרץ את המיגרציה{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  20260603_benzi_knowledge.sql
                </code>{" "}
                כדי לאכלס את הטבלה.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
