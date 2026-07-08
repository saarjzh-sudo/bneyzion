/**
 * SeriesCombobox — בורר סדרה עם חיפוש בצד השרת.
 *
 * מחליף את ה-Select השטוח בדיאלוגי האדמין, שהציג 1,000 שורות לא-מסוננות
 * (כולל קטגוריות-עץ, טיוטות-מיגרציה וארכיון) ונחתך בתקרת ה-1000 —
 * סדרות ותיקות בכלל לא הופיעו בו. כאן: חיפוש שרת, ברירת מחדל בלי
 * קטגוריות/ארכיון, והערך הנוכחי של הרשומה תמיד מוצג.
 */
import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useDebouncedValue, useSeriesPickerSearch } from "@/hooks/useAdminContent";

const STATUS_LABEL: Record<string, string> = {
  active: "פעילה",
  published: "פורסמה",
  draft: "טיוטה",
  pending_review: "ממתין לאישור",
  category: "קטגוריה",
  completed: "הושלמה",
  archived: "בארכיון",
};

interface SeriesComboboxProps {
  /** series id או "" */
  value: string;
  onChange: (id: string) => void;
  /** לבחירת סדרת-אב מציגים גם קטגוריות-עץ */
  includeCategories?: boolean;
  placeholder?: string;
  clearLabel?: string;
  /** בעריכת סדרה — לא להציע אותה כאב של עצמה */
  excludeId?: string;
}

export function SeriesCombobox({
  value, onChange, includeCategories, placeholder = "בחר סדרה",
  clearLabel = "ללא סדרה", excludeId,
}: SeriesComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 300);
  const { data: options, isLoading } = useSeriesPickerSearch({
    term: debounced,
    includeId: value || undefined,
    includeCategories,
  });

  const rows = (options ?? []).filter(o => o.id !== excludeId);
  const current = rows.find(o => o.id === value);

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
            {value
              ? (current ? current.title : <Loader2 className="h-3.5 w-3.5 animate-spin" />)
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
          <CommandInput
            placeholder="חיפוש סדרה לפי שם..."
            value={term}
            onValueChange={setTerm}
          />
          <CommandList className="max-h-64">
            <CommandEmpty>{isLoading ? "טוען..." : "לא נמצאו סדרות"}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(""); setOpen(false); setTerm(""); }}
                >
                  <X className="h-3.5 w-3.5 ml-2 opacity-60" />
                  {clearLabel}
                </CommandItem>
              )}
              {rows.map(o => (
                <CommandItem
                  key={o.id}
                  value={o.id}
                  onSelect={() => { onChange(o.id); setOpen(false); setTerm(""); }}
                >
                  <Check className={`h-3.5 w-3.5 ml-2 shrink-0 ${o.id === value ? "opacity-100" : "opacity-0"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{o.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[
                        o.parent?.title,
                        STATUS_LABEL[o.status] ?? o.status,
                        typeof o.lesson_count === "number" ? `${o.lesson_count} שיעורים` : null,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
