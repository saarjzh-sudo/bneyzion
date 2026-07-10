/**
 * ControlCenter — /admin/control-center (רמה 13, בקשת סער 9.7 + לחץ הרב יואב)
 *
 * "מרכז שליטה" לנוסחים ולתמונות של האתר: כל שדה במרשם siteCopyRegistry נערך
 * כאן ונשמר ב-site_settings; הקומפוננטות החיות קוראות דרך useSiteCopy עם
 * fallback לנוסח המקודד. "איפוס" מוחק את ה-override ומחזיר את המקור.
 *
 * הרשאות:
 * - שדות sensitive (הנצחה וכד') — עריכה רק ל-SUPER_ADMIN_EMAILS (סער).
 * - בצד ה-DB: RLS מתיר לאדמינים לכתוב רק מפתחות copy./image./memorial_/print_/
 *   homepage_ — גם admin לא נוגע במפתח אחר (fail-closed).
 *
 * החיפוש למעלה = איתור מהיר של הנוסח הנכון ("שנה את הכותרת בדף הבית") —
 * דטרמיניסטי, בלי LLM. שכבת בקשה-חופשית-ב-AI תתווסף כשסער יקבע רמת הרשאה.
 */
import { useMemo, useState } from "react";
import { Search, RotateCcw, Save, Lock, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAllSiteSettings,
  useUpdateSiteSetting,
  useDeleteSiteSetting,
} from "@/hooks/useSiteSettings";
import {
  SITE_COPY_REGISTRY,
  COPY_GROUPS,
  SUPER_ADMIN_EMAILS,
  type CopyField,
} from "@/config/siteCopyRegistry";
import { NAV_ITEMS, type NavItem } from "@/config/navigation";
import { NAV_ITEMS_KEY, parseNavItems } from "@/hooks/useNavItems";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";

