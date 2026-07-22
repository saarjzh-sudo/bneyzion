/**
 * /admin/feedback — דיווחי "האתר בהרצה" (רמה 27, יואב 22.7 16:31).
 * הדיווחים מגיעים מהטופס שברצועת-ההרצה (TrialStrip) ונשמרים ב-site_feedback.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackRow {
  id: string;
  message: string;
  name: string | null;
  phone: string | null;
  page: string | null;
  status: "new" | "handled";
  created_at: string;
}

export default function AdminFeedback() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery<FeedbackRow[]>({
    queryKey: ["site-feedback"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("site_feedback").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-feedback"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("site_feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-feedback"] }),
  });

  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <AdminLayout>
      <div dir="rtl" style={{ maxWidth: 860 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>דיווחי הרצה</h1>
        <p style={{ fontSize: 13.5, color: "#6B5C4A", margin: "0 0 18px" }}>
          הודעות מהכפתור "דיווח על תקלה" שברצועת-ההרצה. {newCount > 0 ? `${newCount} חדשים.` : "אין חדשים."}
          {" "}כיבוי הרצועה: מרכז השליטה ← "רצועת הרצה" ← מרוקנים את הטקסט.
        </p>
        {isLoading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
        {!isLoading && rows.length === 0 && (
          <div style={{ fontSize: 13.5, color: "#A69882" }}>עוד לא התקבלו דיווחים.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ background: "white", border: `1px solid ${r.status === "new" ? "rgba(196,162,101,0.5)" : "rgba(139,111,71,0.14)"}`, borderRadius: 12, padding: "12px 16px", opacity: r.status === "handled" ? 0.65 : 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{r.message}</div>
                  <div style={{ fontSize: 11.5, color: "#A69882", marginTop: 6 }}>
                    {new Date(r.created_at).toLocaleString("he-IL")} · עמוד: {r.page || "—"}
                    {r.name && ` · ${r.name}`}{r.phone && ` · ${r.phone}`}
                    {r.status === "handled" && " · ✓ טופל"}
                  </div>
                </div>
                {r.status === "new" && (
                  <button
                    title="סמן כטופל"
                    onClick={() => setStatus.mutate({ id: r.id, status: "handled" })}
                    style={{ border: "1px solid rgba(60,110,71,0.3)", background: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#3C6E47", flexShrink: 0 }}
                  >
                    <CheckCircle2 size={15} />
                  </button>
                )}
                <button
                  title="מחיקה"
                  onClick={() => { if (window.confirm("למחוק את הדיווח?")) remove.mutate(r.id); }}
                  style={{ border: "1px solid rgba(163,51,51,0.25)", background: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#A33", flexShrink: 0 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AdminLayout>
  );
}
