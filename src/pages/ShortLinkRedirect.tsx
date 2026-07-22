/**
 * /s/:code — הפניית קישור מקוצר (יואב 22.7).
 *
 * שולף את היעד מ-short_links ומנווט אליו. יעד פנימי → ניווט ראוטר;
 * קוד לא קיים → עמוד הבית (בלי מסך שגיאה — קישור שבור בקבוצה לא
 * צריך להפחיד אף אחד). ספירת קליקים דרך rpc (לא update ציבורי).
 */
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ShortLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const [target, setTarget] = useState<string | null | "missing">(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) { setTarget("missing"); return; }
      const { data } = await (supabase as any)
        .from("short_links")
        .select("target_path")
        .eq("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (data?.target_path) {
        setTarget(String(data.target_path));
        // מונה קליקים — לא חוסם את ההפניה
        (supabase as any).rpc("increment_short_link_clicks", { p_code: code }).then(() => {}, () => {});
      } else {
        setTarget("missing");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (target === null) return null; // רגע של שליפה — בלי פלאש
  if (target === "missing") return <Navigate to="/" replace />;
  // יעד חיצוני מלא (אם אי-פעם יוגדר) — הפניה מלאה; פנימי — ראוטר
  if (/^https?:\/\//i.test(target)) {
    window.location.replace(target);
    return null;
  }
  return <Navigate to={target} replace />;
}
