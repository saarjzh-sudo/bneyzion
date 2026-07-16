/**
 * useLearningStyleTopics — תגיות "אופי הלימוד" שהרב יואב שולט בהן (רמה 20, 16.7).
 *
 * הרב יואב ביקש (16.7 13:59) להעביר תגיות מ"נושאים בתנ״ך" ללשונית
 * "ניווט לפי אופי הלימוד" ולשלוט בזה בעצמו. המנגנון: דגל
 * topics.is_learning_style — טוגל באדמין ← עריכת תוכן ← נושאים.
 * תגית מדוגלת מופיעה בלשונית אופי-הלימוד ויורדת מרשימת הנושאים
 * (useTopicsSidebar / useBasicThemesSidebar מסננים אותה החוצה).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LearningStyleTopic {
  id: string;
  name: string;
  slug: string;
}

export function useLearningStyleTopics() {
  return useQuery<LearningStyleTopic[]>({
    queryKey: ["learning-style-topics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("topics")
        .select("id, name, slug")
        .eq("is_learning_style", true)
        .order("name");
      if (error) {
        console.warn("[useLearningStyleTopics]", error.message);
        return [];
      }
      return (data || []) as LearningStyleTopic[];
    },
    staleTime: 1000 * 60 * 10,
  });
}
