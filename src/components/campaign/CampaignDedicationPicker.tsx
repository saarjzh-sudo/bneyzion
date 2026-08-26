/**
 * CampaignDedicationPicker — "רוצים לקבוע הקדשה בתרומה זו?" (26.8.2026).
 *
 * שלב אופציונלי בתוך InlineCheckoutModal של CampaignPage: תורם שנותן סכום
 * שמכסה הקדשה (≥₪600) יכול לבחור שיעור/סדרה פנויים ולקבוע עליהם הקדשה,
 * בלי חיוב נוסף — הבחירה נשלחת כ-`donationMeta.companion_dedication` באותה
 * קריאת startPayment של התרומה עצמה. השרת (create-payment.ts) אוכף שוב את
 * המחיר + מונע כפילות (409), בדיוק כמו הקדשה עצמאית.
 *
 * שדות/סוגי-הקדשה תואמים 1:1 ל-DedicationDialog.tsx כדי לשמור על נוסח אחיד.
 */

import { useMemo, useState } from "react";
import { Heart, Flame, BookOpen, Sparkles, Search, CheckCircle2 } from "lucide-react";
import {
  useDebouncedValue,
  useDedicationSeriesSearch,
  useDedicationLessonSearch,
  useDedicationTakenIds,
  type DedicationSeriesCandidate,
  type DedicationLessonCandidate,
} from "@/hooks/useCampaignDedication";
import type { DedicationSettings } from "@/hooks/useLessonDedications";

const GOLD = "hsl(38 75% 45%)";
const GOLD_GRAD = "linear-gradient(135deg, hsl(43 85% 62%), hsl(38 75% 48%))";

const DED_TYPES: { value: string; label: string; icon: typeof Flame; placeholder: string }[] = [
  { value: "iluy_neshama", label: "לעילוי נשמת", icon: Flame, placeholder: "שם הנפטר/ת..." },
  { value: "refua", label: "לרפואה שלמה", icon: Heart, placeholder: "שם החולה..." },
  { value: "hatzlacha", label: "להצלחת", icon: Sparkles, placeholder: "שם המוקדש/ת..." },
  { value: "memory", label: "לזכרון", icon: BookOpen, placeholder: "שם המוקדש..." },
];

const DEFAULTS: DedicationSettings = {
  lesson_price: 600,
  series_price: 1800,
  lesson_price_popular: 900,
  popular_rabbi_min_lessons: 100,
  series_price_mid: 2400,
  series_price_large: 3200,
  series_mid_threshold: 21,
  series_large_threshold: 61,
};

function seriesPrice(lessonCount: number | null, s: DedicationSettings): number {
  const n = lessonCount ?? 0;
  if (n >= s.series_large_threshold) return s.series_price_large;
  if (n >= s.series_mid_threshold) return s.series_price_mid;
  return s.series_price;
}

function lessonPrice(rabbiLessonCount: number, s: DedicationSettings): number {
  return rabbiLessonCount >= s.popular_rabbi_min_lessons ? s.lesson_price_popular : s.lesson_price;
}

export interface CompanionDedicationSelection {
  scope: "lesson" | "series";
  lesson_id?: string;
  series_id?: string;
  dedication_type: string;
  dedicated_name: string;
  dedicator_name?: string;
  target_title: string;
  price: number;
}

