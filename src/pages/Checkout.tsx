import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, CreditCard, Receipt, FileText, ArrowRight, Loader2, ShieldCheck, Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGrowPayment } from "@/hooks/useGrowPayment";
import { type ShippingMethod } from "@/config/shipping";
// רמה 13: מחירי המשלוח נערכים ממרכז-השליטה (copy.shipping.options, fallback לקונפיג)
import { useShippingOptions } from "@/hooks/useShippingOptions";
import { Link } from "react-router-dom";

export default function Checkout() {
  const { items, subtotal, productItems, donationItems, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { startPayment, isLoading: paymentLoading, isReady: paymentReady, error: paymentError, lastOrderIdRef } = useGrowPayment();
  const { options: SHIPPING_OPTIONS, getPrice: getShippingPrice, getLabel: getShippingLabel } = useShippingOptions();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    address: "", city: "", zip: "",
    installments: "1", notes: "",
  });
  const [tosAccepted, setTosAccepted] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("registered_mail");
  const [couponInput, setCouponInput] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);

  const needsShipping = productItems.some((i) => !i.product.is_digital);
  const shippingPrice = needsShipping ? getShippingPrice(shippingMethod) : 0;
  const productsSubtotal = productItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.discount, productsSubtotal) : 0;
  const grandTotal = subtotal - couponDiscount + shippingPrice;
  const needsAddress = needsShipping && shippingMethod !== "pickup";
  const isProcessing = loading || paymentLoading;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponChecking(true);
    try {
      const resp = await fetch("/api/store/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: productsSubtotal }),
      });
      const data = await resp.json();
      if (data.valid) {
        setAppliedCoupon({ code: data.code, discount: data.discount, label: data.label });
        toast({ title: `הקופון הופעל — ${data.label}` });
      } else {
        setAppliedCoupon(null);
        toast({ title: data.reason || "קוד הקופון אינו תקף", variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאה בבדיקת הקופון — נסו שוב", variant: "destructive" });
    } finally {
      setCouponChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tosAccepted) {
      toast({ title: "יש לאשר את התקנון לפני המשך לתשלום", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      // create-payment.ts (server-side, service_role) creates the orders rows.
      // We do NOT insert from the frontend — anon RLS blocks it and it would be a
      // duplicate anyway since create-payment.ts already handles the insert.
      const orderGroups = [
        { items: productItems, type: "product" as const },
        { items: donationItems, type: "donation" as const },
      ].filter((g) => g.items.length > 0);

      const completedOrderIds: string[] = [];
      for (const group of orderGroups) {
        const isProductGroup = group.type === "product";
        // Shipping fee + coupon discount apply to the physical-products group only.
        const groupShipping = isProductGroup && needsShipping ? shippingPrice : 0;
        const groupDiscount = isProductGroup ? couponDiscount : 0;
        const groupSubtotal = group.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
        const groupTotal = groupSubtotal - groupDiscount + groupShipping;

        // Build a description that includes item titles and, for physical products,
        // the shipping method + address so the webhook can store it.
        const itemTitles = group.items.map((i) => i.product.title).join(", ");
        const shippingPart = needsShipping && isProductGroup
          ? ` | משלוח: ${getShippingLabel(shippingMethod)}${
              needsAddress ? ` — ${form.address}, ${form.city}${form.zip ? " " + form.zip : ""}` : ""
            }`
          : "";
        const description = `${itemTitles}${shippingPart}`;

        // create-payment.ts will insert the orders row server-side with service_role.
        // Pass orderId: undefined so the server creates a fresh row.
        await startPayment({
          sum: groupTotal,
          description,
          fullName: form.name,
          phone: form.phone,
          email: form.email,
          type: group.type,
          installments: Number(form.installments),
          meta: {
            user_id: user?.id,
            tos_accepted: true,
            tos_accepted_at: new Date().toISOString(),
            // רמה 17 (יואב 14.7): פריטי הסל עוברים לשרת → order_items נוצרות
            // גם ברכישת-עגלה (קודם נוצרו רק בקנייה-מהירה) → גישה/קובץ/מעקב-משלוח
            ...(isProductGroup
              ? {
                  cart_items: group.items.map((i) => ({
                    product_id: i.product.id,
                    slug: i.product.slug,
                    title: i.product.title,
                    quantity: i.quantity,
                    unit_price: i.product.price,
                  })),
                }
              : {}),
            ...(needsShipping && isProductGroup
              ? {
                  shipping_method: shippingMethod,
                  shipping_address: needsAddress ? form.address : "איסוף עצמי",
                  shipping_city: needsAddress ? form.city : undefined,
                  shipping_zip: needsAddress ? form.zip : undefined,
                }
              : {}),
            ...(isProductGroup && appliedCoupon
              ? {
                  coupon_code: appliedCoupon.code,
                  pre_discount_sum: groupSubtotal,
                  shipping_fee: groupShipping,
                }
              : {}),
          },
        });
        if (lastOrderIdRef.current) completedOrderIds.push(lastOrderIdRef.current);
      }

      clearCart();
      toast({ title: "התשלום בוצע בהצלחה!" });
      navigate(
        `/thank-you?type=cart${completedOrderIds.length ? `&orders=${completedOrderIds.join(",")}` : ""}`,
      );
    } catch (err: any) {
      toast({ title: "שגיאה בתהליך התשלום", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout sidebar={false}>
        <div className="container py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-heading mb-2">העגלה ריקה</h1>
          <p className="text-muted-foreground mb-6">עדיין לא הוספת מוצרים לעגלה</p>
          <Button asChild><Link to="/store">לחנות</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout sidebar={false}>
      <div className="container py-10 max-w-4xl">
        <div className="flex items-center gap-2 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/store"><ArrowRight className="h-4 w-4 ml-1" />חזרה לחנות</Link>
          </Button>
        </div>
        <h1 className="text-3xl font-heading gradient-teal mb-8">סיכום הזמנה</h1>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-5 gap-8">
          {/* Form */}
          <div className="md:col-span-3 space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">פרטי הלקוח</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>שם מלא *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>טלפון *</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" dir="ltr" /></div>
                </div>
                <div><Label>אימייל *</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></div>
              </CardContent>
            </Card>

            {needsShipping && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    משלוח
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <RadioGroup
                    value={shippingMethod}
                    onValueChange={(v) => setShippingMethod(v as ShippingMethod)}
                    className="grid gap-2"
                  >
                    {SHIPPING_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        htmlFor={`ship-${opt.id}`}
                        className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-colors ${
                          shippingMethod === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={opt.id} id={`ship-${opt.id}`} />
                          <div>
                            <p className="text-sm font-display">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.sublabel}</p>
                          </div>
                        </div>
                        <span className="text-sm font-heading text-primary">
                          {opt.price > 0 ? `₪${opt.price}` : "חינם"}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>

                  {needsAddress && (
                    <div className="grid gap-4 pt-2 border-t">
                      <div><Label>כתובת *</Label><Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>עיר *</Label><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                        <div><Label>מיקוד</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} dir="ltr" /></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">תשלום</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <Label>מספר תשלומים</Label>
                  <Select value={form.installments} onValueChange={(v) => setForm({ ...form, installments: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n === 1 ? "תשלום אחד" : `${n} תשלומים`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display text-foreground mb-1">סליקה מאובטחת</p>
                    <p>התשלום מתבצע באמצעות מערכת Grow המאובטחת. תוכלו לשלם באשראי, ביט, Apple Pay או Google Pay.</p>
                  </div>
                </div>
                {paymentError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    {paymentError}
                  </div>
                )}
                <div><Label>הערות</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="md:col-span-2">
            <Card className="sticky top-24">
              <CardHeader><CardTitle className="font-heading text-lg">סיכום</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {productItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-display">מוצרים</span>
                      <Badge variant="outline" className="text-[10px]">חשבונית מס</Badge>
                    </div>
                    {productItems.map((i) => (
                      <div key={i.product.id} className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground">{i.product.title} ×{i.quantity}</span>
                        <span>₪{(i.product.price * i.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {donationItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="h-4 w-4 text-accent" />
                      <span className="text-sm font-display">תרומות / הקדשות</span>
                      <Badge variant="outline" className="text-[10px]">קבלה 46</Badge>
                    </div>
                    {donationItems.map((i) => (
                      <div key={i.product.id} className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground">{i.product.title} ×{i.quantity}</span>
                        <span>₪{(i.product.price * i.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {productItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="קוד קופון"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="h-9 font-mono"
                        dir="ltr"
                        disabled={!!appliedCoupon}
                      />
                      {appliedCoupon ? (
                        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0"
                          onClick={() => { setAppliedCoupon(null); setCouponInput(""); }}>
                          הסרה
                        </Button>
                      ) : (
                        <Button type="button" variant="secondary" size="sm" className="h-9 shrink-0"
                          onClick={applyCoupon} disabled={couponChecking || !couponInput.trim()}>
                          {couponChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "הפעלה"}
                        </Button>
                      )}
                    </div>
                    {appliedCoupon && (
                      <p className="text-xs text-primary">קופון {appliedCoupon.code} — {appliedCoupon.label}</p>
                    )}
                  </div>
                )}

                <Separator />
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>הנחת קופון ({appliedCoupon?.code})</span>
                    <span>-₪{couponDiscount.toFixed(0)}</span>
                  </div>
                )}
                {needsShipping && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">משלוח — {SHIPPING_OPTIONS.find((o) => o.id === shippingMethod)?.label}</span>
                    <span>{shippingPrice > 0 ? `₪${shippingPrice}` : "חינם"}</span>
                  </div>
                )}
                <div className="flex justify-between font-heading text-lg">
                  <span>סה״כ לתשלום</span>
                  <span className="text-primary">₪{grandTotal.toFixed(0)}</span>
                </div>
                {Number(form.installments) > 1 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {form.installments} תשלומים של ₪{(grandTotal / Number(form.installments)).toFixed(0)}
                  </p>
                )}

                <div className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="checkout-tos"
                    checked={tosAccepted}
                    onCheckedChange={(v) => setTosAccepted(!!v)}
                  />
                  <label htmlFor="checkout-tos" className="text-xs leading-relaxed cursor-pointer select-none text-muted-foreground">
                    אני מאשר/ת את{" "}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:opacity-80">
                      תקנון האתר
                    </Link>
                    {" "}ומדיניות הפרטיות, ומאשר/ת שאני מעל גיל 18.
                  </label>
                </div>

                <Button type="submit" size="lg" className="w-full font-display" disabled={isProcessing || !paymentReady || !tosAccepted}>
                  {isProcessing ? (
                    <><Loader2 className="h-4 w-4 animate-spin ml-2" />מעבד תשלום...</>
                  ) : !paymentReady ? (
                    <><Loader2 className="h-4 w-4 animate-spin ml-2" />טוען מערכת תשלום...</>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 ml-2" />
                      לתשלום ₪{grandTotal.toFixed(0)}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </Layout>
  );
}
