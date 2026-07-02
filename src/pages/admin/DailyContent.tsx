/**
 * DailyContent (admin) — ניהול הפסוק היומי + הסרטון היומי.
 *
 * מנהל את הטבלאות שהעמודים הציבוריים קוראים מהן:
 *   • daily_verses — פסוק יומי (טקסט, מקור, פרשנות, תמונה) לפי תאריך
 *   • daily_videos — סרטון יומי (כותרת, תיאור, קישור, תמונה ממוזערת)
 * המדיה (image_url / video_url) יושבת ב-storage / קישור חיצוני; עורכים כאן.
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookMarked, Video, Pencil, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const versesTable = () => (supabase as any).from("daily_verses");
const videosTable = () => (supabase as any).from("daily_videos");

interface Verse {
  id: string;
  date: string | null;
  verse_text: string | null;
  verse_source: string | null;
  commentary: string | null;
  image_url: string | null;
}
interface Vid {
  id: string;
  date: string | null;
  title: string | null;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  topic: string | null;
}

function useDaily<T>(table: () => any, key: string, cols: string) {
  return useQuery({
    queryKey: [key],
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await table().select(cols).order("date", { ascending: false });
      if (error) throw error;
      return data as T[];
    },
  });
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

/* ── Video editor ── */
function VideoDialog({ row, onClose }: { row: Vid; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Vid>(row);
  const save = useMutation({
    mutationFn: async () => {
      const { id, ...rest } = f;
      const err = id
        ? (await videosTable().update(rest).eq("id", id)).error
        : (await videosTable().insert(rest)).error;
      if (err) throw err;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-daily-videos"] }); toast.success("הסרטון נשמר"); onClose(); },
    onError: (e: Error) => toast.error(e.message || "השמירה נכשלה"),
  });
  const set = (k: keyof Vid, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "עריכת סרטון יומי" : "סרטון יומי חדש"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {f.thumbnail_url && <img src={f.thumbnail_url} alt="" className="w-full h-36 object-cover rounded-lg border border-border/60" />}
          <div className="space-y-1.5"><Label>תאריך</Label><Input type="date" dir="ltr" value={f.date ?? ""} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>כותרת</Label><Input value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>תיאור</Label><Textarea rows={3} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>קישור וידאו</Label><Input dir="ltr" value={f.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>תמונה ממוזערת</Label><Input dir="ltr" value={f.thumbnail_url ?? ""} onChange={(e) => set("thumbnail_url", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>נושא</Label><Input value={f.topic ?? ""} onChange={(e) => set("topic", e.target.value)} /></div>
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
const EMPTY_VIDEO: Vid = { id: "", date: null, title: "", description: "", video_url: "", thumbnail_url: "", topic: "" };

export default function DailyContent() {
  const verses = useDaily<Verse>(versesTable, "admin-daily-verses", "id, date, verse_text, verse_source, commentary, image_url");
  const videos = useDaily<Vid>(videosTable, "admin-daily-videos", "id, date, title, description, video_url, thumbnail_url, topic");
  const [editVerse, setEditVerse] = useState<Verse | null>(null);
  const [editVideo, setEditVideo] = useState<Vid | null>(null);

  return (
    <AdminLayout>
      <div dir="rtl" className="space-y-6">
        <div>
          <h1 className="text-2xl font-display text-foreground flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary" aria-hidden="true" />
            תוכן יומי
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול הפסוק היומי והסרטון היומי, כולל המדיה. עדכון מופיע מיד באתר.</p>
        </div>

        <Tabs defaultValue="verses">
          <TabsList>
            <TabsTrigger value="verses"><BookMarked className="h-4 w-4 ml-1" aria-hidden="true" />פסוק יומי</TabsTrigger>
            <TabsTrigger value="videos"><Video className="h-4 w-4 ml-1" aria-hidden="true" />סרטון יומי</TabsTrigger>
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

          <TabsContent value="videos">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">סרטונים {videos.data ? `(${videos.data.length})` : ""}</CardTitle>
                <Button size="sm" className="gap-1.5" onClick={() => setEditVideo(EMPTY_VIDEO)}><Plus className="h-4 w-4" aria-hidden="true" />חדש</Button>
              </CardHeader>
              <CardContent>
                {videos.isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">טוען…</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">כותרת</TableHead>
                      <TableHead className="text-right">נושא</TableHead>
                      <TableHead className="text-right">תמונה</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {videos.data?.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="whitespace-nowrap text-sm">{fmt(v.date)}</TableCell>
                          <TableCell className="max-w-[280px] truncate font-medium">{v.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{v.topic}</TableCell>
                          <TableCell>{v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="h-9 w-14 object-cover rounded" /> : <span className="text-xs text-muted-foreground">חסר</span>}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => setEditVideo(v)} aria-label="עריכה"><Pencil className="h-4 w-4" aria-hidden="true" /></Button></TableCell>
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
      {editVideo && <VideoDialog row={editVideo} onClose={() => setEditVideo(null)} />}
    </AdminLayout>
  );
}
