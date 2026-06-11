/**
 * MultiRabbiSelector — chip-based multi-select for rabbis + inline "add new creator" form.
 * Feature 3, Batch B.
 *
 * Usage in ContentUpload step 1:
 *   <MultiRabbiSelector
 *     rabbisList={rabbisList ?? []}
 *     selectedIds={form.rabbiIds}
 *     onChange={ids => set("rabbiIds", ids)}
 *     onRabbiCreated={r => set("rabbiIds", [...form.rabbiIds, r.id])}
 *   />
 *
 * The first selectedId is treated as the primary rabbi (→ lessons.rabbi_id).
 * Additional ids go into the lesson_rabbis join table.
 */

import { useState, useRef, useEffect } from "react";
import { X, Plus, Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── design tokens (match ContentUpload) ─────────────────────────────────────
const GOLD   = "#8B6F47";
const GOLD_L = "#C4A265";
const GOLD_S = "#E8D5A0";
const PARCH_D = "#F5F0E8";
const TXT    = "#2D1F0E";
const TXT_M  = "#6B5C4A";

// ─── types ────────────────────────────────────────────────────────────────────
export interface RabbiListItem {
  id:          string;
  name:        string;
  entity_type: string | null;
}

export interface MultiRabbiSelectorProps {
  rabbisList:      RabbiListItem[];
  selectedIds:     string[];
  onChange:        (ids: string[]) => void;
  onRabbiCreated?: (rabbi: { id: string; name: string }) => void;
}

// ─── slug helper ─────────────────────────────────────────────────────────────
function nameToSlug(name: string): string {
  // Transliterate Hebrew to a rough ASCII slug — user edits manually anyway.
  // Just strip non-ASCII, replace spaces with dashes, lowercase.
  return name
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .toLowerCase()
    .replace(/^-+|-+$/g, "")
    || `creator-${Date.now()}`;
}

// ─── component ───────────────────────────────────────────────────────────────
export function MultiRabbiSelector({
  rabbisList,
  selectedIds,
  onChange,
  onRabbiCreated,
}: MultiRabbiSelectorProps) {
  const { toast } = useToast();

  // autocomplete state
  const [query, setQuery]               = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);

  // inline "add new creator" state
  const [addingNew, setAddingNew]       = useState(false);
  const [newName, setNewName]           = useState("");
  const [newSlug, setNewSlug]           = useState("");
  const [newType, setNewType]           = useState<"rabbi" | "content_creator">("rabbi");
  const [slugError, setSlugError]       = useState("");
  const [creating, setCreating]         = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Filter suggestions — exclude already selected
  const suggestions = query.length >= 1
    ? rabbisList.filter(
        r =>
          !selectedIds.includes(r.id) &&
          r.name.includes(query)
      ).slice(0, 8)
    : [];

  const addById = (id: string) => {
    if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
    setQuery("");
    setDropdownOpen(false);
  };

  const removeById = (id: string) => {
    onChange(selectedIds.filter(x => x !== id));
  };

  const selectedRabbis = selectedIds
    .map(id => rabbisList.find(r => r.id === id))
    .filter(Boolean) as RabbiListItem[];

  // ── "add new creator" handler ─────────────────────────────────────
  const handleNewNameChange = (v: string) => {
    setNewName(v);
    setNewSlug(nameToSlug(v));
    setSlugError("");
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    if (!newSlug.trim()) { setSlugError("נא להזין slug (אנגלית, ללא רווחים)"); return; }

    setCreating(true);
    try {
      // Check slug uniqueness
      const { count } = await (supabase as any)
        .from("rabbis")
        .select("*", { count: "exact", head: true })
        .eq("slug", newSlug.trim());

      if ((count ?? 0) > 0) {
        setSlugError(`Slug "${newSlug}" כבר קיים — שנה ל-slug ייחודי`);
        setCreating(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("rabbis")
        .insert({
          name:        newName.trim(),
          slug:        newSlug.trim(),
          entity_type: newType,
          status:      "active",
          lesson_count: 0,
        })
        .select("id, name")
        .single();

      if (error) throw error;

      toast({ title: `"${data.name}" נוצר ונוסף` });
      onRabbiCreated?.(data);
      onChange([...selectedIds, data.id]);
      // Reset form
      setNewName(""); setNewSlug(""); setNewType("rabbi");
      setAddingNew(false);
    } catch (e: any) {
      toast({ title: "שגיאה ביצירת יוצר", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3" style={{ direction: "rtl" }}>

      {/* ── Selected chips ─────────────────────────────────────────────── */}
      {selectedRabbis.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedRabbis.map((r, idx) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-display"
              style={{
                background: idx === 0 ? `${GOLD}22` : PARCH_D,
                border: `1px solid ${idx === 0 ? GOLD : GOLD_S}`,
                color: idx === 0 ? GOLD : TXT_M,
              }}
            >
              {idx === 0 && (
                <span className="text-[10px] px-1 py-0.5 rounded-full font-bold"
                  style={{ background: GOLD, color: "#fff" }}>ראשי</span>
              )}
              {r.name}
              <button
                type="button"
                onClick={() => removeById(r.id)}
                className="hover:opacity-70 transition-opacity"
                aria-label={`הסר ${r.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Autocomplete input ─────────────────────────────────────────── */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
          onFocus={() => query.length >= 1 && setDropdownOpen(true)}
          placeholder={selectedIds.length === 0 ? "חפש רב / יוצר..." : "הוסף רב נוסף..."}
          style={{ direction: "rtl" }}
          autoComplete="off"
        />
        {dropdownOpen && suggestions.length > 0 && (
          <div
            ref={dropRef}
            className="absolute z-30 mt-1 w-full rounded-xl shadow-lg overflow-hidden"
            style={{ background: "#fff", border: `1px solid ${GOLD_S}`, top: "100%" }}
          >
            {suggestions.map(r => (
              <button
                key={r.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); addById(r.id); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-right hover:bg-amber-50 transition-colors"
              >
                <span className="text-sm font-display" style={{ color: TXT }}>{r.name}</span>
                <span className="text-xs" style={{ color: TXT_M }}>
                  {r.entity_type === "content_creator" ? "יוצר תוכן" : "רב"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── "+ הוסף יוצר חדש" toggle ────────────────────────────────────── */}
      {!addingNew ? (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-1.5 text-xs font-display transition-opacity hover:opacity-70"
          style={{ color: GOLD }}
        >
          <UserPlus className="h-3.5 w-3.5" />
          הוסף יוצר חדש שלא קיים ברשימה
        </button>
      ) : (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: PARCH_D, border: `1px solid ${GOLD_S}` }}
        >
          <p className="text-xs font-display font-bold" style={{ color: TXT }}>
            יוצר / רב חדש
          </p>

          {/* Name */}
          <div>
            <label className="block text-xs font-display mb-1" style={{ color: TXT_M }}>
              שם מלא <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <Input
              value={newName}
              onChange={e => handleNewNameChange(e.target.value)}
              placeholder="הרב ישראל ישראלי"
              style={{ direction: "rtl" }}
            />
          </div>

          {/* Slug — user must confirm */}
          <div>
            <label className="block text-xs font-display mb-1" style={{ color: TXT_M }}>
              Slug (אנגלית, ייחודי) <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <Input
              value={newSlug}
              onChange={e => { setNewSlug(e.target.value.replace(/\s+/g, "-").toLowerCase()); setSlugError(""); }}
              placeholder="israel-israeli"
              dir="ltr"
            />
            {slugError && (
              <p className="text-xs mt-1" style={{ color: "#DC2626" }}>{slugError}</p>
            )}
            <p className="text-xs mt-1" style={{ color: TXT_M }}>
              משמש ב-URL של עמוד הרב. אנגלית, מקף בין מילים, ייחודי.
            </p>
          </div>

          {/* Entity type */}
          <div>
            <label className="block text-xs font-display mb-1" style={{ color: TXT_M }}>
              סוג יוצר
            </label>
            <Select
              value={newType}
              onValueChange={v => setNewType(v as "rabbi" | "content_creator")}
            >
              <SelectTrigger style={{ direction: "rtl" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="rabbi">רב / מרצה</SelectItem>
                <SelectItem value="content_creator">יוצר תוכן / מוסד</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || !newSlug.trim() || creating}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-display transition-colors disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_L} 100%)`,
                color: "#fff",
              }}
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              צור והוסף
            </button>
            <button
              type="button"
              onClick={() => { setAddingNew(false); setNewName(""); setNewSlug(""); setSlugError(""); }}
              className="px-4 py-2 rounded-lg text-xs font-display transition-colors"
              style={{ background: "#fff", color: TXT_M, border: `1px solid ${GOLD_S}` }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {selectedIds.length > 1 && (
        <p className="text-xs" style={{ color: TXT_M }}>
          הרב הראשון ברשימה הוא הרב הראשי. גרור/ערוך לשינוי סדר.
        </p>
      )}
    </div>
  );
}
