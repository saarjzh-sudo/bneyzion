import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Truck, MapPin, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useToast } from "@/hooks/use-toast";
import {
  SHIPPING_OPTIONS,
  getShippingPrice,
  type ShippingMethod,
} from "@/config/shipping";

export interface StoreCheckoutDialogProps {
  /** Product slug from the `products` table. */
  productSlug: string;
  /** Product display name. */
  productTitle: string;
  /** Base price of the product (before shipping). */
  productPrice: number;
  /** Whether the product requires a physical shipping address. */
  isPhysical: boolean;
  /** Trigger element (button or any clickable). */
  children: React.ReactNode;
}

export function StoreCheckoutDialog({
  productSlug,
  productTitle,
  productPrice,
  isPhysical,
  children,
}: StoreCheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Shipping
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(
    isPhysical ? "registered_mail" : "pickup"
  );
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");

  // Country is hardcoded to Israel — shipping is Israel-only.
  const country = "ישראל";

  const [tosAccepted, setTosAccepted] = useState(false);
  const { startPayment, isLoading, isReady } = useGrowPayment();
  const { toast } = useToast();

  const shippingPrice = isPhysical ? getShippingPrice(shippingMethod) : 0;
  const totalPrice = productPrice + shippingPrice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName || !phone) {
      toast({ title: "יש למלא שם פרטי וטלפון", variant: "destructive" });
      return;
    }
    if (!tosAccepted) {
      toast({
        title: "יש לאשר את התקנון לפני המשך לתשלום",
        variant: "destructive",
      });
      return;
    }
    if (isPhysical && shippingMethod !== "pickup" && (!street || !city)) {
      toast({ title: "יש למלא כתובת למשלוח", variant: "destructive" });
      return;
    }
    if (!isReady) {
      toast({
        title: "מערכת התשלומים עדיין נטענת — נסו שוב בעוד רגע",
        variant: "destructive",
      });
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const shippingNote = isPhysical
      ? `משלוח: ${shippingMethod === "pickup" ? "איסוף עצמי" : `${street}, ${city}${zip ? " " + zip : ""}`}`
      : "";
    const descriptionParts = [productTitle];
    if (shippingNote) descriptionParts.push(shippingNote);
    if (notes) descriptionParts.push(`הערות: ${notes}`);
    const description = descriptionParts.join(" | ");

    try {
      await startPayment({
        sum: totalPrice,
        description,
        fullName,
        phone,
        email: email || undefined,
        type: "product",
        meta: {
          product: `store:${productSlug}`, // prefixed so webhook knows source=products table
          tos_accepted: true,
          tos_accepted_at: new Date().toISOString(),
          // country always Israel — shipping is Israel-only
          // (sent as string field for Grow audit trail)
        } as any,
      });
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "התשלום נכשל",
        description: err?.message || "נסו שוב או צרו קשר",
        variant: "destructive",
      });
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    // Reset form on close
    if (!v) {
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setStreet("");
      setCity("");
      setZip("");
      setNotes("");
      setTosAccepted(false);
      setShippingMethod(isPhysical ? "registered_mail" : "pickup");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-lg font-heading">
            רכישת {productTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-1">
          {/* Personal details */}
          <div className="space-y-3">
            <p className="text-sm font-display text-muted-foreground">פרטים אישיים</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sc-first">שם פרטי *</Label>
                <Input
                  id="sc-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="ישראל"
                  required
                  dir="rtl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-last">שם משפחה</Label>
                <Input
                  id="sc-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="ישראלי"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-phone">טלפון *</Label>
              <Input
                id="sc-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-email">אימייל (לשליחת קבלה)</Label>
              <Input
                id="sc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-country">מדינה</Label>
              <Input
                id="sc-country"
                value={country}
                readOnly
                dir="rtl"
                className="bg-muted/40 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">משלוח זמין לישראל בלבד</p>
            </div>
          </div>

          {/* Shipping (physical products only) */}
          {isPhysical && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-display text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-4 w-4" />
                  אפשרויות משלוח
                </p>
                <div className="space-y-2">
                  {SHIPPING_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        shippingMethod === opt.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shipping"
                          value={opt.id}
                          checked={shippingMethod === opt.id}
                          onChange={() => setShippingMethod(opt.id)}
                          className="accent-primary"
                        />
                        <div>
                          <p className="text-sm font-display">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.sublabel}</p>
                        </div>
                      </div>
                      <span className="text-sm font-heading text-primary">
                        {opt.price === 0 ? "חינם" : `₪${opt.price}`}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Address fields — hidden for pickup */}
                {shippingMethod !== "pickup" && (
                  <div className="space-y-3 pt-1">
                    <p className="text-sm font-display text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      כתובת למשלוח
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc-street">רחוב ומספר *</Label>
                      <Input
                        id="sc-street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="הרצל 1"
                        required
                        dir="rtl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="sc-city">עיר *</Label>
                        <Input
                          id="sc-city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="ירושלים"
                          required
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sc-zip">מיקוד</Label>
                        <Input
                          id="sc-zip"
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                          placeholder="9100000"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {shippingMethod === "pickup" && (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    נציגנו ייצרו איתך קשר לתיאום מועד האיסוף.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="sc-notes">הערות (אופציונלי)</Label>
            <Input
              id="sc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות לגבי ההזמנה..."
              dir="rtl"
            />
          </div>

          <Separator />

          {/* Price summary */}
          <div className="rounded-xl bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">מחיר המוצר</span>
              <span>₪{productPrice.toFixed(0)}</span>
            </div>
            {isPhysical && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">משלוח</span>
                <span>{shippingPrice === 0 ? "חינם" : `₪${shippingPrice}`}</span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between font-heading">
              <span>סה״כ לתשלום</span>
              <span className="text-primary text-lg">₪{totalPrice.toFixed(0)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">המחיר כולל מע״מ</p>
          </div>

          {/* ToS + 18+ */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="sc-tos"
              checked={tosAccepted}
              onCheckedChange={(v) => setTosAccepted(!!v)}
            />
            <label
              htmlFor="sc-tos"
              className="text-sm leading-relaxed cursor-pointer select-none text-muted-foreground"
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
              <strong className="text-foreground">מלאו לי 18 שנים ומעלה</strong>
              , ומסכים/ה לקבלת עדכונים בנוגע לרכישה.
            </label>
          </div>

          {/* Security note */}
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            תשלום מאובטח דרך Grow / Meshulam · קבלה תישלח אוטומטית
          </div>

          <Button
            type="submit"
            disabled={isLoading || !isReady}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                מעבד...
              </>
            ) : !isReady ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                טוען מערכת תשלום...
              </>
            ) : (
              <>
                <Package className="ml-2 h-4 w-4" />
                {`המשך לתשלום · ₪${totalPrice.toLocaleString("he-IL")}`}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
