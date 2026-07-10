/**
 * ContentWorkspace — /admin/content — "עריכת תוכן"
 *
 * 10.7.2026 (הוראת סער, איחוד עריכת תוכן): סביבת עבודה אחת לכל עריכת התוכן,
 * במקום 5 כניסות נפרדות בסיידבר: סדרות | שיעורים | דור הפלאות | תוכן יומי | נושאים.
 * כל טאב מרנדר את קומפוננטת-הליבה של העמוד הקיים (XContent — בלי AdminLayout),
 * כך שהראוטים העצמאיים (/admin/lessons וכו') ממשיכים לעבוד ללא שינוי.
 *
 * "העלאת תוכן" (/admin/upload) נשאר עמוד נפרד — זה flow יצירה, לא עריכה.
 * דיפ-לינק: /admin/content?tab=lessons (ולסטטוס שיעורים: &status=pending_review).
 *
 * ⚠️ דורש route ב-App.tsx: /admin/content (admin+creator). עד הוספתו — העמוד
 * נגיש רק דרך הקוד; ראה דוח האיחוד.
 */
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, BookOpen, Sparkles, BookMarked, Tag, PencilRuler } from "lucide-react";
import { SeriesContent } from "./Series";
import { LessonsContent } from "./Lessons";
import { DorHaplaotContent } from "./DorHaplaot";
import { DailyContentContent } from "./DailyContent";
import { TopicsContent } from "./Topics";

const TABS = [
  { id: "series",  label: "סדרות",      icon: FolderOpen },
  { id: "lessons", label: "שיעורים",    icon: BookOpen },
  { id: "dor",     label: "דור הפלאות", icon: Sparkles },
  { id: "daily",   label: "תוכן יומי",  icon: BookMarked },
  { id: "topics",  label: "נושאים",     icon: Tag },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ContentWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get("tab");
  const tab: TabId = (TABS.some((t) => t.id === fromUrl) ? fromUrl : "series") as TabId;

  const setTab = (next: string) => {
    // שומרים פרמטרים נוספים (למשל status= של טאב השיעורים)
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <PencilRuler className="h-6 w-6 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-heading text-foreground">עריכת תוכן</h1>
            <p className="text-sm text-muted-foreground">
              כל עריכת התוכן במקום אחד — סדרות, שיעורים, דור הפלאות, תוכן יומי ונושאים
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} dir="rtl">
          <TabsList className="flex-wrap h-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="series" className="pt-4">
            <SeriesContent />
          </TabsContent>
          <TabsContent value="lessons" className="pt-4">
            <LessonsContent />
          </TabsContent>
          <TabsContent value="dor" className="pt-4">
            <DorHaplaotContent />
          </TabsContent>
          <TabsContent value="daily" className="pt-4">
            <DailyContentContent />
          </TabsContent>
          <TabsContent value="topics" className="pt-4">
            <TopicsContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
