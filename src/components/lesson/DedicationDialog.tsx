import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Flame, BookOpen, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import {
  useDedicationPricing,
  useDedicationSettings,
  useLessonDedications,
  useSeriesDedications,
  type DedicationScope,
  type DedicationType,
} from "@/hooks/useLessonDedications";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DedicationPreview from "@/components/lesson/DedicationPreview";

// (סער 10.7) נוסח קצר בלבד: סוג ההקדשה + השם — בלי שדה טקסט חופשי.
const TYPES: { value: DedicationType; label: string; icon: typeof Flame; placeholder: string }[] = [
  { value: "iluy_neshama", label: "לעילוי נשמת", icon: Flame, placeholder: "שם הנפטר/ת..." },
  { value: "refua", label: "לרפואה שלמה", icon: Heart, placeholder: "שם החולה..." },
  { value: "hatzlacha", label: "להצלחת", icon: Sparkles, placeholder: "שם המוקדש/ת..." },
  { value: "memory", label: "לזכרון", icon: BookOpen, placeholder: "שם המוקדש..." },
];

export interface DedicationDialogProps {
  /** מזהה שיעור — חובה כשמקדישים שיעור. בדף סדרה אפשר בלעדיו (scope=series). */
  lessonId?: string;
  lessonTitle?: string;
  /** אם קיימים — מאפשר להקדיש את הסדרה כולה (או רק אותה, כשאין שיעור). */
  seriesId?: string;
  seriesTitle?: string;
  /** ברירת מחדל להיקף ההקדשה. בדף סדרה מעבירים "series". */
  defaultScope?: DedicationScope;
  /** כיתוב כפתור הפתיחה. ברירת מחדל: "הקדש שיעור" / "הקדש סדרה" לפי ההקשר. */
  triggerLabel?: string;
  /** גודל כפתור הפתיחה (ברירת מחדל sm). */
  triggerSize?: "sm" | "default";
}

