import { useState } from "react";
import { Upload, FileText, Headphones, Video, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ContentUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [rabbiId, setRabbiId] = useState("");
  const [sourceType, setSourceType] = useState("article");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: seriesList } = useQuery({
    queryKey: ["admin-series-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("series")
        .select("id, title")
        .eq("status", "active")
        .order("title")
        .limit(500);
      return data ?? [];
    },
  });

  const { data: rabbisList } = useQuery({
    queryKey: ["admin-rabbis-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rabbis")
        .select("id, name")
        .eq("status", "active")
        .order("name")
        .limit(500);
      return data ?? [];
    },
  });

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("lesson-files").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("lesson-files").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const createLesson = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let audioUrl: string | null = null;
      let attachmentUrl: string | null = null;

      if (audioFile) {
        audioUrl = await uploadFile(audioFile, "audio");
      }
      if (pdfFile) {
        attachmentUrl = await uploadFile(pdfFile, "pdf");
      }

      const { error } = await supabase.from("lessons").insert({
        title,
        description: description || null,
        content: content || null,
        series_id: seriesId || null,
        rabbi_id: rabbiId || null,
        source_type: sourceType,
        audio_url: audioUrl,
        attachment_url: attachmentUrl,
        status: "published",
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "השיעור נוצר בהצלחה!" });
      setTitle("");
      setDescription("");
      setContent("");
      setSeriesId("");
      setRabbiId("");
      setAudioFile(null);
      setPdfFile(null);
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
    },
    onError: (err: any) => {
      setUploading(false);
      toast({ title: "שגיאה ביצירת השיעור", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "נא להזין כותרת", variant: "destructive" });
      return;
    }
    createLesson.mutate();
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-heading gradient-warm mb-6">העלאת תוכן חדש</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">כותרת *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת השיעור" required />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">סוג תוכן</label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="article"><div className="flex items-center gap-2"><FileText className="h-4 w-4" />מאמר</div></SelectItem>
                <SelectItem value="audio"><div className="flex items-center gap-2"><Headphones className="h-4 w-4" />שיעור שמע</div></SelectItem>
                <SelectItem value="video"><div className="flex items-center gap-2"><Video className="h-4 w-4" />וידאו</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Series */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">סדרה</label>
            <Select value={seriesId} onValueChange={setSeriesId}>
              <SelectTrigger><SelectValue placeholder="בחר סדרה (אופציונלי)" /></SelectTrigger>
              <SelectContent>
                {seriesList?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rabbi */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">רב</label>
            <Select value={rabbiId} onValueChange={setRabbiId}>
              <SelectTrigger><SelectValue placeholder="בחר רב (אופציונלי)" /></SelectTrigger>
              <SelectContent>
                {rabbisList?.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">תיאור</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="תיאור קצר של השיעור" rows={3} />
          </div>

          {/* Content (for articles) */}
          {sourceType === "article" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">תוכן המאמר</label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="תוכן מלא (HTML נתמך)" rows={10} className="font-mono text-sm" />
            </div>
          )}

          {/* Audio upload */}
          {sourceType === "audio" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">קובץ שמע</label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] ?? null)} className="hidden" id="audio-upload" />
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <Headphones className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{audioFile ? audioFile.name : "לחץ לבחירת קובץ שמע"}</p>
                </label>
              </div>
            </div>
          )}

          {/* PDF upload */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">קובץ PDF (אופציונלי)</label>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{pdfFile ? pdfFile.name : "לחץ לבחירת קובץ PDF"}</p>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={uploading || !title.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-display text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />מעלה...</>
            ) : (
              <><Upload className="h-4 w-4" />פרסם שיעור</>
            )}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default ContentUpload;
