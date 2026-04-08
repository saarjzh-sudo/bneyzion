import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  gallery_urls: string[];
  category_id: string | null;
  product_type: string;
  is_digital: boolean;
  page_count: number | null;
  status: string;
  featured: boolean;
  sort_order: number;
  source_url: string | null;
  category?: ProductCategory;
}

export function useProductCategories() {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as ProductCategory[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useProducts(categorySlug?: string) {
  return useQuery({
    queryKey: ["products", categorySlug],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_categories(*)")
        .eq("status", "active")
        .order("sort_order");

      if (categorySlug) {
        const { data: cat } = await supabase
          .from("product_categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        if (cat) {
          query = query.eq("category_id", cat.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        price: Number(p.price),
        original_price: p.original_price ? Number(p.original_price) : null,
        category: p.product_categories,
      })) as Product[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(*)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        price: Number(data.price),
        original_price: data.original_price ? Number(data.original_price) : null,
        category: (data as any).product_categories,
      } as Product;
    },
    staleTime: 1000 * 60 * 10,
  });
}
