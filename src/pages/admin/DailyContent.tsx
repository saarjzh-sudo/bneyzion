/**
 * DailyContent (admin) — ניהול הפסוק היומי + חדשות התנ"ך.
 *
 * 8.7.2026 (סער): טאב "סרטון יומי" הוחלף ב"חדשות התנ״ך" — ניהול טורי החדשות
 * של הרב יואב (שיעורים בסדרת "חדשות תנכיות"). הטורים נקלטים אוטומטית
 * מקבוצת הוואטסאפ פעמיים ביום (launchd daily_content_sync), וכאן עורכים,
 * מפרסמים ומוסיפים ידנית — עם עורך התוכן המלא.
 *
 *   • daily_verses — פסוק יומי (טקסט, מקור, פרשנות, תמונה) לפי תאריך
 *   • lessons בסדרה NEWS_SERIES_ID — טורי חדשות התנ"ך
 */
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookMarked, Newspaper, Pencil, Plus, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { toast } from "sonner";

const versesTable = () => (supabase as any).from("daily_verses");

/** סדרת "חדשות תנכיות" + הרב יואב — הזהויות שהסנכרון האוטומטי כותב אליהן */
const NEWS_SERIES_ID = "5d111b52-b421-4150-adfd-df256950117c";
const NEWS_RABBI_ID = "acd34d0f-1288-47b8-9e8e-38e69599c294"; // הרב יואב אוריאל — אומת מול ה-DB

interface Verse {
  id: string;
  date: string | null;
  verse_text: string | null;
  verse_source: string | null;
  commentary: string | null;
  image_url: string | null;
}

interface NewsItem {
  id: string;
  title: string;
  content: string | null;
  thumbnail_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

function fmt(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("he-IL"); } catch { return d; }
}

