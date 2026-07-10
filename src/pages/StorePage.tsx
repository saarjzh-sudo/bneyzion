import { useMemo, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, BookOpen, Disc, GraduationCap, Gift, Star, ShoppingCart, Monitor, FileText, Flame, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import heroWatercolorStore from "@/assets/hero-watercolor-store.webp";
import { useProducts, useProductCategories, type Product } from "@/hooks/useProducts";
import { getUpcomingHoliday } from "@/lib/holidays";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

// keys = actual product_categories.slug values in the DB
const categoryIcons: Record<string, any> = {
  courses: Monitor,
  books: BookOpen,
  "books-digital": FileText,
  upcoming: Star,
  membership: ShoppingBag,
  events: GraduationCap,
  discs: Disc,
  bundles: Gift,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

function ProductCard({ product, index }: { product: Product; index: number }) {
  const { addItem } = useCart();
  const hasDiscount = product.original_price && product.original_price > product.price;

  return (
    <motion.div variants={fadeUp} custom={index}>
      <Link
        to={`/store/${product.slug}`}
        className="glass-card-light rounded-2xl overflow-hidden block group hover:shadow-lg hover:border-primary/20 transition-all"
      >
        <div className="aspect-square bg-secondary/30 relative overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-3 right-3 bg-destructive text-destructive-foreground border-0 text-xs">
              מבצע!
            </Badge>
          )}
          {product.is_digital && (
            <Badge variant="secondary" className="absolute top-3 left-3 text-xs">
              דיגיטלי
            </Badge>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-heading text-primary">₪{product.price.toFixed(0)}</span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                ₪{product.original_price!.toFixed(0)}
              </span>
            )}
          </div>
          {product.page_count && (
            <p className="text-xs text-muted-foreground mt-1">{product.page_count} עמודים</p>
          )}
          <Button
            size="sm"
            className="w-full mt-2 font-display text-xs"
            onClick={(e) => { e.preventDefault(); addItem(product); }}
          >
            <ShoppingCart className="h-3.5 w-3.5 ml-1" />
            הוסף לעגלה
          </Button>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── (יואב 9.7 / משימה 16) קטלוג: סליידר מוצרים אופקי ─────────────────────────

function ProductSlider({
  title,
  icon: Icon,
  products,
}: {
  title: string;
  icon: any;
  products: Product[];
}) {
  if (products.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="font-display text-xl text-foreground mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
        {products.map((p, i) => (
          <div key={p.id} className="w-44 md:w-52 shrink-0 snap-start">
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}

const StorePage = () => {
  useSEO({
    title: "חנות הספרים",
    description: "ספרי תנ״ך, מגילות, קורסים וימי עיון של עמותת בני ציון – הוצאת מכלל יופי.",
    url: "https://bneyzion.co.il/store",
  });
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const { data: categories, isLoading: catLoading } = useProductCategories();
  const { data: products, isLoading } = useProducts(activeCategory);
  // כל המוצרים הפעילים — לקטלוג (ספירות-קטגוריה, מבצעים, מועד קרוב)
  const { data: allProducts } = useProducts(undefined);

  // ספירת מוצרים פעילים לקטגוריה — קטגוריה ריקה (ימי-עיון שעברו) לא מוצגת כלל
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of allProducts ?? []) {
      if (p.category_id) m.set(p.category_id, (m.get(p.category_id) ?? 0) + 1);
    }
    return m;
  }, [allProducts]);
  const visibleCategories = (categories || []).filter((c) => (categoryCounts.get(c.id) ?? 0) > 0);

  // סליידר מבצעים — מוצרים עם מחיר-לפני-הנחה
  const saleProducts = useMemo(
    () => (allProducts ?? []).filter((p) => p.original_price && p.original_price > p.price),
    [allProducts],
  );

  // סליידר "לקראת המועד" — התאמת מונחי המועד הקרוב (hebcal) לכותרות המוצרים
  const holiday = useMemo(() => getUpcomingHoliday(30), []);
  const holidayProducts = useMemo(() => {
    if (!holiday) return [];
    return (allProducts ?? []).filter((p) =>
      holiday.terms.some((t) => p.title.includes(t)),
    );
  }, [allProducts, holiday]);

  const isCatalog = !activeCategory;

  return (
    <Layout sidebar={false}>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
        {/* רמה 13: שכבת אקוורל-זהב מתחת להירו — הקו של יואב */}
        <img src={heroWatercolorStore} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="container relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-display mb-6">
              <ShoppingBag className="h-4 w-4" />
              החנות של בני ציון
            </div>
            <h1 className="text-4xl md:text-5xl font-kedem-hollow-aaa mb-4 text-foreground">
              ספרי תנ״ך מבית בני ציון
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              ספרי פרשנות מקוריים, מגילות, קורסים דיגיטליים וימי עיון — הכל מבית בני ציון
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="py-4 border-b border-border/50 sticky top-16 z-30 bg-background/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(undefined)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-display transition-all ${
                !activeCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              כל המוצרים
            </button>
            {visibleCategories.map((cat) => {
              const Icon = categoryIcons[cat.slug] || BookOpen;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-display transition-all flex items-center gap-1.5 ${
                    activeCategory === cat.slug
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.name}
                </button>
              );
            })}
            <span className="text-sm text-muted-foreground mr-auto">
              {products ? `${products.length} מוצרים` : ""}
            </span>
          </div>
        </div>
      </section>

      {/* ── (יואב 9.7) קטלוג בדף-הבית של החנות: אייקוני-קטגוריות + סליידרים ── */}
      {isCatalog && !isLoading && !catLoading && (
        <section className="py-10 border-b border-border/40">
          <div className="container">
            {/* אייקוני קטגוריות */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
              {visibleCategories.map((cat, i) => {
                const Icon = categoryIcons[cat.slug] || BookOpen;
                return (
                  <motion.button
                    key={cat.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    onClick={() => setActiveCategory(cat.slug)}
                    className="glass-card-light rounded-2xl p-5 text-center group hover:shadow-lg hover:border-primary/30 transition-all"
                  >
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="block font-display text-sm text-foreground">{cat.name}</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {categoryCounts.get(cat.id)} מוצרים
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* סליידר מועד קרוב */}
            {holiday && holidayProducts.length > 0 && (
              <ProductSlider
                title={`לקראת ${holiday.name}`}
                icon={Sparkles}
                products={holidayProducts}
              />
            )}

            {/* סליידר מבצעים */}
            <ProductSlider title="מבצעים" icon={Flame} products={saleProducts} />
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section className="py-12 section-gradient-warm min-h-[60vh]">
        <div className="container">
          {isCatalog && !isLoading && (
            <h2 className="font-display text-xl text-foreground mb-6">כל המוצרים</h2>
          )}
          {isLoading || catLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-display text-muted-foreground mb-2">אין מוצרים בקטגוריה זו</p>
              <p className="text-sm text-muted-foreground">מוצרים חדשים יתווספו בקרוב</p>
              <Button variant="outline" className="mt-4" onClick={() => setActiveCategory(undefined)}>
                הצג את כל המוצרים
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default StorePage;
