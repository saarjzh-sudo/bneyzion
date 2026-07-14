/**
 * useEvents — CRUD לדפי-כנסים (טבלת `events`, נוצרה 1.7.2026, RLS: ציבור קורא is_active, admin הכל).
 * טבלה חדשה שאינה ב-generated types → casts `as never`.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  event_date: string | null;
  location: string | null;
  hero_url: string | null;
  body: string | null;
  is_active: boolean;
  registrations_count: number;
  views_count: number;
  sort_order: number;
  created_at: string;
}

export function useEvents() {
  return useQuery<EventRow[]>({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events" as never)
        .select("*")
        .order("sort_order" as never, { ascending: true })
        .order("event_date" as never, { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });
}

export function useUpsertEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<EventRow> & { id?: string }) => {
      const payload: Record<string, unknown> = { ...row };
      if (row.id) {
        const { id, ...updates } = payload as any;
        const { error } = await supabase.from("events" as never).update(updates as never).eq("id" as never, row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: delRows, error } = await (supabase.from("events" as never).delete().eq("id" as never, id) as any).select("id");
      if (error) throw error;
      if (!delRows?.length) throw new Error("המחיקה לא בוצעה — אין הרשאת מחיקה (RLS).");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events"] }),
  });
}
