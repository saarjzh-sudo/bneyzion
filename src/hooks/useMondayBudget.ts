/**
 * useMondayBudget — משיכת מעקב-תקציב מלוח Monday של בני ציון.
 *
 * ⚠️ STUB מחווט-לחלוטין הממתין ל-credential.
 * צריך מסער: Monday API token + Board ID (ראה _DONE.md).
 *
 * אבטחה: לא לחשוף token ב-client. בפרודקשן הקריאה צריכה לעבור דרך
 * edge-function (`supabase/functions/monday-budget`) ש-T01 לא בנה (מחוץ לאזור-הבעלות).
 * עד שה-edge קיים, ההוק מזהה שאין חיבור ומחזיר { configured: false }.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BudgetLine {
  id: string;
  name: string;
  /** סכום מתוקצב בש"ח */
  budgeted: number;
  /** סכום שנוצל בש"ח */
  spent: number;
  status?: string;
}

export interface BudgetData {
  lines: BudgetLine[];
  totalBudgeted: number;
  totalSpent: number;
}

/** האם הוגדרו פרטי-חיבור ל-Monday (env) */
export function isMondayConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_MONDAY_BUDGET_BOARD_ID &&
    import.meta.env.VITE_MONDAY_PROXY_READY === "true",
  );
}

export function useMondayBudget() {
  const configured = isMondayConfigured();

  const query = useQuery<BudgetData>({
    queryKey: ["monday-budget"],
    enabled: configured,
    queryFn: async () => {
      // עובר דרך edge-function כדי לא לחשוף token ב-client.
      const { data, error } = await supabase.functions.invoke("monday-budget", {
        body: { boardId: import.meta.env.VITE_MONDAY_BUDGET_BOARD_ID },
      });
      if (error) throw error;

      const lines: BudgetLine[] = (data?.lines ?? []).map((l: any) => ({
        id: String(l.id),
        name: l.name,
        budgeted: Number(l.budgeted) || 0,
        spent: Number(l.spent) || 0,
        status: l.status,
      }));

      return {
        lines,
        totalBudgeted: lines.reduce((s, l) => s + l.budgeted, 0),
        totalSpent: lines.reduce((s, l) => s + l.spent, 0),
      };
    },
  });

  return { configured, ...query };
}
