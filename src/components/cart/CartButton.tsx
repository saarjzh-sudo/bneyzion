import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function CartButton({ isTransparent }: { isTransparent?: boolean }) {
  const { totalItems, setIsOpen } = useCart();

  return (
    <button
      className={`relative p-2.5 rounded-xl transition-all ${
        isTransparent
          ? "text-white/70 hover:text-white hover:bg-white/10"
          : "text-muted-foreground hover:text-primary hover:bg-secondary"
      }`}
      onClick={() => setIsOpen(true)}
      aria-label="עגלת קניות"
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -left-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4.5 w-4.5 min-w-[18px] flex items-center justify-center px-1">
          {totalItems}
        </span>
      )}
    </button>
  );
}