export default function DedicationDialog({
  lessonId,
  lessonTitle,
  seriesId,
  seriesTitle,
  defaultScope,
  triggerLabel,
  triggerSize = "sm",
}: DedicationDialogProps) {
  const initialScope: DedicationScope = defaultScope ?? (lessonId ? "lesson" : "series");
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<DedicationScope>(initialScope);
  const [type, setType] = useState<DedicationType>("iluy_neshama");
  const [name, setName] = useState("");
  const [dedicator, setDedicator] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);

  const { data: settings } = useDedicationSettings();
  const { data: pricing } = useDedicationPricing(lessonId, seriesId);
  const { startPayment, isLoading, isReady } = useGrowPayment();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedType = TYPES.find((t) => t.value === type)!;

  // מניעת כפילות (יואב 16.7): פריט שכבר הוקדש — לא ניתן להקדיש שוב.
  // סדרה מוקדשת חוסמת גם הקדשת שיעור בתוכה (השיעור כבר מוצג כמוקדש).
  const { data: lessonDeds } = useLessonDedications(lessonId);
  const { data: seriesDeds } = useSeriesDedications(seriesId);
  const seriesTaken = (seriesDeds?.length ?? 0) > 0;
  const lessonTaken = (lessonDeds?.length ?? 0) > 0 || seriesTaken;
  const scopeTaken = scope === "series" ? seriesTaken : lessonTaken;
  const takenReason = seriesTaken
    ? "הסדרה הזו כבר הוקדשה — אי אפשר להקדיש אותה או שיעור מתוכה שוב."
    : "השיעור הזה כבר הוקדש.";

  // שני היקפים לבחירה רק כשיש גם שיעור וגם סדרה, וההיקף פנוי
  const canChooseScope = !!seriesId && !!lessonId;

  // תמחור דיפרנציאלי (סער 10.7): רב מבוקש / גודל סדרה — מחושב בהוק,
  // ונאכף שוב בשרת (create-payment) כך שלא ניתן לשנות מחיר מהדפדפן.
  const lessonPrice = pricing?.lessonPrice ?? settings?.lesson_price ?? 600;
  const seriesPrice = pricing?.seriesPrice ?? settings?.series_price ?? 1800;
  const amount = useMemo(
    () => (scope === "series" ? seriesPrice : lessonPrice),
    [scope, lessonPrice, seriesPrice]
  );

  const targetTitle = scope === "series" ? seriesTitle || lessonTitle || "" : lessonTitle || "";
  const scopeWord = scope === "series" ? "סדרה" : "שיעור";
  const defaultTrigger = lessonId ? "הקדש שיעור" : "הקדש סדרה";

  // רמה 21ב (סער 17.7): פריט שכבר הוקדש — כפתור ההקדשה לא מוצג בכלל
  // (עד עכשיו הוצג ורק הטופס נחסם). בדף סדרה: הסדרה מוקדשת. בדף שיעור:
  // השיעור מוקדש או שהסדרה שלו מוקדשת (הקדשת-סדרה חוסמת את שיעוריה).
  // חייב לשבת אחרי כל קריאות-ה-hooks (יציאה מוקדמת לפני useMemo = קריסת hooks).
  if (lessonId ? lessonTaken : seriesTaken) return null;

  const resetForm = () => {
    setName("");
    setDedicator("");
    setFullName("");
    setPhone("");
    setEmail("");
    setTosAccepted(false);
  };

  const handleSubmit = async () => {
    if (scopeTaken) {
      toast({ title: takenReason, variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "נא למלא את שם המוקדש", variant: "destructive" });
      return;
    }
    if (!fullName.trim() || !phone.trim()) {
      toast({ title: "נא למלא שם מלא וטלפון לתשלום", variant: "destructive" });
      return;
    }
    if (!isReady) {
      toast({ title: "מערכת התשלומים עדיין נטענת — נסו שוב בעוד רגע", variant: "destructive" });
      return;
    }
    if (!tosAccepted) {
      toast({ title: "יש לאשר את התקנון לפני התשלום", variant: "destructive" });
      return;
    }

    try {
      // השרת (create-payment) יוצר את שורת ה-pending ב-lesson_dedications,
      // אוכף את המחיר, ופותח תהליך Grow. ה-webhook הופך אותה ל-active
      // ברגע שהחיוב מאושר — רק אז ההקדשה מופיעה באתר.
      await startPayment({
        sum: amount,
        description: `הקדשת ${scopeWord}: ${targetTitle}`,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        type: "product",
        thankYouType: "cart",
        meta: {
          product: scope === "series" ? "dedication-series" : "dedication-lesson",
          session_title: targetTitle,
          user_id: user?.id,
          tos_accepted: tosAccepted,
          tos_accepted_at: new Date().toISOString(),
        },
        dedicationMeta: {
          scope,
          lesson_id: scope === "lesson" ? lessonId : undefined,
          series_id: scope === "series" ? seriesId : undefined,
          dedication_type: type,
          dedicated_name: name.trim(),
          dedicator_name: dedicator.trim() || undefined,
          user_id: user?.id,
        },
      });

      toast({
        title: "התשלום עבר בהצלחה 🙏",
        description: "ההקדשה תופיע באתר תוך רגעים ספורים",
      });
      queryClient.invalidateQueries({ queryKey: ["lesson-dedications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dedications"] });
      setOpen(false);
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      toast({
        title: "התשלום לא הושלם",
        description: message || "אפשר לנסות שוב, או לפנות אלינו דרך יצירת קשר",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size={triggerSize} className="gap-2">
          <Heart className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {triggerLabel || defaultTrigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {scope === "series" ? "הקדשת סדרה" : "הקדשת שיעור"}
          </DialogTitle>
          <DialogDescription>{targetTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* יואב 16.7: פריט שכבר הוקדש — הודעה במקום טופס */}
          {scopeTaken && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground text-center">
              {takenReason}
            </div>
          )}
          {/* Scope: lesson vs whole series */}
          {canChooseScope && (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="מה להקדיש">
              <button
                type="button"
                role="radio"
                aria-checked={scope === "lesson"}
                onClick={() => setScope("lesson")}
                className={`py-2.5 px-2 rounded-xl text-xs font-display transition-all border text-center ${
                  scope === "lesson"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                }`}
              >
                <span className="block">השיעור הזה בלבד</span>
                <span className="block mt-0.5 font-bold" dir="rtl">
                  ₪{lessonPrice.toLocaleString("he-IL")}
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={scope === "series"}
                onClick={() => setScope("series")}
                className={`py-2.5 px-2 rounded-xl text-xs font-display transition-all border text-center ${
                  scope === "series"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                }`}
              >
                <span className="block">כל הסדרה</span>
                <span className="block mt-0.5 font-bold" dir="rtl">
                  ₪{seriesPrice.toLocaleString("he-IL")}
                </span>
              </button>
            </div>
          )}

          {/* Dedication type — 4 סוגים, נוסח קצר בלבד */}
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="סוג ההקדשה">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={type === t.value}
                onClick={() => setType(t.value)}
                className={`py-3 px-2 rounded-xl text-xs font-display transition-all border text-center ${
                  type === t.value
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                }`}
              >
                <t.icon className="h-4 w-4 mx-auto mb-1" aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="ded-name">{selectedType.label}</Label>
            <Input
              id="ded-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedType.placeholder}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="ded-dedicator">שם המקדיש (רשות)</Label>
            <Input
              id="ded-dedicator"
              value={dedicator}
              onChange={(e) => setDedicator(e.target.value)}
              placeholder="שמך..."
              className="mt-1"
            />
          </div>

          {/* Live preview — single source with the badge that shows on the lesson */}
          <DedicationPreview
            variant="preview"
            data={{ dedication_type: type, dedicated_name: name, dedicator_name: dedicator }}
          />

          <div className="h-px bg-border" />

          <p className="text-xs text-muted-foreground font-display">פרטי תשלום</p>

          <div>
            <Label htmlFor="ded-fullname">שם מלא *</Label>
            <Input
              id="ded-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="שם פרטי ושם משפחה"
              className="mt-1"
              dir="rtl"
            />
          </div>

          <div>
            <Label htmlFor="ded-phone">טלפון *</Label>
            <Input
              id="ded-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-0000000"
              className="mt-1"
              dir="ltr"
            />
          </div>

          <div>
            <Label htmlFor="ded-email">אימייל (לקבלה, רשות)</Label>
            <Input
              id="ded-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="mt-1"
              dir="ltr"
            />
          </div>

          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            תשלום מאובטח דרך Grow / Meshulam · אישור אוטומטי מיידי
          </div>

          {/* יואב 13.7 (אודיט): הסכמת-תקנון אמיתית — קודם נשלח tos_accepted:true קשיח בלי checkbox */}
          <div className="flex items-start gap-2">
            <Checkbox id="ded-tos" checked={tosAccepted} onCheckedChange={(v) => setTosAccepted(!!v)} />
            <label htmlFor="ded-tos" className="text-xs leading-relaxed cursor-pointer select-none text-muted-foreground">
              אני מאשר/ת את{" "}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:opacity-80" onClick={(e) => e.stopPropagation()}>
                תקנון האתר ומדיניות הפרטיות
              </Link>
              , ומסכים/ה לחיוב עבור ההקדשה.
            </label>
          </div>

          <Button onClick={handleSubmit} disabled={isLoading || !tosAccepted || scopeTaken} className="w-full font-display gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                מעבד תשלום...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4" aria-hidden="true" />
                {`הקדשה מאובטחת · ₪${amount.toLocaleString("he-IL")}`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
