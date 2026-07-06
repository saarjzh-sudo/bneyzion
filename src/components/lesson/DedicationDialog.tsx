import { useMemo, useState } from "react";
import { Heart, Flame, BookOpen, ShieldCheck, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useCreateDedication,
  useDedicationSettings,
  type DedicationScope,
  type DedicationType,
} from "@/hooks/useLessonDedications";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DedicationPreview from "@/components/lesson/DedicationPreview";

const TYPES: { value: DedicationType; label: string; icon: typeof Flame; placeholder: string }[] = [
  { value: "iluy_neshama", label: "לעילוי נשמת", icon: Flame, placeholder: "שם הנפטר/ת..." },
  { value: "refua", label: "לרפואה שלמה", icon: Heart, placeholder: "שם החולה..." },
  { value: "memory", label: "לזכרון", icon: BookOpen, placeholder: "שם המוקדש..." },
];

export interface DedicationDialogProps {
  lessonId: string;
  lessonTitle: string;
  /** אם קיימים — מאפשר למשתמש לבחור להקדיש את הסדרה כולה במקום שיעור בודד. */
  seriesId?: string;
  seriesTitle?: string;
}

export default function DedicationDialog({
  lessonId,
  lessonTitle,
  seriesId,
  seriesTitle,
}: DedicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<DedicationScope>("lesson");
  const [type, setType] = useState<DedicationType>("iluy_neshama");
  const [name, setName] = useState("");
  const [dedicator, setDedicator] = useState("");
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const { mutateAsync: createDedication } = useCreateDedication();
  const { data: settings } = useDedicationSettings();
  const { startPayment, isLoading, isReady } = useGrowPayment();
  const { user } = useAuth();
  const { toast } = useToast();

  const selectedType = TYPES.find((t) => t.value === type)!;
  const canChooseSeries = !!seriesId;

  const amount = useMemo(() => {
    if (!settings) return scope === "series" ? 1800 : 600;
    return scope === "series" ? settings.series_price : settings.lesson_price;
  }, [settings, scope]);

  const targetTitle = scope === "series" ? seriesTitle || lessonTitle : lessonTitle;

  const resetForm = () => {
    setName("");
    setDedicator("");
    setMessage("");
    setFullName("");
    setPhone("");
    setEmail("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "נא למלא שם", variant: "destructive" });
      return;
    }
    // ⏸️ הקדשה בתשלום מושהית זמנית — מסלול הסליקה יופעל בנפרד כדי לא להשפיע על קמפיין חי.
    // הדיאלוג והתצוגה-המקדימה פעילים; ההפעלה בפועל של התשלום תיפתח בקרוב.
    toast({
      title: "מערכת ההקדשות בתשלום תיפתח בקרוב 🙏",
      description: "בינתיים אפשר להקדיש שיעור או סדרה דרך הנהלת האתר.",
    });
    return;

    // eslint-disable-next-line no-unreachable
    if (!fullName.trim() || !phone.trim()) {
      toast({ title: "נא למלא שם מלא וטלפון לתשלום", variant: "destructive" });
      return;
    }
    if (!isReady) {
      toast({ title: "מערכת התשלומים עדיין נטענת — נסו שוב בעוד רגע", variant: "destructive" });
      return;
    }

    try {
      // Step 1: create a "pending" dedication row — becomes "active" once the
      // Grow payment webhook confirms the charge (matched by payment_asmachta).
      const created = await createDedication({
        scope,
        lesson_id: scope === "lesson" ? lessonId : undefined,
        series_id: scope === "series" ? seriesId : undefined,
        dedication_type: type,
        dedicated_name: name.trim(),
        dedicator_name: dedicator.trim() || undefined,
        message: message.trim() || undefined,
        amount,
        user_id: user?.id,
        status: "pending",
      });

      // Step 2: kick off payment. Metadata carries everything the webhook
      // needs to flip this dedication row to "active".
      await startPayment({
        sum: amount,
        description: `הקדשת ${scope === "series" ? "סדרה" : "שיעור"}: ${targetTitle}`,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        type: "product",
        thankYouType: "cart",
        meta: {
          product: "dedication",
          session_title: targetTitle,
          user_id: user?.id,
          tos_accepted: true,
          tos_accepted_at: new Date().toISOString(),
        },
        donationMeta: {
          dedication_type: type,
          dedication_name: name.trim(),
          donor_email: email.trim() || undefined,
          user_id: user?.id,
        },
      });

      toast({ title: "התשלום עבר בהצלחה, ההקדשה מאושרת" });
      setOpen(false);
      resetForm();
      void created;
    } catch (err: any) {
      toast({
        title: "התשלום לא הושלם",
        description: err?.message || "ההקדשה נשמרה כממתינה — נסו שוב או צרו קשר",
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
        <Button variant="outline" size="sm" className="gap-2">
          <Heart className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          הקדש שיעור
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">הקדשת שיעור</DialogTitle>
          <DialogDescription>{lessonTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Scope: lesson vs whole series */}
          {canChooseSeries && (
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
                השיעור הזה בלבד
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
                כל הסדרה
              </button>
            </div>
          )}

          {/* Dedication type */}
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="סוג ההקדשה">
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

          <div>
            <Label htmlFor="ded-message">הודעה אישית (רשות)</Label>
            <Textarea
              id="ded-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="תוכן ההקדשה..."
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Live preview — single source with the badge that shows on the lesson */}
          <DedicationPreview
            variant="preview"
            data={{ dedication_type: type, dedicated_name: name, dedicator_name: dedicator, message }}
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

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full font-display gap-2">
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
