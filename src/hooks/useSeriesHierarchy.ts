import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSeriesBreadcrumb(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["series-breadcrumb", seriesId],
    enabled: !!seriesId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_series_ancestors", {
        series_uuid: seriesId!,
      });
      if (error) throw error;
      return data as { id: string; title: string; depth: number }[];
    },
  });
}

export function useSeriesChildren(parentId: string | undefined | null) {
  return useQuery({
    queryKey: ["series-children", parentId],
    enabled: !!parentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, title, description, image_url, lesson_count, status, rabbi_id, rabbis(name)")
        .eq("parent_id", parentId!)
        .order("title");
      if (error) throw error;
      return data;
    },
  });
}

export function useRootSeries() {
  return useQuery({
    queryKey: ["series-root"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, title, description, image_url, lesson_count, status, rabbi_id, rabbis(name)")
        .is("parent_id", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });
}

export function useSeriesLinkedChildren(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["series-linked-children", seriesId],
    enabled: !!seriesId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series_links" as any)
        .select("linked_series_id, link_type, sort_order, series:linked_series_id(id, title, description, image_url, lesson_count, status, rabbi_id, rabbis(name))")
        .eq("source_series_id", seriesId!)
        .eq("link_type", "includes")
        .order("sort_order");
      if (error) throw error;
      return (data as any[])?.map((d: any) => d.series) ?? [];
    },
  });
}
