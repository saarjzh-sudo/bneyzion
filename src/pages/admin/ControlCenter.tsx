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
import { Search, RotateCcw, Save, Lock, CheckCircle2 } from "lucide-react";

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
