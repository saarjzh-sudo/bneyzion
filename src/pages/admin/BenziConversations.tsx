/**
 * BenziConversations (admin) — תיעוד וחקירה של כל שיחה עם בנצי הבוט.
 *
 * קורא מ-bot_sessions (ה-edge navigation-bot כותב לשם כל חילופי-דברים,
 * upsert לפי session_id). קריאה מותרת לאדמין בלבד (policy bot_sessions_select_admin).
 *
 * ⚠️ ה-history מערבב שני פורמטים של תור-הודעה:
 *   • פשוט:  { role: "user"|"bot", text: "..." }
 *   • עשיר:  { role: "user", content: "..." }  |  { role: "model", content: { reply_text, cta_buttons, suggestions, intent_detected, persona_guess, refused_content } }
 * הגרסה הישנה קראה רק t.text → כל תור עשיר יצא בועה ריקה, וכל קישור ש-cta_buttons
 * נתן לגולשים נעלם. normalizeTurn מיישר את שניהם ומחלץ את הקישורים לחקירה.
 */
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Eye, ExternalLink, Link2, ShieldAlert, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sessionsTable = () => (supabase as any).from("bot_sessions");

// הבסיס לפתיחת קישור שבנצי נתן — כדי לאמת חיה לאן הוא שולח אנשים
const SITE_ORIGIN = "https://bneyzion.vercel.app";

interface CtaButton { label?: string; route?: string; url?: string; icon?: string }

/** תור-הודעה מנורמל — אחיד לשני הפורמטים */
interface Turn {
  role: "user" | "bot";
  text: string;
  cta: CtaButton[];
  suggestions: string[];
  intent?: string | null;
  persona?: string | null;
  refused?: boolean;
}

interface BotSession {
  id: string;
  session_id: string;
  persona: string | null;
  history: any[] | null;
  intents_detected: string[] | null;
  links_clicked: any;
  refused_content: boolean | null;
  last_route: string | null;
  ip_country: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

// ─── נירמול תור בודד ──────────────────────────────────────────────────
function normalizeTurn(raw: any): Turn {
  const role: Turn["role"] =
    raw?.role === "user" ? "user" : "bot"; // model / bot / assistant → bot

  const c = raw?.content;
  let text = "";
  let cta: CtaButton[] = [];
  let suggestions: string[] = [];
  let intent: string | null | undefined;
  let persona: string | null | undefined;
  let refused: boolean | undefined;

  if (typeof raw?.text === "string" && raw.text) {
    text = raw.text;
  } else if (typeof c === "string") {
    text = c;
  } else if (c && typeof c === "object") {
    text = c.reply_text ?? c.text ?? "";
    cta = Array.isArray(c.cta_buttons) ? c.cta_buttons : [];
    suggestions = Array.isArray(c.suggestions) ? c.suggestions : [];
    intent = c.intent_detected ?? null;
    persona = c.persona_guess ?? null;
    refused = c.refused_content === true;
  }

  return { role, text, cta, suggestions, intent, persona, refused };
}

function normalizeHistory(s: BotSession): Turn[] {
  return (s.history ?? []).map(normalizeTurn);
}

/** כל הקישורים שבנצי נתן לאורך השיחה (route או url) — הליבה של החקירה */
function sessionLinks(turns: Turn[]): CtaButton[] {
  const seen = new Set<string>();
  const out: CtaButton[] = [];
  for (const t of turns) {
    if (t.role !== "bot") continue;
    for (const b of t.cta) {
      const key = b.route || b.url || "";
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(b);
    }
  }
  return out;
}

function sessionIntents(s: BotSession, turns: Turn[]): string[] {
  const set = new Set<string>();
  (s.intents_detected ?? []).forEach((i) => i && set.add(i));
  turns.forEach((t) => t.intent && set.add(t.intent));
  return [...set];
}

function sessionRefused(s: BotSession, turns: Turn[]): boolean {
  return s.refused_content === true || turns.some((t) => t.refused);
}

function linkHref(b: CtaButton): string {
  const r = b.route || b.url || "";
  if (!r) return SITE_ORIGIN;
  if (/^https?:\/\//i.test(r)) return r;
  return SITE_ORIGIN + (r.startsWith("/") ? r : `/${r}`);
}

function fmtTime(ts: string) {
  try { return new Date(ts).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }); } catch { return ts; }
}

