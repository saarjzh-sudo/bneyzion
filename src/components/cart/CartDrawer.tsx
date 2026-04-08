import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal, totalItems } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col" dir="rtl">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">
            עגלת קניות ({totalItems})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 opacity-30" />
            <p className="font-display">העגלה ריקה</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 p-3 rounded-xl bg-secondary/50">
                  {item.product.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-display line-clamp-2">{item.product.title}</h4>
                    <p className="text-sm font-heading text-primary mt-1">
                      ₪{(item.product.price * item.quantity).toFixed(0)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 mr-auto"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex justify-between text-lg font-heading">
                <span>סה״כ</span>
                <span className="text-primary">₪{subtotal.toFixed(0)}</span>
              </div>
              <Button asChild className="w-full font-display" size="lg">
                <Link to="/checkout" onClick={() => setIsOpen(false)}>
                  לתשלום
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
