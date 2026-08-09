/**
 * useLessonParashot — מפת שיעור→שם פרשה מתוך תגיות ה-topics.
 *
 * הערת סוקר 2.8.2026: בסדרות מאמרי-פרשה ("מאמרים על פרשיות דברים") אין שום
 * סימון לאיזו פרשה שייך כל שיעור — מי שמחפש שיעור לפרשת עקב לא מוצא.
 * התגיות קיימות ב-DB (topics בשם "פרשת שופטים | טז-כא" וכד') — כאן שולפים
 * אותן לכל השיעורים שעל המסך ומחזירים תווית נקייה ("פרשת שופטים").
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// פרשות שמתויגות בלי קידומת "פרשת" (למשל "נצבים | כט-ל")
const PARASHA_NAMES = new Set([
  "בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח",
  "וישב", "מקץ", "ויגש", "ויחי", "שמות", "וארא", "בא", "בשלח", "יתרו",
  "משפטים", "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי", "ויקרא", "צו",
  "שמיני", "תזריע", "מצורע", "אחרי מות", "קדושים", "אמור", "בהר", "בחוקותי",
  "במדבר", "נשא", "בהעלותך", "שלח", "קרח", "חוקת", "בלק", "פנחס", "מטות",
  "מסעי", "דברים", "ואתחנן", "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא",
  "נצבים", "ניצבים", "וילך", "האזינו", "וזאת הברכה",
]);

/** "פרשת שופטים | טז-כא" → "פרשת שופטים" · "נצבים | כט-ל" → "פרשת נצבים" · אחר → null */
function parashaLabelFromTopic(name: string): string | null {
  const head = name.split("|")[0].trim();
  if (head.startsWith("פרשת ")) return head;
  if (PARASHA_NAMES.has(head)) return `פרשת ${head}`;
  return null;
}

export function useLessonParashot(lessonIds: string[]) {
  const key = [...lessonIds].sort().join(",");
  return useQuery({
    queryKey: ["lesson-parashot", key],
    enabled: lessonIds.length > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const map: Record<string, string> = {};
      for (let i = 0; i < lessonIds.length; i += 400) {
        const chunk = lessonIds.slice(i, i + 400);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("lesson_topics")
          .select("lesson_id, topics(name)")
          .in("lesson_id", chunk);
        if (error) throw error;
        for (const row of data || []) {
          const name = row.topics?.name;
          if (!name || map[row.lesson_id]) continue;
          const label = parashaLabelFromTopic(name);
          if (label) map[row.lesson_id] = label;
        }
      }
      return map;
    },
  });
}
