/**
 * ShippingOptionsEditor — עורך מחירי המשלוח (copy.shipping.options).
 *
 * רמה 18 (יואב 14.7): "יש ניהול של דרכי המשלוח במרכז השליטה הכללי, ובנפרד ממנו
 * ניהול של נקודות מכירה בדף המוצרים — צריך לאחד". העורך עבר לכאן, לטאב
 * "משלוח ואיסוף" בניהול המוצרים, לצד נקודות המכירה. אותו מפתח site_settings —
 * הקופה (עגלה + קנייה מהירה) קוראת דרך useShippingOptions עם fallback לקונפיג.
 */
import { useMemo, useState } from "react";
import { Save, RotateCcw, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useAllSiteSettings,
  useUpdateSiteSetting,
  useDeleteSiteSetting,
} from "@/hooks/useSiteSettings";
import { SHIPPING_OPTIONS, type ShippingOption } from "@/config/shipping";
import { SHIPPING_OPTIONS_KEY, parseShippingOptions } from "@/hooks/useShippingOptions";

export function ShippingOptionsEditor() {
  const { data: settings } = useAllSiteSettings();
  const overrides = useMemo(
    () => new Map((settings ?? []).map((s) => [s.key, s.value])),
    [settings],
  );
  const saved = overrides.get(SHIPPING_OPTIONS_KEY);
  const effective = (saved && parseShippingOptions(saved)) || SHIPPING_OPTIONS;
  const [items, setItems] = useState<ShippingOption[] | null>(null);
  const update = useUpdateSiteSetting();
  const del = useDeleteSiteSetting();

  const list = items ?? effective;
  const dirty = items != null && JSON.stringify(items) !== JSON.stringify(effective);
  const valid = list.every(
    (o) => o.label.trim().length > 0 && Number.isFinite(o.price) && o.price >= 0 && o.price <= 500,
  );

  const setAt = (i: number, patch: Partial<ShippingOption>) =>
    setItems(list.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const save = () => {
    if (!valid || !dirty) return;
    update.mutate(
      { key: SHIPPING_OPTIONS_KEY, value: JSON.stringify(list) },
      {
        onSuccess: () => { toast.success("מחירי המשלוח נשמרו — חיים בקופה"); setItems(null); },
        onError: (e: any) => toast.error(`השמירה נכשלה: ${e.message ?? e}`),
      },
    );
  };
  const reset = () => {
    del.mutate(SHIPPING_OPTIONS_KEY, {
      onSuccess: () => { toast.success("מחירי המשלוח חזרו לברירת המחדל"); setItems(null); },
      onError: (e: any) => toast.error(`האיפוס נכשל: ${e.message ?? e}`),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Truck className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-base">דרכי משלוח ומחירים</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        שלוש דרכי המשלוח שמוצגות לרוכשים בקופה. שינוי כאן חי באתר מיד אחרי שמירה.
      </p>
      <div className="flex flex-col gap-2">
        {list.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <Input dir="rtl" className="flex-1" value={o.label} placeholder="שם"
              onChange={(e) => setAt(i, { label: e.target.value })} />
            <Input dir="rtl" className="flex-1" value={o.sublabel} placeholder="תיאור"
              onChange={(e) => setAt(i, { sublabel: e.target.value })} />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm text-muted-foreground">₪</span>
              <Input dir="ltr" type="number" min={0} max={500} className="w-20" value={o.price}
                onChange={(e) => setAt(i, { price: Number(e.target.value) })} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" onClick={save} disabled={!dirty || !valid || update.isPending} className="gap-1">
          <Save className="h-3.5 w-3.5" /> שמירה
        </Button>
        {overrides.has(SHIPPING_OPTIONS_KEY) && (
          <Button size="sm" variant="outline" onClick={reset} disabled={del.isPending} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> חזרה לברירת המחדל
          </Button>
        )}
        {!valid && <span className="text-xs text-destructive">שם ריק או מחיר לא תקין (0–500)</span>}
      </div>
    </div>
  );
}
