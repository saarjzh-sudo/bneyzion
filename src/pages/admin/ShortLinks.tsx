/**
 * /admin/short-links — קישורים מקוצרים (יואב 22.7).
 *
 * "שכשאנחנו רוצים לשלוח בקהילה/למישהו פרטי קישור לעמוד — הוא לא יהיה ארוך
 *  ומסורבל, אלא קישור מקוצר עם הדומיין של בני ציון ועוד כמה אותיות."
 *
 * מדביקים כל קישור מהאתר (או נתיב), אופציונלית בוחרים קוד ידני, ומקבלים
 * bneyzion.co.il/s/<code> עם העתקה בלחיצה וספירת קליקים.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, Copy, Trash2, MousePointerClick, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // בלי i/l/o/0/1 המתבלבלים

function randomCode(len = 5): string {
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => CODE_CHARS[n % CODE_CHARS.length]).join("");
}

/** קלט חופשי → נתיב פנימי: קישור מלא מהאתר נחתך לנתיב, נתיב נשאר כמו שהוא. */
function normalizeTarget(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      const isOurs = /bneyzion|localhost/.test(u.hostname);
      return isOurs ? u.pathname + u.search + u.hash : t; // חיצוני נשמר מלא
    }
  } catch { /* not a URL */ }
  return t.startsWith("/") ? t : `/${t}`;
}

interface ShortLink {
  code: string;
  target_path: string;
  label: string | null;
  clicks: number;
  created_at: string;
}

export default function ShortLinks() {
  const queryClient = useQueryClient();
  const [targetInput, setTargetInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [labelInput, setLabelInput] = useState("");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["admin-short-links"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("short_links")
        .select("code, target_path, label, clicks, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShortLink[];
    },
  });

  const createLink = useMutation({
    mutationFn: async () => {
      const target = normalizeTarget(targetInput);
      if (!target) throw new Error("צריך להדביק קישור או נתיב");
      const code = codeInput.trim() || randomCode();
      if (!/^[A-Za-z0-9_-]{2,32}$/.test(code)) {
        throw new Error("קוד ידני: אותיות באנגלית/ספרות/מקף בלבד (2-32 תווים)");
      }
      const { error } = await (supabase as any).from("short_links").insert({
        code,
        target_path: target,
        label: labelInput.trim() || null,
      });
      if (error) {
        if (String(error.code) === "23505") throw new Error(`הקוד "${code}" כבר תפוס — בחר קוד אחר`);
        throw error;
      }
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ["admin-short-links"] });
      setTargetInput(""); setCodeInput(""); setLabelInput("");
      copyToClipboard(code);
      toast.success("הקישור נוצר והועתק ללוח 🎉");
    },
    onError: (e: any) => toast.error(e.message || "שגיאה ביצירת הקישור"),
  });

  const deleteLink = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await (supabase as any).from("short_links").delete().eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-short-links"] });
      toast.success("הקישור נמחק");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function shortUrl(code: string) {
    return `${window.location.origin}/s/${code}`;
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(shortUrl(code)).then(
      () => toast.success("הקישור הועתק ללוח"),
      () => toast.error("ההעתקה נכשלה"),
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Link2 className="h-7 w-7 text-primary" />
            קישורים מקוצרים
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            מדביקים קישור לכל עמוד באתר — מוצר, קורס, שיעור — ומקבלים קישור קצר לשליחה בקהילה
          </p>
        </div>

        {/* יצירה */}
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">קישור או נתיב באתר <span className="text-destructive">*</span></label>
              <Input
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="הדבק קישור מלא מהאתר, למשל: https://bneyzion.co.il/store/..."
                dir="ltr"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">קוד ידני (רשות)</label>
              <Input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="ריק = קוד אוטומטי"
                dir="ltr"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">תיאור (רשות)</label>
              <Input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder='למשל: "קורס איך לומדים תנ״ך"'
                className="h-11"
              />
            </div>
            <Button
              size="lg"
              className="gap-2 h-11"
              onClick={() => createLink.mutate()}
              disabled={!targetInput.trim() || createLink.isPending}
            >
              <Plus className="h-4 w-4" />
              {createLink.isPending ? "יוצר..." : "צור קישור"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            הקישור שנוצר: <span dir="ltr" className="font-mono">{window.location.origin}/s/xxxxx</span> — נוצר, מועתק ללוח, ומוכן לשליחה.
          </p>
        </div>

        {/* רשימה */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl border border-border/50 bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 py-14 text-center">
            <Link2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-muted-foreground/70 font-medium">עוד אין קישורים מקוצרים</p>
            <p className="text-sm text-muted-foreground/50 mt-1">הדבק למעלה קישור לעמוד באתר וצור את הראשון</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
            {links.map((l) => (
              <div key={l.code} className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/30 last:border-b-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(l.code)}
                  title="העתקת הקישור המקוצר"
                  className="font-mono text-sm font-bold text-primary hover:underline shrink-0"
                  dir="ltr"
                >
                  /s/{l.code}
                </button>
                <div className="flex-1 min-w-0">
                  {l.label && <p className="text-sm font-medium truncate">{l.label}</p>}
                  <p className="text-xs text-muted-foreground/70 truncate" dir="ltr">{l.target_path}</p>
                </div>
                <Badge variant="outline" className="text-[10px] gap-1 shrink-0 border-border/60 text-muted-foreground">
                  <MousePointerClick className="h-3 w-3" />
                  {l.clicks} קליקים
                </Badge>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="העתקה" onClick={() => copyToClipboard(l.code)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="פתיחת היעד">
                    <a href={l.target_path.startsWith("http") ? l.target_path : l.target_path} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="מחיקה"
                    onClick={() => { if (confirm(`למחוק את הקישור /s/${l.code}? מי שקיבל אותו יגיע לעמוד הבית.`)) deleteLink.mutate(l.code); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
