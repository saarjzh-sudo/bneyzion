/**
 * BenziConversations (admin) — תיעוד כל השיחות עם בנצי הבוט.
 *
 * קורא מ-bot_sessions (ה-edge navigation-bot כותב לשם כל חילופי-דברים,
 * upsert לפי session_id). קריאה מותרת לאדמין בלבד (policy bot_sessions_select_admin).
 */
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sessionsTable = () => (supabase as any).from("bot_sessions");

interface BotTurn { role: string; text: string }
interface BotSession {
  id: string;
  session_id: string;
  persona: string | null;
  history: BotTurn[] | null;
  last_route: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

function useBotSessions() {
  return useQuery({
    queryKey: ["admin-bot-sessions"],
    queryFn: async (): Promise<BotSession[]> => {
      const { data, error } = await sessionsTable()
        .select("id, session_id, persona, history, last_route, user_agent, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as BotSession[];
    },
  });
}

function fmtTime(ts: string) {
  try { return new Date(ts).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }); } catch { return ts; }
}

function firstUserLine(s: BotSession): string {
  const turn = (s.history ?? []).find((t) => t.role === "user");
  return turn?.text?.slice(0, 80) || "(ריק)";
}

export default function BenziConversations() {
  const { data: sessions, isLoading, error } = useBotSessions();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<BotSession | null>(null);

  const filtered = (sessions ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.history ?? []).some((t) => t.text?.toLowerCase().includes(q));
  });

  return (
    <AdminLayout>
      <div dir="rtl" className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display text-foreground flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
              שיחות בנצי
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              כל שיחה עם הבוט נשמרת כאן אוטומטית — מה שואלים, מה בנצי עונה, ומאיזה דף.
            </p>
          </div>
          <Input
            placeholder="חיפוש בתוכן השיחות…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">שיחות {sessions ? `(${filtered.length})` : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p>
            ) : error ? (
              <p className="text-sm text-destructive py-8 text-center">שגיאה בטעינה: {(error as Error).message}</p>
            ) : !filtered.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                עדיין אין שיחות מתועדות. השיחות נשמרות מכאן והלאה — ברגע שגולש ידבר עם בנצי, זה יופיע כאן.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מתי</TableHead>
                    <TableHead className="text-right">פתיחת השיחה</TableHead>
                    <TableHead className="text-right">הודעות</TableHead>
                    <TableHead className="text-right">דף אחרון</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-sm">{fmtTime(s.updated_at)}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{firstUserLine(s)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{(s.history ?? []).length}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground" dir="ltr">{s.last_route || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setOpen(s)} aria-label="צפייה בשיחה">
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>שיחה · {open ? fmtTime(open.updated_at) : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5">
            {(open?.history ?? []).map((t, i) => (
              <div
                key={i}
                className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed max-w-[85%] ${
                  t.role === "user"
                    ? "bg-secondary/70 text-foreground me-auto"
                    : "bg-primary/10 border border-primary/15 text-foreground ms-auto"
                }`}
              >
                <div className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                  {t.role === "user" ? "גולש" : "בנצי"}
                </div>
                {t.text}
              </div>
            ))}
            {open?.last_route && (
              <p className="text-xs text-muted-foreground pt-2">דף אחרון: <span dir="ltr">{open.last_route}</span></p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
