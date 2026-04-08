import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Donation {
  id: string;
  amount: number;
  donor_name: string | null;
  dedication_type: string;
  dedication_name: string | null;
  created_at: string;
}

export function useRecentDonations() {
  return useQuery({
    queryKey: ["recent-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("id, amount, donor_name, dedication_type, dedication_name, created_at")
        .eq("payment_status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as Donation[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (donation: {
      amount: number;
      is_monthly: boolean;
      dedication_type: string;
      dedication_name?: string;
      donor_name?: string;
      donor_email?: string;
      user_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("donations")
        .insert({
          ...donation,
          payment_status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recent-donations"] }),
  });
}