export default function CampaignDedicationPicker({
  maxAmount,
  donorName,
  settings,
  onChange,
}: {
  maxAmount: number;
  donorName: string;
  settings: DedicationSettings | undefined;
  onChange: (value: CompanionDedicationSelection | null) => void;
}) {
  const s = settings || DEFAULTS;
  const [enabled, setEnabled] = useState(false);
  const [scope, setScope] = useState<"lesson" | "series">(maxAmount >= s.series_price ? "series" : "lesson");
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebouncedValue(term, 350);
  const [selected, setSelected] = useState<{ id: string; title: string; price: number } | null>(null);
  const [dedType, setDedType] = useState("iluy_neshama");
  const [dedicatedName, setDedicatedName] = useState("");
  const [dedicatorName, setDedicatorName] = useState(donorName);

  const { data: taken } = useDedicationTakenIds();
  const { data: seriesResults, isFetching: seriesLoading } = useDedicationSeriesSearch(
    debouncedTerm,
    enabled && scope === "series"
  );
  const { data: lessonResults, isFetching: lessonLoading } = useDedicationLessonSearch(
    debouncedTerm,
    enabled && scope === "lesson"
  );

  const seriesCandidates = useMemo(() => {
    return (seriesResults || [])
      .filter((r) => !taken?.series.has(r.id))
      .map((r) => ({ id: r.id, title: r.title, price: seriesPrice(r.lesson_count, s) }));
  }, [seriesResults, taken, s]);

  const lessonCandidates = useMemo(() => {
    return (lessonResults || [])
      .filter((r) => !taken?.lessons.has(r.id) && !(r.series_id && taken?.series.has(r.series_id)))
      .map((r) => ({ id: r.id, title: r.title, price: lessonPrice(r.rabbi_lesson_count, s) }));
  }, [lessonResults, taken, s]);

  const candidates = scope === "series" ? seriesCandidates : lessonCandidates;
  const isLoading = scope === "series" ? seriesLoading : lessonLoading;
  const selectedType = DED_TYPES.find((t) => t.value === dedType)!;

  const canSubmitSelection = !!selected && !!dedicatedName.trim();

  function pick(c: { id: string; title: string; price: number }) {
    setSelected(c);
  }

  function emit(nextSelected: typeof selected, nextName: string, nextDedicator: string, nextType: string) {
    if (!nextSelected || !nextName.trim()) {
      onChange(null);
      return;
    }
    onChange({
      scope,
      lesson_id: scope === "lesson" ? nextSelected.id : undefined,
      series_id: scope === "series" ? nextSelected.id : undefined,
      dedication_type: nextType,
      dedicated_name: nextName.trim(),
      dedicator_name: nextDedicator.trim() || undefined,
      target_title: nextSelected.title,
      price: nextSelected.price,
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1.5px solid hsl(38 30% 82%)",
    fontFamily: "inherit",
    fontSize: 13,
    color: "hsl(215 40% 14%)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        border: "1.5px solid hsl(38 50% 84%)",
        borderRadius: 14,
        background: "hsl(38 60% 97%)",
        overflow: "hidden",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const next = e.target.checked;
            setEnabled(next);
            if (!next) {
              setSelected(null);
              onChange(null);
            }
          }}
          style={{ accentColor: GOLD, width: 18, height: 18, flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, fontWeight: 800, color: "hsl(215 55% 18%)" }}>
          רוצים לקבוע הקדשה בתרומה זו? <span style={{ fontWeight: 500, color: "hsl(215 25% 45%)" }}>(ללא חיוב נוסף)</span>
        </span>
      </label>

      {enabled && (
        <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }} role="radiogroup" aria-label="מה להקדיש">
            {(["lesson", "series"] as const).map((sc) => {
              const need = sc === "series" ? s.series_price : s.lesson_price;
              const disabled = maxAmount < need;
              return (
                <button
                  key={sc}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setScope(sc);
                    setSelected(null);
                    onChange(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: scope === sc ? `1.5px solid ${GOLD}` : "1.5px solid hsl(38 30% 82%)",
                    background: scope === sc ? "hsl(38 75% 92%)" : "white",
                    color: disabled ? "hsl(215 15% 65%)" : "hsl(215 45% 24%)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  {sc === "series" ? "סדרה שלמה" : "שיעור בודד"}
                  {disabled && <div style={{ fontSize: 10, fontWeight: 500 }}>נדרש ₪{need.toLocaleString()}+</div>}
                </button>
              );
            })}
          </div>

          {!selected && (
            <>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", insetInlineStart: 10, top: 10, color: "hsl(215 20% 55%)" }} />
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={scope === "series" ? "חפשו שם סדרה..." : "חפשו שם שיעור..."}
                  dir="rtl"
                  style={{ ...inputStyle, paddingInlineStart: 30 }}
                />
              </div>

              {debouncedTerm.trim().length >= 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                  {isLoading && <div style={{ fontSize: 12, color: "hsl(215 20% 50%)", textAlign: "center", padding: 8 }}>מחפש...</div>}
                  {!isLoading && candidates.length === 0 && (
                    <div style={{ fontSize: 12, color: "hsl(215 20% 50%)", textAlign: "center", padding: 8 }}>
                      לא נמצאו {scope === "series" ? "סדרות" : "שיעורים"} פנויים תואמים
                    </div>
                  )}
                  {candidates.map((c) => {
                    const affordable = c.price <= maxAmount;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={!affordable}
                        onClick={() => pick(c)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          padding: "9px 12px",
                          borderRadius: 10,
                          border: "1.5px solid hsl(38 30% 85%)",
                          background: affordable ? "white" : "hsl(215 10% 96%)",
                          cursor: affordable ? "pointer" : "not-allowed",
                          opacity: affordable ? 1 : 0.55,
                          textAlign: "start",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(215 45% 20%)" }}>{c.title}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: affordable ? GOLD : "hsl(215 15% 55%)", flexShrink: 0 }}>
                          {affordable ? `כלול · ₪${c.price.toLocaleString()}` : `נדרש ₪${c.price.toLocaleString()}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "hsl(38 75% 92%)",
                  border: `1.5px solid ${GOLD}`,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "hsl(215 45% 18%)" }}>
                  <CheckCircle2 size={14} style={{ color: GOLD }} />
                  {selected.title}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    onChange(null);
                  }}
                  style={{ background: "none", border: "none", color: "hsl(215 30% 40%)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                >
                  החלפה
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }} role="radiogroup" aria-label="סוג ההקדשה">
                {DED_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setDedType(t.value);
                      emit(selected, dedicatedName, dedicatorName, t.value);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      padding: "8px 4px",
                      borderRadius: 10,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: dedType === t.value ? `1.5px solid ${GOLD}` : "1.5px solid hsl(38 30% 85%)",
                      background: dedType === t.value ? "hsl(38 75% 92%)" : "white",
                      color: "hsl(215 45% 22%)",
                      cursor: "pointer",
                    }}
                  >
                    <t.icon size={14} style={{ color: GOLD }} />
                    {t.label}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 4 }}>
                  {selectedType.label} *
                </label>
                <input
                  type="text"
                  value={dedicatedName}
                  onChange={(e) => {
                    setDedicatedName(e.target.value);
                    emit(selected, e.target.value, dedicatorName, dedType);
                  }}
                  placeholder={selectedType.placeholder}
                  dir="rtl"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "hsl(215 30% 42%)", marginBlockEnd: 4 }}>
                  שם המקדיש (רשות)
                </label>
                <input
                  type="text"
                  value={dedicatorName}
                  onChange={(e) => {
                    setDedicatorName(e.target.value);
                    emit(selected, dedicatedName, e.target.value, dedType);
                  }}
                  placeholder="שמך..."
                  dir="rtl"
                  style={inputStyle}
                />
              </div>

              {!canSubmitSelection && (
                <div style={{ fontSize: 11.5, color: "hsl(20 70% 45%)" }}>יש למלא את שם המוקדש כדי לצרף את ההקדשה לתרומה.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
