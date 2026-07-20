/**
 * TopicCombobox — בורר נושא עם חיפוש (סינון בצד הלקוח — כל הנושאים בשליפה אחת).
 *
 * מחליף את ה-Select באשף ההעלאה שהיה ריק תמיד: השאילתה הישנה שלפה עמודת
 * title שלא קיימת בטבלת topics (העמודה היא name) ונכשלה בשקט.
 *
 * 10.7.2026 (הוראת סער, "נושאים"): נוספה יצירת נושא inline — "נושא חדש +" —
 * כדי שאפשר יהיה לתייג שיעור בלי לעזוב לפאנל הנושאים. הנושא נוצר תחת
 * themes-root (נושא תמטי, כמו כל הנושאים ברצועת הספרייה) עם slug בתבנית
 * הקיימת: theme-<שם-במקפים>.
 */
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X, Plus, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTopicsForPicker } from "@/hooks/useAdminContent";

interface TopicComboboxProps {
  /** topic id או "" (מצב בחירה-יחידה) */
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** יצירת נושא חדש מתוך שורת החיפוש (ברירת מחדל: מופעל) */
  allowCreate?: boolean;
  /** יואב 19.7: מצב רב-בחירה — כשמועבר, value/onChange מוחלפים ב-values/onValuesChange */
  values?: string[];
  onValuesChange?: (ids: string[]) => void;
}

/** slug בתבנית הקיימת ב-DB: theme-<שם-במקפים> (למשל theme-דוד-המלך) */
function slugForTopic(name: string): string {
  const base = name
    .trim()
    .replace(/["'״׳]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `theme-${base}`;
}

export function TopicCombobox({
  value,
  onChange,
  placeholder = "בחר נושא (אופציונלי)",
  allowCreate = true,
  values,
  onValuesChange,
}: TopicComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { data: topics, isLoading } = useTopicsForPicker();
  const qc = useQueryClient();

  const multi = values !== undefined;
  const selectedIds = multi ? values! : value ? [value] : [];
  const isSelected = (id: string) => selectedIds.includes(id);
  const toggle = (id: string) => {
    if (!multi) { onChange(id); setOpen(false); setTerm(""); return; }
    onValuesChange?.(isSelected(id) ? selectedIds.filter(v => v !== id) : [...selectedIds, id]);
  };

  const byId = useMemo(() => new Map((topics ?? []).map(t => [t.id, t])), [topics]);
  const current = value ? byId.get(value) : undefined;

  // הבורר מציע רק נושאים תמטיים אמיתיים — צאצאי שורשי-הנושאים.
  // טבלת topics מכילה גם מאות צמתי-פרקים מהייבוא ("אדוניהו והמלכת שלמה | פרק א'")
  // שאינם נושאים לשיוך (יואב 20.7: "קטגוריות לא קשורות ברשימת הנושאים").
  // byId נשאר על הרשימה המלאה — כדי ששמות של שיוכים ישנים עדיין יוצגו.
  const themeTopics = useMemo(() => {
    const list = topics ?? [];
    const rootIds = new Set(
      list.filter(t => t.slug === "themes-root" || t.slug === "biblical-themes-root").map(t => t.id),
    );
    if (rootIds.size === 0) return list; // fallback — בלי שורשים אין ממה לסנן
    const underRoot = (t: (typeof list)[number]) => {
      let cur: (typeof list)[number] | undefined = t;
      for (let i = 0; i < 6 && cur; i++) {
        if (!cur.parent_id) return false;
        if (rootIds.has(cur.parent_id)) return true;
        cur = byId.get(cur.parent_id);
      }
      return false;
    };
    return list.filter(t => !t.is_learning_style && !rootIds.has(t.id) && underRoot(t));
  }, [topics, byId]);

  const filtered = useMemo(() => {
    const q = term.trim();
    if (!q) return themeTopics.slice(0, 60);
    return themeTopics.filter(t => t.name.includes(q)).slice(0, 60);
  }, [themeTopics, term]);

  const parentName = (parentId: string | null) =>
    parentId ? byId.get(parentId)?.name ?? null : null;

  const trimmedTerm = term.trim();
  const exactExists = (topics ?? []).some(t => t.name === trimmedTerm);

  const createTopic = useMutation({
    mutationFn: async (name: string) => {
      // נושא חדש = נושא תמטי → תחת themes-root (אם קיים; אחרת ללא אב)
      const { data: parent } = await supabase
        .from("topics")
        .select("id")
        .eq("slug", "themes-root")
        .limit(1);
      const parentId = parent?.[0]?.id ?? null;
      const { data, error } = await supabase
        .from("topics")
        .insert([{ name, slug: slugForTopic(name), parent_id: parentId } as any])
        .select("id, name, parent_id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-topics-picker"] });
      qc.invalidateQueries({ queryKey: ["topics"] });
      qc.invalidateQueries({ queryKey: ["topics-themes-only"] });
      toast.success(`הנושא "${data.name}" נוצר ונבחר`);
      if (multi) {
        onValuesChange?.([...selectedIds, data.id]);
      } else {
        onChange(data.id);
        setOpen(false);
      }
      setTerm("");
    },
    onError: (e: Error) => {
      toast.error(`יצירת הנושא נכשלה: ${e.message}`);
    },
  });

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setTerm(""); }} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {multi
              ? (selectedIds.length > 0
                  ? selectedIds.map(id => byId.get(id)?.name).filter(Boolean).join(" · ")
                  : <span className="text-muted-foreground">{placeholder}</span>)
              : current
                ? current.name
                : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
        dir="rtl"
      >
        <Command shouldFilter={false} dir="rtl">
          <CommandInput placeholder="חיפוש נושא..." value={term} onValueChange={setTerm} />
          <CommandList className="max-h-64">
            <CommandEmpty>
              {isLoading ? "טוען..." : allowCreate ? "לא נמצאו נושאים — אפשר ליצור חדש למטה" : "לא נמצאו נושאים"}
            </CommandEmpty>
            <CommandGroup>
              {selectedIds.length > 0 && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    if (multi) { onValuesChange?.([]); }
                    else { onChange(""); setOpen(false); }
                    setTerm("");
                  }}
                >
                  <X className="h-3.5 w-3.5 ml-2 opacity-60" />
                  {multi ? "נקה בחירה" : "ללא נושא"}
                </CommandItem>
              )}
              {filtered.map(t => {
                const parent = parentName(t.parent_id);
                return (
                  <CommandItem
                    key={t.id}
                    value={t.id}
                    onSelect={() => toggle(t.id)}
                  >
                    <Check className={`h-3.5 w-3.5 ml-2 shrink-0 ${isSelected(t.id) ? "opacity-100" : "opacity-0"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{t.name}</div>
                      {parent && (
                        <div className="text-xs text-muted-foreground truncate">{parent}</div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
              {/* נושא חדש + — יצירה inline מתוך שורת החיפוש */}
              {allowCreate && trimmedTerm.length >= 2 && !exactExists && (
                <CommandItem
                  value="__create__"
                  disabled={createTopic.isPending}
                  onSelect={() => createTopic.mutate(trimmedTerm)}
                  className="text-primary"
                >
                  {createTopic.isPending
                    ? <Loader2 className="h-3.5 w-3.5 ml-2 animate-spin" />
                    : <Plus className="h-3.5 w-3.5 ml-2" />}
                  <span className="text-sm">
                    נושא חדש: "{trimmedTerm}"
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
