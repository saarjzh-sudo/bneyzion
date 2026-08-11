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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Truck, MapPin, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { useToast } from "@/hooks/use-toast";
import { type ShippingMethod } from "@/config/shipping";
// רמה 13: מחירי המשלוח נערכים ממרכז-השליטה (copy.shipping.options, fallback לקונפיג)
import { useShippingOptions } from "@/hooks/useShippingOptions";
// יואב 13.7: נקודות-איסוף מנוהלות באדמין — הרוכש בוחר מהפעילות בלבד.
import { usePublicSalePoints } from "@/hooks/useSalePoints";

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
  // רמה 18 (יואב 14.7): תשלומים גם בקנייה-מהירה — אחיד עם רכישת-העגלה
  const [installments, setInstallments] = useState("1");

  // Country is hardcoded to Israel — shipping is Israel-only.
  const country = "ישראל";

  const [tosAccepted, setTosAccepted] = useState(false);
  const { startPayment, isLoading, isReady, lastOrderIdRef } = useGrowPayment();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { options: shippingOptions, getPrice: getShippingPrice } = useShippingOptions();
  const { data: salePoints = [] } = usePublicSalePoints();
  const [pickupPointId, setPickupPointId] = useState<string>("");
  const pickupPoint = salePoints.find((p) => p.id === pickupPointId);
  const shippingPrice = isPhysical ? getShippingPrice(shippingMethod) : 0;
  const totalPrice = productPrice + shippingPrice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // יואב 14.7: מייל = חובה. בלעדיו אין קבלה, אין מעקב, ואין מסירת קובץ דיגיטלי.
    if (!firstName || !lastName || !phone || !email) {
      toast({ title: "יש למלא שם פרטי, שם משפחה, טלפון ואימייל", variant: "destructive" });
      return;
    }
    if (!tosAccepted) {
      toast({
        title: "יש לאשר את התקנון לפני המשך לתשלום",
        variant: "destructive",
      });
      return;
    }
    // איסוף עצמי בלי בחירת נקודה = הזמנה בלי כתובת ובלי איש קשר (הרכישה של
    // 11.8 נשמרה כ"איסוף עצמי" בלבד). כשיש נקודות מוגדרות — הבחירה חובה.
    if (isPhysical && shippingMethod === "pickup" && salePoints.length > 0 && !pickupPoint) {
      toast({
        title: "יש לבחור נקודת איסוף",
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
    const pickupLabel = pickupPoint
      ? `איסוף עצמי — ${pickupPoint.name}${pickupPoint.city ? `, ${pickupPoint.city}` : ""}`
      : "איסוף עצמי";
    const shippingNote = isPhysical
      ? `משלוח: ${shippingMethod === "pickup" ? pickupLabel : `${street}, ${city}${zip ? " " + zip : ""}`}`
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
        installments: Number(installments),
        thankYouType: "store",
        meta: {
          product: `store:${productSlug}`, // prefixed so webhook knows source=products table
          tos_accepted: true,
          tos_accepted_at: new Date().toISOString(),
          // country always Israel — shipping is Israel-only
          // (sent as string field for Grow audit trail)
          ...(isPhysical
            ? {
                shipping_method: shippingMethod,
                shipping_address: shippingMethod === "pickup" ? pickupLabel : street,
                shipping_city: shippingMethod === "pickup" ? undefined : city,
                shipping_zip: shippingMethod === "pickup" ? undefined : zip,
              }
            : {}),
        } as any,
      });
      setOpen(false);
      // רמה 17: מעבר לדף התודה עם מזהה ההזמנה — שם מחכים הקבצים הדיגיטליים
      const orderId = lastOrderIdRef.current;
      navigate(`/thank-you?type=store${orderId ? `&orders=${orderId}` : ""}`);
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
      setInstallments("1");
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
                <Label htmlFor="sc-last">שם משפחה *</Label>
                <Input
                  id="sc-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="ישראלי"
                  required
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
              <Label htmlFor="sc-email">אימייל *</Label>
              <Input
                id="sc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                required
              />
              <p className="text-xs text-muted-foreground">לקבלה, לעדכוני משלוח ולקבצים דיגיטליים</p>
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
                  {shippingOptions.map((opt) => (
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
                  salePoints.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">בחרו נקודת איסוף:</p>
                      {salePoints.map((p) => (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            pickupPointId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="pickup-point"
                            value={p.id}
                            checked={pickupPointId === p.id}
                            onChange={() => setPickupPointId(p.id)}
                            className="accent-primary mt-1"
                          />
                          <div>
                            <p className="text-sm font-display">{p.name}</p>
                            {(p.address || p.city) && (
                              <p className="text-xs text-muted-foreground">{[p.address, p.city].filter(Boolean).join(", ")}</p>
                            )}
                            {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                      נציגנו ייצרו איתך קשר לתיאום מועד האיסוף.
                    </p>
                  )
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

          {/* Installments — רמה 18: אחיד עם רכישת-העגלה */}
          <div className="space-y-1.5">
            <Label>מספר תשלומים</Label>
            <Select value={installments} onValueChange={setInstallments}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n === 1 ? "תשלום אחד" : `${n} תשלומים`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {Number(installments) > 1 && (
              <p className="text-xs text-muted-foreground">
                {installments} תשלומים של ₪{(totalPrice / Number(installments)).toFixed(0)}
              </p>
            )}
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
