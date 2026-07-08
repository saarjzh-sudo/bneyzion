/**
 * TopicCombobox — בורר נושא עם חיפוש (סינון בצד הלקוח — כל הנושאים בשליפה אחת).
 *
 * מחליף את ה-Select באשף ההעלאה שהיה ריק תמיד: השאילתה הישנה שלפה עמודת
 * title שלא קיימת בטבלת topics (העמודה היא name) ונכשלה בשקט.
 */
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useTopicsForPicker } from "@/hooks/useAdminContent";

interface TopicComboboxProps {
  /** topic id או "" */
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

export function TopicCombobox({ value, onChange, placeholder = "בחר נושא (אופציונלי)" }: TopicComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { data: topics, isLoading } = useTopicsForPicker();

  const byId = useMemo(() => new Map((topics ?? []).map(t => [t.id, t])), [topics]);
  const current = value ? byId.get(value) : undefined;

  const filtered = useMemo(() => {
    const q = term.trim();
    const list = topics ?? [];
    if (!q) return list.slice(0, 60);
    return list.filter(t => t.name.includes(q)).slice(0, 60);
  }, [topics, term]);

  const parentName = (parentId: string | null) =>
    parentId ? byId.get(parentId)?.name ?? null : null;

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
            {current
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
            <CommandEmpty>{isLoading ? "טוען..." : "לא נמצאו נושאים"}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(""); setOpen(false); setTerm(""); }}
                >
                  <X className="h-3.5 w-3.5 ml-2 opacity-60" />
                  ללא נושא
                </CommandItem>
              )}
              {filtered.map(t => {
                const parent = parentName(t.parent_id);
                return (
                  <CommandItem
                    key={t.id}
                    value={t.id}
                    onSelect={() => { onChange(t.id); setOpen(false); setTerm(""); }}
                  >
                    <Check className={`h-3.5 w-3.5 ml-2 shrink-0 ${t.id === value ? "opacity-100" : "opacity-0"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{t.name}</div>
                      {parent && (
                        <div className="text-xs text-muted-foreground truncate">{parent}</div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