function FieldRow({
  field,
  currentValue,
  hasOverride,
  canEdit,
}: {
  field: CopyField;
  currentValue: string;
  hasOverride: boolean;
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const update = useUpdateSiteSetting();
  const del = useDeleteSiteSetting();

  const value = draft ?? currentValue;
  const dirty = draft != null && draft !== currentValue;

  const save = () => {
    if (!dirty) return;
    update.mutate(
      { key: field.key, value: draft! },
      {
        onSuccess: () => {
          toast.success(`"${field.label}" נשמר — האתר מציג את הנוסח החדש`);
          setDraft(null);
        },
        onError: (e: any) => toast.error(`השמירה נכשלה: ${e.message ?? e}`),
      },
    );
  };

  const reset = () => {
    del.mutate(field.key, {
      onSuccess: () => {
        toast.success(`"${field.label}" חזר לנוסח המקורי`);
        setDraft(null);
      },
      onError: (e: any) => toast.error(`האיפוס נכשל: ${e.message ?? e}`),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{field.label}</span>
          {field.sensitive && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              <Lock className="h-3 w-3" /> רק סער
            </Badge>
          )}
          {hasOverride && (
            <Badge variant="outline" className="gap-1 text-[11px] text-primary border-primary/40">
              <CheckCircle2 className="h-3 w-3" /> נערך
            </Badge>
          )}
        </div>
        <code className="text-[10px] text-muted-foreground" dir="ltr">{field.key}</code>
      </div>
      {field.hint && <p className="text-xs text-muted-foreground mb-2">{field.hint}</p>}

      {field.type === "textarea" ? (
        <Textarea
          dir="rtl"
          value={value}
          disabled={!canEdit}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <Input dir="rtl" value={value} disabled={!canEdit} onChange={(e) => setDraft(e.target.value)} />
      )}

      {canEdit ? (
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" onClick={save} disabled={!dirty || update.isPending} className="gap-1">
            <Save className="h-3.5 w-3.5" /> שמירה
          </Button>
          {hasOverride && (
            <Button size="sm" variant="outline" onClick={reset} disabled={del.isPending} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> חזרה לנוסח המקורי
            </Button>
          )}
          {dirty && (
            <span className="text-xs text-muted-foreground">שינוי לא שמור</span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-2">שדה זה נערך רק על ידי סער.</p>
      )}
    </div>
  );
}

interface AiSuggestion {
  key: string | null;
  label?: string;
  current?: string;
  new_value?: string;
  explanation?: string;
  sensitive?: boolean;
}

/**
 * (אישור סער 10.7) בקשה חופשית — "תשנה את הכותרת של החנות ל..." —
 * edge copy-assistant (אדמין-בלבד, Gemini) מציע שדה+נוסח; ההחלה תמיד ידנית
 * בכפתור אישור, דרך אותו מסלול RLS של עריכה רגילה. שום apply אוטומטי.
 */
function AiRequestBox({
  overrides,
  isSuperAdmin,
}: {
  overrides: Map<string, string>;
  isSuperAdmin: boolean;
}) {
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const update = useUpdateSiteSetting();

  const ask = async () => {
    if (!request.trim() || busy) return;
    setBusy(true);
    setSuggestion(null);
    try {
      const registry = SITE_COPY_REGISTRY.map((f) => ({
        key: f.key,
        label: f.label,
        group: f.group,
        hint: f.hint,
        sensitive: f.sensitive,
        current: overrides.get(f.key) ?? f.defaultValue,
      }));
      const { data, error } = await supabase.functions.invoke("copy-assistant", {
        body: { message: request.trim(), registry },
      });
      if (error) throw error;
      setSuggestion(data as AiSuggestion);
    } catch (e: any) {
      toast.error(`הבקשה נכשלה: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const canApply =
    suggestion?.key &&
    suggestion.new_value &&
    (!suggestion.sensitive || isSuperAdmin) &&
    SITE_COPY_REGISTRY.some((f) => f.key === suggestion.key);

  const apply = () => {
    if (!canApply) return;
    update.mutate(
      { key: suggestion!.key!, value: suggestion!.new_value! },
      {
        onSuccess: () => {
          toast.success(`"${suggestion!.label}" עודכן — האתר מציג את הנוסח החדש`);
          setSuggestion(null);
          setRequest("");
        },
        onError: (e: any) => toast.error(`ההחלה נכשלה: ${e.message ?? e}`),
      },
    );
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">בקשה חופשית</span>
        <span className="text-xs text-muted-foreground">
          — כותבים מה לשנות, מקבלים הצעה, מאשרים ביד
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          dir="rtl"
          placeholder='למשל: "תשנה את כותרת החנות — זה לא רק ספרי תנ״ך"'
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          disabled={busy}
        />
        <Button onClick={ask} disabled={busy || !request.trim()} className="gap-1 shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          הצע
        </Button>
      </div>

      {suggestion && !suggestion.key && (
        <p className="text-sm text-muted-foreground mt-3">{suggestion.explanation}</p>
      )}

      {suggestion?.key && (
        <div className="mt-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline">{suggestion.label}</Badge>
            {suggestion.sensitive && (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <Lock className="h-3 w-3" /> רק סער
              </Badge>
            )}
          </div>
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block mb-0.5">לפני:</span>
              <p className="line-through opacity-60">{suggestion.current}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-0.5">אחרי:</span>
              <p className="font-medium">{suggestion.new_value}</p>
            </div>
            {suggestion.explanation && (
              <p className="text-xs text-muted-foreground">{suggestion.explanation}</p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={apply} disabled={!canApply || update.isPending} className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> אישור והחלה
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSuggestion(null)}>
              ביטול
            </Button>
            {suggestion.sensitive && !isSuperAdmin && (
              <span className="text-xs text-muted-foreground">שדה זה נערך רק על ידי סער.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * (אישור סער 10.7) עורך התפריט הראשי — כותב JSON למפתח copy.nav.items;
 * ההדר ומגירת-המובייל קוראים דרך useNavItems עם ולידציה fail-closed.
 */
function MenuEditor({ overrides }: { overrides: Map<string, string> }) {
  const saved = overrides.get(NAV_ITEMS_KEY);
  const effective = (saved && parseNavItems(saved)) || NAV_ITEMS;
  const [items, setItems] = useState<NavItem[] | null>(null);
  const update = useUpdateSiteSetting();
  const del = useDeleteSiteSetting();

  const list = items ?? effective;
  const dirty = items != null && JSON.stringify(items) !== JSON.stringify(effective);

  const setAt = (i: number, patch: Partial<NavItem>) => {
    const next = list.map((it, j) => (j === i ? { ...it, ...patch } : it));
    setItems(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const remove = (i: number) => setItems(list.filter((_, j) => j !== i));
  const add = () => setItems([...list, { label: "", href: "/" }]);

  const valid = list.length > 0 && list.every(
    (it) => it.label.trim().length > 0 && it.label.length <= 30 &&
      (it.href.startsWith("/") || it.href.startsWith("https://")),
  );

  const save = () => {
    if (!valid || !dirty) return;
    update.mutate(
      { key: NAV_ITEMS_KEY, value: JSON.stringify(list.map((i) => ({ label: i.label.trim(), href: i.href.trim() }))) },
      {
        onSuccess: () => { toast.success("התפריט נשמר — חי באתר"); setItems(null); },
        onError: (e: any) => toast.error(`השמירה נכשלה: ${e.message ?? e}`),
      },
    );
  };
  const reset = () => {
    del.mutate(NAV_ITEMS_KEY, {
      onSuccess: () => { toast.success("התפריט חזר לברירת המחדל"); setItems(null); },
      onError: (e: any) => toast.error(`האיפוס נכשל: ${e.message ?? e}`),
    });
  };

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-3 border-b border-border pb-1.5">התפריט הראשי</h2>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-3">
          הפריטים בתפריט העליון ובמגירת המובייל (מימין לשמאל). נתיב = כתובת בתוך האתר, למשל /store.
        </p>
        <div className="flex flex-col gap-2">
          {list.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input dir="rtl" className="flex-1" placeholder="תווית" value={it.label}
                onChange={(e) => setAt(i, { label: e.target.value })} />
              <Input dir="ltr" className="flex-1 font-mono text-xs" placeholder="/path" value={it.href}
                onChange={(e) => setAt(i, { href: e.target.value })} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label="העלאה">
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="הורדה">
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(i)} aria-label="הסרה">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button size="sm" variant="outline" onClick={add} disabled={list.length >= 12} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> פריט חדש
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || !valid || update.isPending} className="gap-1">
            <Save className="h-3.5 w-3.5" /> שמירת התפריט
          </Button>
          {overrides.has(NAV_ITEMS_KEY) && (
            <Button size="sm" variant="outline" onClick={reset} disabled={del.isPending} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> חזרה לברירת המחדל
            </Button>
          )}
          {!valid && <span className="text-xs text-destructive">תווית ריקה או נתיב לא תקין (חייב להתחיל ב-/)</span>}
        </div>
      </div>
    </section>
  );
}

export default function ControlCenter() {
  const { user } = useAuth();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user?.email ?? "");
  const { data: settings } = useAllSiteSettings();
  const [query, setQuery] = useState("");

  const overrides = useMemo(
    () => new Map((settings ?? []).map((s) => [s.key, s.value])),
    [settings],
  );

  const q = query.trim();
  const matches = (f: CopyField) => {
    if (!q) return true;
    const hay = `${f.label} ${f.group} ${f.hint ?? ""} ${f.defaultValue} ${overrides.get(f.key) ?? ""}`;
    return q.split(/\s+/).every((term) => hay.includes(term));
  };

  return (
    <AdminLayout>
      <div dir="rtl" className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">מרכז שליטה — נוסחים ותמונות</h1>
        <p className="text-sm text-muted-foreground mb-5">
          כל שינוי כאן חי באתר מיד אחרי שמירה. "חזרה לנוסח המקורי" מבטלת את השינוי.
        </p>

        <AiRequestBox overrides={overrides} isSuperAdmin={isSuperAdmin} />

        <MenuEditor overrides={overrides} />

        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            dir="rtl"
            className="pr-9"
            placeholder='חיפוש נוסח — למשל "כותרת דף הבית" או חלק מהטקסט עצמו'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {COPY_GROUPS.map((group) => {
          const fields = SITE_COPY_REGISTRY.filter((f) => f.group === group).filter(matches);
          if (fields.length === 0) return null;
          return (
            <section key={group} className="mb-8">
              <h2 className="text-lg font-bold mb-3 border-b border-border pb-1.5">{group}</h2>
              <div className="flex flex-col gap-3">
                {fields.map((f) => (
                  <FieldRow
                    key={f.key}
                    field={f}
                    currentValue={overrides.get(f.key) ?? f.defaultValue}
                    hasOverride={overrides.has(f.key)}
                    canEdit={!f.sensitive || isSuperAdmin}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {SITE_COPY_REGISTRY.filter(matches).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            לא נמצא נוסח שמתאים לחיפוש. אפשר לבקש מסער להוסיף את השדה למרשם.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
