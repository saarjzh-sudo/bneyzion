import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { Check, Star, Crown, BookOpen, Users, Headphones, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSEO } from "@/hooks/useSEO";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingTier {
  id: string;
  name: string;
  icon: React.ReactNode;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  badge?: string;
  highlighted?: boolean;
  features: PlanFeature[];
  ctaText: string;
  ctaLink: string;
}

const tiers: PricingTier[] = [
  {
    id: "free",
    name: "חינם",
    icon: <BookOpen className="w-7 h-7" />,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "גישה בסיסית לתוכן נבחר — התחילו ללמוד עוד היום",
    features: [
      { text: "10 שיעורים נבחרים בחודש", included: true },
      { text: "גישה לפרשת השבוע", included: true },
      { text: "חיפוש בספרייה", included: true },
      { text: "שמירת מועדפים (עד 5)", included: true },
      { text: "שיעורים מוקלטים ללא הגבלה", included: false },
      { text: "קבוצת וואטסאפ", included: false },
      { text: "הורדת שיעורים", included: false },
      { text: "תוכן בלעדי", included: false },
    ],
    ctaText: "התחילו בחינם",
    ctaLink: "/auth",
  },
  {
    id: "basic",
    name: "הפרק השבועי",
    icon: <Star className="w-7 h-7" />,
    monthlyPrice: 110,
    yearlyPrice: 110,
    description: "תכנית לימוד שבועית — פרקי תנ״ך עם הרב יואב אוריאל",
    badge: "פופולרי",
    highlighted: true,
    features: [
      { text: "שיעור זום שבועי חי", included: true },
      { text: "גישה לפרשת השבוע", included: true },
      { text: "תכני בסיס + העמקה", included: true },
      { text: "הקלטות שיעורים", included: true },
      { text: "פורטל לומדים אישי", included: true },
      { text: "קבוצת וואטסאפ", included: true },
      { text: "ביטול בכל עת", included: true },
      { text: "כל ספרי נביאים וכתובים", included: true },
    ],
    ctaText: "הצטרפו לתכנית",
    ctaLink: "/chapter-weekly",
  },
  {
    id: "premium",
    name: "מגילת אסתר",
    icon: <Crown className="w-7 h-7" />,
    monthlyPrice: 110,
    yearlyPrice: 110,
    description: "תכנית המנויים — לחיות תנ״ך עם הרב יואב אוריאל",
    features: [
      { text: "כל השיעורים ללא הגבלה", included: true },
      { text: "גישה לפרשת השבוע", included: true },
      { text: "חיפוש בספרייה", included: true },
      { text: "שמירת מועדפים ללא הגבלה", included: true },
      { text: "שיעורים מוקלטים ללא הגבלה", included: true },
      { text: "קבוצת וואטסאפ VIP", included: true },
      { text: "תכנים בלעדיים", included: true },
      { text: "מפגשים חיים", included: true },
    ],
    ctaText: "להצטרפות",
    ctaLink: "/megilat-esther",
  },
];

// CSS-only fade-in via Tailwind animate-in (no framer-motion dependency)

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useSEO({
    title: "מסלולים ומחירים — בני ציון",
    description: "הצטרפו לתכנית הפרק השבועי של הרב יואב אוריאל — לימוד תנ״ך שבועי בזום, תכני העמקה ופורטל אישי. החל מ-₪110/חודש.",
    url: "https://bneyzion.co.il/pricing",
  });

  return (
    <Layout>
      <PageHero
        title="בחרו את המסלול שלכם"
        subtitle="למדו תנ״ך בקצב שלכם — בכל מקום, בכל זמן"
      />

      {/* Billing toggle */}
      <section className="py-10 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300",
                billing === "monthly"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              חודשי
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 relative",
                billing === "yearly"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              שנתי
              <span className="absolute -top-3 -left-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                חיסכון 20%
              </span>
            </button>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={cn(
                  "relative rounded-2xl border p-8 flex flex-col transition-all duration-300",
                  tier.highlighted
                    ? "bg-card border-accent shadow-xl scale-[1.03] ring-2 ring-accent/30"
                    : "bg-card border-border shadow-md hover:shadow-lg"
                )}
              >
                {/* Badge */}
                {tier.badge && (
                  <Badge className="absolute -top-3 right-6 bg-accent text-accent-foreground px-4 py-1 text-sm font-bold shadow-md">
                    {tier.badge}
                  </Badge>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4",
                      tier.highlighted
                        ? "bg-accent/20 text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tier.icon}
                  </div>
                  <h3 className="text-2xl font-heading text-foreground mb-1">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-foreground">
                      {billing === "monthly" ? tier.monthlyPrice : tier.yearlyPrice}
                    </span>
                    <span className="text-lg text-muted-foreground font-medium">
                      {tier.monthlyPrice === 0 ? "" : "₪"}
                    </span>
                  </div>
                  {tier.monthlyPrice > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {billing === "monthly" ? "לחודש" : "לחודש (חיוב שנתי)"}
                    </p>
                  )}
                  {billing === "yearly" && tier.yearlyPrice > 0 && (
                    <p className="text-xs text-accent font-semibold mt-1">
                      חיסכון של {(tier.monthlyPrice - tier.yearlyPrice) * 12}₪ בשנה
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                          feature.included
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground/40"
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          feature.included ? "text-foreground" : "text-muted-foreground/50 line-through"
                        )}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "w-full text-base font-bold rounded-xl",
                    tier.highlighted
                      ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
                      : ""
                  )}
                  variant={tier.highlighted ? "default" : "outline"}
                >
                  <a href={tier.ctaLink}>{tier.ctaText}</a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="py-12 px-4 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: <Shield className="w-8 h-8" />, title: "ביטול בכל עת", desc: "ללא התחייבות, ללא אותיות קטנות" },
              { icon: <Headphones className="w-8 h-8" />, title: "תמיכה מלאה", desc: "צוות התמיכה שלנו זמין עבורכם" },
              { icon: <Users className="w-8 h-8" />, title: "קהילת לומדים", desc: "הצטרפו לאלפי לומדים ברחבי העולם" },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  {item.icon}
                </div>
                <h4 className="font-bold text-foreground">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ-style note */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground text-sm leading-relaxed">
            כל המסלולים כוללים גישה מלאה לאפליקציה • אפשר לשדרג או לבטל בכל רגע
            <br />
            לשאלות נוספות{" "}
            <a href="/contact" className="text-primary underline hover:no-underline">
              צרו קשר
            </a>
          </p>
        </div>
      </section>
    </Layout>
  );
}
