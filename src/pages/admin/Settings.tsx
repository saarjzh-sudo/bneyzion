import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAllSiteSettings, useUpdateSiteSetting } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const SETTINGS_META: Record<string, { label: string; description: string; type?: "text" | "textarea"; group?: string }> = {
  print_dedication: {
    label: "טקסט הנצחה בהדפסה",
    description: "הטקסט שמופיע בתחתית דף ההדפסה של שיעורים",
    group: "general",
  },
  memorial_name: {
    label: "שם הנפטר",
    description: "השם שמוצג בדף ההנצחה ובסקשן ההנצחה בדף הבית",
    group: "memorial",
  },
  memorial_subtitle: {
    label: "כיתוב משנה",
    description: "טקסט קצר מתחת לשם (לדוגמה: תהא נשמתו צרורה בצרור החיים)",
    group: "memorial",
  },
  memorial_dedication: {
    label: "טקסט הקדשה ראשי",
    description: "הפסקה המרכזית בדף ההנצחה ובדף הבית",
    type: "textarea",
    group: "memorial",
  },
  memorial_bio: {
    label: "אודות הנפטר",
    description: "הטקסט המורחב בדף ההנצחה (תומך בשורות חדשות)",
    type: "textarea",
    group: "memorial",
  },
  memorial_legacy: {
    label: "טקסט ההנצחה",
    description: "הפסקה על אופן ההנצחה באתר",
    type: "textarea",
    group: "memorial",
  },
  memorial_verse: {
    label: "פסוק",
    description: "פסוק לסיום (לדוגמה: ״והחי ייתן אל ליבו״ – קהלת ז׳, ב׳)",
    group: "memorial",
  },
};

const GROUPS = [
  { key: "general", label: "כללי" },
  { key: "memorial", label: "דף הנצחה" },
];

const Settings = () => {
  const { data: settings, isLoading } = useAllSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));
      setValues(map);
      setDirty(new Set());
    }
  }, [settings]);

  const handleSave = async (key: string) => {
    try {
      await updateSetting.mutateAsync({ key, value: values[key] });
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      toast({ title: "נשמר בהצלחה", description: `ההגדרה "${SETTINGS_META[key]?.label || key}" עודכנה` });
    } catch {
      toast({ title: "שגיאה", description: "לא ניתן לשמור את ההגדרה", variant: "destructive" });
    }
  };

  const settingsByGroup = (groupKey: string) =>
    Object.entries(values).filter(([key]) => (SETTINGS_META[key]?.group || "general") === groupKey);

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-heading text-foreground">הגדרות אתר</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl">
            {GROUPS.map((group) => {
              const items = settingsByGroup(group.key);
              if (items.length === 0) return null;
              return (
                <div key={group.key} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-heading text-foreground">{group.label}</h2>
                    <Separator className="mt-2" />
                  </div>
                  {items.map(([key, value]) => {
                    const meta = SETTINGS_META[key] || { label: key, description: "" };
                    const isTextarea = meta.type === "textarea";
                    return (
                      <Card key={key}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{meta.label}</CardTitle>
                          {meta.description && <CardDescription>{meta.description}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <Label htmlFor={key} className="sr-only">{meta.label}</Label>
                            {isTextarea ? (
                              <Textarea
                                id={key}
                                value={value}
                                onChange={(e) => {
                                  setValues((prev) => ({ ...prev, [key]: e.target.value }));
                                  setDirty((prev) => new Set(prev).add(key));
                                }}
                                className="text-right min-h-[120px]"
                                dir="rtl"
                              />
                            ) : (
                              <Input
                                id={key}
                                value={value}
                                onChange={(e) => {
                                  setValues((prev) => ({ ...prev, [key]: e.target.value }));
                                  setDirty((prev) => new Set(prev).add(key));
                                }}
                                className="text-right"
                                dir="rtl"
                              />
                            )}
                            <div className="flex justify-start">
                              <Button
                                onClick={() => handleSave(key)}
                                disabled={!dirty.has(key) || updateSetting.isPending}
                                size="sm"
                              >
                                <Save className="h-4 w-4 ml-1" />
                                שמור
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Settings;
