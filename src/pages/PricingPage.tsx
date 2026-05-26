import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { Check, X, Star, Crown, BookOpen, Users, Headphones, Shield, BookMarked } from "lucide-react";
// Note: BookMarked is used for the books tier icon
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  price: number | null;
  priceSuffix?: string;
  description: string;
  badge?: string;
  highlighted?: boolean;
  features: PlanFeature[];
  ctaText: string;
  ctaLink: string;
  accentClass?: string;
}

const tiers: PricingTier[] = [
  {
    id: "free",
    name: "ספרייה פתוחה",
    icon: <BookOpen className="w-7 h-7" />,
    price: 0,
    description: "אלפי שיעורים ב-24 ספרי תנ״ך — פתוחים לכולם, ללא הרשמה",
    features: [
      { text: "11,000+ שיעורים ב-24 ספרי תנ״ך", included: true },
      { text: "200+ רבנים ומרצים", included: true },
      { text: "חיפוש לפי ספר, פרק, רב", included: true },
      { text: "הורדת שיעורי שמע (MP3)", included: true },
      { text: "שיעור זום שבועי חי", included: false },
      { text: "פורטל לומדים אישי", included: false },
      { text: "קבוצת וואטסאפ", included: false },
      { text: "תכני העמקה ותרגול", included: false },
    ],
    ctaText: "לספרייה",
    ctaLink: "/series",
  },
  {
    id: "weekly",
    name: "תכנית הפרק השבועי",
    icon: <Star className="w-7 h-7" />,
    price: 110,
    priceSuffix: "לחודש",
    description: "פרק בשבוע עם הרב יואב אוריאל — שיעור זום חי, תכני העמקה ופורטל אישי",
    badge: "המסלול הפופולרי",
    highlighted: true,
    features: [
      { text: "כל תוכן הספרייה הפתוחה", included: true },
      { text: "שיעור זום שבועי חי (רביעי 21:00)", included: true },
      { text: "תכני בסיס + שכבת העמקה", included: true },
      { text: "הקלטות השיעורים הקודמים", included: true },
      { text: "פורטל לומדים אישי + מעקב התקדמות", included: true },
      { text: "קבוצת וואטסאפ", included: true },
      { text: "ביטול בכל עת — ללא קנס", included: true },
      { text: "כיסוי: נביאים, כתובים, חגי/זכריה/מלאכי", included: true },
    ],
    ctaText: "הצטרפו לתכנית",
    ctaLink: "/chapter-weekly",
    accentClass: "bg-accent/20 text-accent-foreground",
  },
  {
    id: "books",
    name: "ספרי מכלל יופי",
    icon: <BookMarked className="w-7 h-7" />,
    price: 70,
    priceSuffix: "לספר",
    description: "פרשנות מרתקת של הרב יואב אוריאל — סדרת ספרי תנ״ך מהודרים לקנייה חד-פעמית",
    features: [
      { text: "מגילת אסתר — ₪70 (עותק אחד)", included: true },
      { text: "זוג מגילות — ₪120", included: true },
      { text: "סדרת מכלל יופי (5 ספרים+שופטים) — ₪350", included: true },
      { text: "ביאור מלא לכל פסוק", included: true },
      { text: "משלוח עד הבית", included: true },
      { text: "שיעור זום שבועי חי", included: false },
      { text: "פורטל לומדים אישי", included: false },
      { text: "קבוצת וואטסאפ", included: false },
    ],
    ctaText: "לרכישת הספרים",
    ctaLink: "/megilat-esther",
  },
];

export default function PricingPage() {
  useSEO({
    title: "מסלולים ומחירים — בני ציון",
    description: "הצטרפו לתכנית הפרק השבועי של הרב יואב אוריאל — לימוד תנ״ך שבועי בזום, תכני העמקה ופורטל אישי. החל מ-₪110/חודש.",
    url: "https://bneyzion.co.il/pricing",
  });

  return (
    <Layout>
      <PageHero
        title="בחרו את המסלול שלכם"
        subtitle="11,000+ שיעורים פתוחים לכולם — ותכנית לימוד שבועית למי שרוצה יותר"
      />

      <section className="py-10 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
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
                  {tier.price === null || tier.price === 0 ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-foreground">חינם</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold text-foreground">{tier.price}₪</span>
                      </div>
                      {tier.priceSuffix && (
                        <p className="text-sm text-muted-foreground mt-1">{tier.priceSuffix}</p>
                      )}
                    </>
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
                        {feature.included
                          ? <Check className="w-3.5 h-3.5" />
                          : <X className="w-3 h-3" />
                        }
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          feature.included ? "text-foreground" : "text-muted-foreground/50"
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
