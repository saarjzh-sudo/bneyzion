import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, Library, Loader2, Tag, Search, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { results, isLoading, hasResults, suggestions, totalResults } = useGlobalSearch(query);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const applySuggestion = (text: string) => {
    setQuery(text);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="חיפוש רבנים, סדרות, שיעורים ונושאים..."
        value={query}
        onValueChange={setQuery}
        className="text-right"
        dir="rtl"
      />
      <CommandList dir="rtl" className="text-right max-h-[420px]">
        {isLoading && (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">מחפש...</span>
          </div>
        )}

        {!isLoading && query.trim().length >= 2 && !hasResults && (
          <CommandEmpty className="py-8 text-center">
            <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p>לא נמצאו תוצאות עבור &quot;{query}&quot;</p>
            <p className="text-xs text-muted-foreground mt-1">נסה לחפש בלי ניקוד או עם כתיב חלופי</p>
          </CommandEmpty>
        )}

        {/* Autocomplete suggestions */}
        {!isLoading && query.trim().length >= 2 && suggestions.length > 0 && (
          <CommandGroup heading={
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              הצעות
            </span>
          }>
            {suggestions.map((s, i) => (
              <CommandItem
                key={`sug-${i}`}
                value={`suggestion-${s.text}`}
                onSelect={() => applySuggestion(s.text)}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{s.text}</span>
                <Badge variant="outline" className="mr-auto text-[10px] px-1.5 py-0">
                  {s.type === "rabbi" ? "רב" : s.type === "series" ? "סדרה" : "נושא"}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(hasResults && suggestions.length > 0) && <CommandSeparator />}

        {/* Topics */}
        {results.topics.length > 0 && (
          <CommandGroup heading={
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              נושאים
            </span>
          }>
            {results.topics.map((t) => (
              <CommandItem
                key={t.id}
                value={t.name}
                onSelect={() => go(`/series?topic=${t.slug}`)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Tag className="h-4 w-4 text-accent shrink-0" />
                <span className="font-medium">{t.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Rabbis */}
        {results.rabbis.length > 0 && (
          <CommandGroup heading={
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              רבנים
            </span>
          }>
            {results.rabbis.map((rabbi) => (
              <CommandItem
                key={rabbi.id}
                value={rabbi.name}
                onSelect={() => go(`/rabbis/${rabbi.id}`)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  {rabbi.image_url && <AvatarImage src={rabbi.image_url} alt={rabbi.name} />}
                  <AvatarFallback className="text-xs"><Users className="h-3.5 w-3.5" /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{rabbi.title ? `${rabbi.title} ${rabbi.name}` : rabbi.name}</span>
                  <span className="text-xs text-muted-foreground">{rabbi.lesson_count} שיעורים</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Series */}
        {results.series.length > 0 && (
          <CommandGroup heading={
            <span className="flex items-center gap-1.5">
              <Library className="h-3.5 w-3.5" />
              סדרות
            </span>
          }>
            {results.series.map((s) => (
              <CommandItem
                key={s.id}
                value={s.title}
                onSelect={() => go(`/series/${s.id}`)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Library className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {[s.rabbis?.name && `מאת ${s.rabbis.name}`, `${s.lesson_count} שיעורים`].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Lessons */}
        {results.lessons.length > 0 && (
          <CommandGroup heading={
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              שיעורים
            </span>
          }>
            {results.lessons.map((l) => (
              <CommandItem
                key={l.id}
                value={l.title}
                onSelect={() => go(`/lessons/${l.id}`)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{l.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {[l.rabbis?.name, l.series?.title].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Result count footer */}
        {hasResults && (
          <div className="px-4 py-2 text-[11px] text-muted-foreground/60 text-center border-t border-border">
            {totalResults} תוצאות נמצאו
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;
