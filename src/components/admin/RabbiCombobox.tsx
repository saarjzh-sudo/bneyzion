/**
 * RabbiCombobox — בורר רב יחיד עם תיבת חיפוש.
 *
 * מחליף את ה-Select השטוח בדיאלוגי האדמין (שיעורים/סדרות), שהציג את כל
 * ~212 הרבנים כרשימה אחת בלי חיפוש — בקשת הרב יואב 14.9.2026 (העלאת
 * אצוות לאגף המורים). סינון בצד הלקוח: useRabbis כבר שולף את כולם.
 */
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

export interface RabbiOption {
  id: string;
  name: string;
}

interface RabbiComboboxProps {
  /** rabbi id או "" */
  value: string;
  onChange: (id: string) => void;
  rabbis: RabbiOption[];
  placeholder?: string;
  clearLabel?: string;
}

export function RabbiCombobox({
  value, onChange, rabbis, placeholder = "בחר רב", clearLabel = "ללא רב",
}: RabbiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const current = rabbis.find(r => r.id === value);

  const filtered = useMemo(() => {
    const q = term.trim();
    if (!q) return rabbis;
    return rabbis.filter(r => r.name.includes(q));
  }, [rabbis, term]);

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
            {value && current
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
          <CommandInput
            placeholder="חיפוש רב לפי שם..."
            value={term}
            onValueChange={setTerm}
          />
          <CommandList className="max-h-64">
            <CommandEmpty>לא נמצאו רבנים</CommandEmpty>
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
              {filtered.map(r => (
                <CommandItem
                  key={r.id}
                  value={r.id}
                  onSelect={() => { onChange(r.id); setOpen(false); setTerm(""); }}
                >
                  <Check className={`h-3.5 w-3.5 ml-2 shrink-0 ${r.id === value ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate text-sm">{r.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