// ─── רכיב: שבב-קישור לפתיחה חיה ───────────────────────────────────────
function LinkChip({ b }: { b: CtaButton }) {
  return (
    <a
      href={linkHref(b)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-display text-primary hover:bg-primary/10 transition-colors"
      title={linkHref(b)}
    >
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{b.label || b.route || b.url}</span>
      <span dir="ltr" className="text-[10px] text-primary/60">{b.route || b.url}</span>
    </a>
  );
}

export default function BenziConversations() {
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ["admin-bot-sessions"],
    queryFn: async (): Promise<BotSession[]> => {
      const { data, error } = await sessionsTable()
        .select("id, session_id, persona, history, intents_detected, links_clicked, refused_content, last_route, ip_country, user_agent, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as BotSession[];
    },
  });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<BotSession | null>(null);

  // נירמול מראש לכל השיחות (לחיפוש, לספירת-קישורים ולתצוגה)
  const rows = useMemo(() => {
    return (sessions ?? []).map((s) => {
      const turns = normalizeHistory(s);
      return {
        s,
        turns,
        links: sessionLinks(turns),
        intents: sessionIntents(s, turns),
        refused: sessionRefused(s, turns),
        firstUser: turns.find((t) => t.role === "user")?.text || "(ריק)",
      };
    });
  }, [sessions]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.turns.some((t) => t.text.toLowerCase().includes(q)) ||
      r.links.some((b) => (b.label || "").toLowerCase().includes(q) || (b.route || b.url || "").toLowerCase().includes(q)) ||
      r.intents.some((i) => i.toLowerCase().includes(q))
    );
  });

  const openTurns = open ? normalizeHistory(open) : [];
  const openLinks = open ? sessionLinks(openTurns) : [];
  const openIntents = open ? sessionIntents(open, openTurns) : [];

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
              כל שיחה עם הבוט נשמרת כאן — מה שאלו, מה בנצי ענה, ובעיקר לאילו קישורים הוא הפנה אנשים.
            </p>
          </div>
          <Input
            placeholder="חיפוש בתוכן, בקישורים ובכוונות…"
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
                    <TableHead className="text-right">קישורים שנשלחו</TableHead>
                    <TableHead className="text-right">דף אחרון</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.s.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {fmtTime(r.s.updated_at)}
                        {r.refused && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-destructive mt-0.5" title="בנצי סירב לתת תוכן בשיחה זו">
                            <ShieldAlert className="h-3 w-3" /> סירוב
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">{r.firstUser.slice(0, 80)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.turns.length}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {r.links.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-primary" title={r.links.map((b) => b.route || b.url).join(", ")}>
                            <Link2 className="h-3.5 w-3.5" />
                            {r.links.length === 1 ? (
                              <span dir="ltr" className="truncate">{r.links[0].route || r.links[0].url}</span>
                            ) : (
                              <span>{r.links.length} קישורים</span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground" dir="ltr">{r.s.last_route || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setOpen(r.s)} aria-label="צפייה בשיחה">
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
        <DialogContent dir="rtl" className="max-w-xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>שיחה · {open ? fmtTime(open.updated_at) : ""}</DialogTitle>
          </DialogHeader>

          {/* פס-חקירה: קישורים שנשלחו + כוונות + סירוב + מדינה */}
          {open && (openLinks.length > 0 || openIntents.length > 0 || sessionRefused(open, openTurns)) && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 text-sm">
              {openLinks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Link2 className="h-3.5 w-3.5" /> קישורים שבנצי נתן ({openLinks.length}) — לחצו כדי לאמת
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {openLinks.map((b, i) => <LinkChip key={i} b={b} />)}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {openIntents.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> כוונה: {openIntents.join(", ")}
                  </span>
                )}
                {open.persona && <span>פרסונה: {open.persona}</span>}
                {open.ip_country && <span dir="ltr">{open.ip_country}</span>}
                {sessionRefused(open, openTurns) && (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <ShieldAlert className="h-3.5 w-3.5" /> בנצי סירב לתת תוכן
                  </span>
                )}
              </div>
            </div>
          )}

          {/* גוף השיחה */}
          <div className="space-y-2.5">
            {openTurns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                    t.role === "user"
                      ? "bg-secondary/70 text-foreground"
                      : "bg-primary/10 border border-primary/15 text-foreground"
                  }`}
                >
                  <div className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                    {t.role === "user" ? "גולש" : "בנצי"}
                  </div>
                  {t.text || <span className="italic text-muted-foreground">(הודעה ריקה)</span>}

                  {/* הקישורים שבנצי צירף להודעה הזו */}
                  {t.cta.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-primary/10">
                      {t.cta.map((b, j) => <LinkChip key={j} b={b} />)}
                    </div>
                  )}

                  {/* ההצעות שבנצי הציע (כפתורי-המשך) */}
                  {t.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.suggestions.map((sug, j) => (
                        <span key={j} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {sug}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {open?.last_route && (
              <p className="text-xs text-muted-foreground pt-2 text-center">
                דף אחרון בשיחה: <span dir="ltr">{open.last_route}</span>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