/* ── Verse editor ── */
function VerseDialog({ row, onClose }: { row: Verse; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Verse>(row);
  const save = useMutation({
    mutationFn: async () => {
      const { id, ...rest } = f;
      const err = id
        ? (await versesTable().update(rest).eq("id", id)).error
        : (await versesTable().insert(rest)).error;
      if (err) throw err;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-daily-verses"] }); toast.success("הפסוק נשמר"); onClose(); },
    onError: (e: Error) => toast.error(e.message || "השמירה נכשלה"),
  });
  const set = (k: keyof Verse, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "עריכת פסוק יומי" : "פסוק יומי חדש"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {f.image_url && <img src={f.image_url} alt="" className="w-full h-36 object-cover rounded-lg border border-border/60" />}
          <div className="space-y-1.5"><Label>תאריך</Label><Input type="date" dir="ltr" value={f.date ?? ""} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>הפסוק</Label><Textarea rows={2} value={f.verse_text ?? ""} onChange={(e) => set("verse_text", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>מקור</Label><Input value={f.verse_source ?? ""} onChange={(e) => set("verse_source", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>פרשנות</Label><Textarea rows={3} value={f.commentary ?? ""} onChange={(e) => set("commentary", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>קישור תמונה</Label><Input dir="ltr" value={f.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>ביטול</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "שומר…" : "שמירה"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── News column editor — עם עורך התוכן המלא ── */
function NewsDialog({ row, onClose }: { row: NewsItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<NewsItem>(row);
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: f.title.trim(),
        content: f.content || null,
        thumbnail_url: f.thumbnail_url || null,
        status: f.status,
        published_at: f.status === "published" ? (f.published_at ?? new Date().toISOString()) : f.published_at,
        updated_at: new Date().toISOString(),
      };
      if (!payload.title) throw new Error("חסרה כותרת לטור");
      if (f.id) {
        const { error } = await supabase.from("lessons").update(payload as any).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert({
          ...payload,
          series_id: NEWS_SERIES_ID,
          rabbi_id: NEWS_RABBI_ID,
          source_type: "text",
          audience_tags: ["general"],
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tanach-news"] }); toast.success("הטור נשמר"); onClose(); },
    onError: (e: Error) => toast.error(e.message || "השמירה נכשלה"),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "עריכת טור חדשות" : "טור חדשות חדש"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>כותרת *</Label><Input value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} /></div>
          <div className="space-y-1.5">
            <Label>תוכן הטור</Label>
            <RichTextEditor
              value={f.content ?? ""}
              onChange={(html) => setF((p) => ({ ...p, content: html }))}
              placeholder="גוף הטור… אפשר לגרור לכאן תמונה והיא תשתבץ"
              minHeight={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>תמונת הטור</Label>
            {f.thumbnail_url && <img src={f.thumbnail_url} alt="" className="w-full h-36 object-cover rounded-lg border border-border/60" />}
            <Input dir="ltr" placeholder="https://…" value={f.thumbnail_url ?? ""} onChange={(e) => setF((p) => ({ ...p, thumbnail_url: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <Label htmlFor="news-published" className="font-normal">מפורסם באתר (מופיע ב"חדשות התנ״ך")</Label>
            <Switch
              id="news-published"
              checked={f.status === "published"}
              onCheckedChange={(v) => setF((p) => ({ ...p, status: v ? "published" : "draft" }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>ביטול</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "שומר…" : "שמירה"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_VERSE: Verse = { id: "", date: null, verse_text: "", verse_source: "", commentary: "", image_url: "" };
const EMPTY_NEWS: NewsItem = { id: "", title: "", content: "", thumbnail_url: "", status: "published", published_at: null, created_at: "" };

export default function DailyContent() {
  const qc = useQueryClient();

  const verses = useQuery({
    queryKey: ["admin-daily-verses"],
    queryFn: async (): Promise<Verse[]> => {
      const { data, error } = await versesTable()
        .select("id, date, verse_text, verse_source, commentary, image_url")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Verse[];
    },
  });

  const news = useQuery({
    queryKey: ["admin-tanach-news"],
    queryFn: async (): Promise<NewsItem[]> => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, content, thumbnail_url, status, published_at, created_at")
        .eq("series_id", NEWS_SERIES_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsItem[];
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase
        .from("lessons")
        .update({ status: publish ? "published" : "draft", updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tanach-news"] }),
    onError: () => toast.error("עדכון הסטטוס נכשל"),
  });

  const [editVerse, setEditVerse] = useState<Verse | null>(null);
  const [editNews, setEditNews] = useState<NewsItem | null>(null);

  return (
    <AdminLayout>
      <div dir="rtl" className="space-y-6">
        <div>
          <h1 className="text-2xl font-display text-foreground flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary" aria-hidden="true" />
            תוכן יומי
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            הפסוק היומי וחדשות התנ״ך. שניהם נקלטים אוטומטית מהוואטסאפ פעמיים ביום — כאן עורכים ומשלימים ידנית.
          </p>
        </div>

        <Tabs defaultValue="verses">
          <TabsList>
            <TabsTrigger value="verses"><BookMarked className="h-4 w-4 ml-1" aria-hidden="true" />פסוק יומי</TabsTrigger>
            <TabsTrigger value="news"><Newspaper className="h-4 w-4 ml-1" aria-hidden="true" />חדשות התנ״ך</TabsTrigger>
          </TabsList>

          <TabsContent value="verses">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">פסוקים {verses.data ? `(${verses.data.length})` : ""}</CardTitle>
                <Button size="sm" className="gap-1.5" onClick={() => setEditVerse(EMPTY_VERSE)}><Plus className="h-4 w-4" aria-hidden="true" />חדש</Button>
              </CardHeader>
              <CardContent>
                {verses.isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">פסוק</TableHead>
                      <TableHead className="text-right">מקור</TableHead>
                      <TableHead className="text-right">תמונה</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {verses.data?.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="whitespace-nowrap text-sm">{fmt(v.date)}</TableCell>
                          <TableCell className="max-w-[320px] truncate">{v.verse_text}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{v.verse_source}</TableCell>
                          <TableCell>{v.image_url ? <img src={v.image_url} alt="" className="h-9 w-14 object-cover rounded" /> : <span className="text-xs text-muted-foreground">חסר</span>}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => setEditVerse(v)} aria-label="עריכה"><Pencil className="h-4 w-4" aria-hidden="true" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  טורי חדשות {news.data ? `(${news.data.length})` : ""}
                  <a href="/tanach-news" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline">
                    לדף באתר <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </CardTitle>
                <Button size="sm" className="gap-1.5" onClick={() => setEditNews(EMPTY_NEWS)}><Plus className="h-4 w-4" aria-hidden="true" />טור חדש</Button>
              </CardHeader>
              <CardContent>
                {news.isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">כותרת</TableHead>
                      <TableHead className="text-right">תמונה</TableHead>
                      <TableHead className="text-right">מפורסם</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {news.data?.map((n) => (
                        <TableRow key={n.id} style={{ opacity: n.status === "published" ? 1 : 0.55 }}>
                          <TableCell className="whitespace-nowrap text-sm">{fmt(n.published_at ?? n.created_at)}</TableCell>
                          <TableCell className="max-w-[300px] truncate font-medium">{n.title}</TableCell>
                          <TableCell>{n.thumbnail_url ? <img src={n.thumbnail_url} alt="" className="h-9 w-14 object-cover rounded" /> : <span className="text-xs text-muted-foreground">חסר</span>}</TableCell>
                          <TableCell>
                            <Switch
                              checked={n.status === "published"}
                              onCheckedChange={(v) => togglePublish.mutate({ id: n.id, publish: v })}
                              aria-label={`פרסום ${n.title}`}
                            />
                          </TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => setEditNews(n)} aria-label="עריכה"><Pencil className="h-4 w-4" aria-hidden="true" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {editVerse && <VerseDialog row={editVerse} onClose={() => setEditVerse(null)} />}
      {editNews && <NewsDialog row={editNews} onClose={() => setEditNews(null)} />}
    </AdminLayout>
  );
}
