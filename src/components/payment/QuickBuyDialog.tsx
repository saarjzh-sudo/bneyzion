import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useToast } from "@/hooks/use-toast";

export interface QuickBuyDialogProps {
  /** Slug of the row in payment_products. Drives Smoove list + pageCode + table. */
  product: string;
  /** Final price (after promo). For subscriptions = monthly recurring amount. */
  amount: number;
  /** Description shown in Grow + saved to the order row. */
  description: string;
  /** Title shown at the top of the dialog. */
  title: string;
  /** One-line subtitle below the title (price line, what they get, etc). */
  subtitle?: string;
  /** Allowed installments (1 disables the field). Capped server-side too. */
  maxInstallments?: number;
  /** Trigger button — anything clickable. */
  children: React.ReactNode;
}

export function QuickBuyDialog({
  product,
  amount,
  description,
  title,
  subtitle,
  maxInstallments = 1,
  children,
}: QuickBuyDialogProps) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [installments, setInstallments] = useState(1);
  const [tosAccepted, setTosAccepted] = useState(false);
  const { startPayment, isLoading, isReady } = useGrowPayment();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !phone) {
      toast({ title: "יש למלא שם וטלפון", variant: "destructive" });
      return;
    }
    if (!tosAccepted) {
      toast({
        title: "יש לאשר את התקנון לפני המשך לתשלום",
        variant: "destructive",
      });
      return;
    }
    if (!isReady) {
      toast({
        title: "מערכת התשלומים עדיין נטענת — נסו שוב בעוד רגע",
        variant: "destructive",
      });
      return;
    }

    try {
      await startPayment({
        sum: amount,
        description,
        fullName,
        phone,
        email: email || undefined,
        type: "product", // Server resolves real flow from meta.product
        installments: installments > 1 ? installments : undefined,
        meta: {
          product,
          tos_accepted: true,
          tos_accepted_at: new Date().toISOString(),
        },
      });
      // On success the SDK either redirects (directDebit) or calls onSuccess
      // (wallet); the hook handles both. We just close the dialog.
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "התשלום נכשל",
        description: err?.message || "נסו שוב או צרו קשר",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{title}</DialogTitle>
          {subtitle && (
            <DialogDescription className="text-right">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="qb-name">שם מלא *</Label>
            <Input
              id="qb-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="שם פרטי ושם משפחה"
              required
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qb-phone">טלפון *</Label>
            <Input
              id="qb-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-0000000"
              required
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qb-email">אימייל (לשליחת קבלה)</Label>
            <Input
              id="qb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              dir="ltr"
            />
          </div>

          {maxInstallments > 1 && (
            <div className="space-y-2">
              <Label htmlFor="qb-installments">תשלומים</Label>
              <select
                id="qb-installments"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Array.from({ length: maxInstallments }, (_, i) => i + 1).map(
                  (n) => (
                    <option key={n} value={n}>
                      {n === 1 ? "תשלום אחד" : `${n} תשלומים`}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="qb-tos"
              checked={tosAccepted}
              onCheckedChange={(v) => setTosAccepted(!!v)}
            />
            <label
              htmlFor="qb-tos"
              className="text-sm leading-relaxed cursor-pointer select-none"
            >
              אני קראתי ומאשר/ת את{" "}
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary hover:opacity-80"
                onClick={(e) => e.stopPropagation()}
              >
                תקנון האתר ומדיניות הפרטיות
              </Link>
              ,{" "}
              <strong>מלאו לי 18 שנים ומעלה</strong>
              , ומסכים/ה לקבלת עדכונים בנוגע לרכישה.
            </label>
          </div>

          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            תשלום מאובטח דרך Grow / Meshulam · קבלה תישלח אוטומטית
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                מעבד...
              </>
            ) : (
              `המשך לתשלום · ₪${amount.toLocaleString("he-IL")}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
