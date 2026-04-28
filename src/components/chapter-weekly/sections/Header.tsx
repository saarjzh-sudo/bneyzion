import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";
const Header = () => (
  <header className="py-2 md:py-3 px-4 bg-cream-warm border-b border-border/30">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-3">
        <img src="/lovable-uploads/logo-bney-zion.png" alt="לוגו בני ציון" className="h-20 md:h-24 transition-all duration-300 hover:scale-105" />
        <img src="/lovable-uploads/logo-livot-tanach.png" alt="לוגו לחיות תנ״ך - הפרק השבועי" className="h-16 md:h-20 transition-all duration-300 hover:scale-105" />
      </div>
      <SubscribeButton>
      <button type="button" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-all duration-300 hover:shadow-premium hover:scale-105">
        הצטרפות לתכנית
      </button>
    </SubscribeButton>
    </div>
  </header>
);

export default Header;
