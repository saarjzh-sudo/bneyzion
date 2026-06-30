/**
 * InlineEditField — עריכה-במקום לשדות-תוכן נפוצים מתוך האדמין.
 *
 * לחיצה על הטקסט הופכת אותו לשדה עריכה. Enter שומר (בשורה אחת), Esc מבטל.
 * שמירה דרך callback אסינכרוני (בד"כ Supabase mutation). נגיש: role=button,
 * ניווט-מקלדת, aria-label, focus-states. שפת-עיצוב: gold/parchment/navy.
 *
 * דוגמה:
 *   <InlineEditField value={t.name} ariaLabel="שם הנושא"
 *     onSave={(v) => updateTopic.mutateAsync({ id: t.id, name: v })} />
 */

import { useEffect, useRef, useState } from "react";
import { Check, X, Pencil, Loader2 } from "lucide-react";

const C = {
  gold: "#8B6F47",
  goldShimmer: "#E8D5A0",
  parchment: "#FAF6F0",
  navy: "#1A2744",
  text: "#2D1F0E",
  textMuted: "#6B5C4A",
  red: "#DC2626",
};

interface InlineEditFieldProps {
  value: string;
  onSave: (next: string) => Promise<unknown> | void;
  /** עורך רב-שורתי (textarea) במקום input */
  multiline?: boolean;
  placeholder?: string;
  ariaLabel: string;
  /** האם להרשות ערך ריק (ברירת-מחדל: לא) */
  allowEmpty?: boolean;
  className?: string;
}

export function InlineEditField({
  value,
  onSave,
  multiline = false,
  placeholder = "ללא",
  ariaLabel,
  allowEmpty = false,
  className = "",
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const begin = () => { setDraft(value); setErr(null); setEditing(true); };
  const cancel = () => { setEditing(false); setErr(null); setDraft(value); };

  const commit = async () => {
    const trimmed = draft.trim();
    if (!allowEmpty && !trimmed) { setErr("השדה לא יכול להישאר ריק"); return; }
    if (trimmed === value) { setEditing(false); return; }
    setSaving(true);
    setErr(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={begin}
        aria-label={`עריכת ${ariaLabel}`}
        className={`group inline-flex items-center gap-1.5 text-right rounded-md px-1 -mx-1 transition-colors hover:bg-amber-50 focus:outline-none focus-visible:ring-2 ${className}`}
        style={{ color: value ? C.text : C.textMuted }}
      >
        <span className="font-ploni">{value || placeholder}</span>
        <Pencil
          className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shrink-0"
          style={{ color: C.gold }}
          aria-hidden
        />
      </button>
    );
  }

  const sharedStyle: React.CSSProperties = {
    border: `1.5px solid ${err ? C.red : C.gold}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 14,
    color: C.text,
    background: "#fff",
    width: "100%",
    fontFamily: "Ploni, sans-serif",
    direction: "rtl",
  };

  return (
    <div className="flex flex-col gap-1" dir="rtl">
      <div className="flex items-start gap-1.5">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
            aria-label={ariaLabel}
            style={sharedStyle}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") cancel();
            }}
            aria-label={ariaLabel}
            style={sharedStyle}
          />
        )}
        <button
          type="button"
          onClick={commit}
          disabled={saving}
          aria-label="שמירה"
          className="rounded-md p-1.5 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2"
          style={{ background: C.navy, color: "#fff" }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          aria-label="ביטול"
          className="rounded-md p-1.5 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2"
          style={{ background: C.parchment, color: C.textMuted, border: `1px solid ${C.goldShimmer}` }}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {err && <p role="alert" className="text-xs" style={{ color: C.red }}>{err}</p>}
    </div>
  );
}
