import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, BookOpen, Disc, GraduationCap, Gift, Star, ShoppingCart, Monitor, FileText } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useProducts, useProductCategories, type Product } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const categoryIcons: Record<string, any> = {
  courses: Monitor,
  books: BookOpen,
  discs: Disc,
  "digital-books": FileText,
  "learning-tools": GraduationCap,
  "upcoming-books": Star,
  bundles: Gift,
  subscription: ShoppingBag,
};

const categoryDescriptions: Record<string, string> = {
  books: "ספרי פרשנות, עיון ולימוד מבית בני ציון",
  discs: "הרצאות ושיעורים מוקלטים על גבי דיסק",
  "learning-tools": "כלי עזר ומשאבים ללימוד יומיומי",
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
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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

const defaultCategories = [
  { key: "books", label: "ספרים", icon: BookOpen, desc: "ספרי פרשנות, עיון ולימוד" },
  { key: "discs", label: "דיסקים", icon: Disc, desc: "הרצאות ושיעורים מוקלטים" },
  { key: "learning-tools", label: "מוצרי לימוד", icon: GraduationCap, desc: "כלי עזר ומשאבים" },
];

const StorePage = () => {
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const { data: categories, isLoading: catLoading } = useProductCategories();
  const { data: products, isLoading } = useProducts(activeCategory);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
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
            <h1 className="text-4xl md:text-5xl font-heading text-foreground mb-4">
              ספרים, דיסקים ומוצרי לימוד
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              מגוון ספרי פרשנות מקורית על התנ״ך, הרצאות מוקלטות וכלי עזר ללימוד — הכל ממכון בני ציון
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Cards */}
      <section className="py-10 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(categories && categories.length > 0 ? categories.map(cat => ({
              key: cat.slug,
              label: cat.name,
              icon: categoryIcons[cat.slug] || BookOpen,
              desc: categoryDescriptions[cat.slug] || cat.description || "",
            })) : defaultCategories).map((cat, i) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <motion.button
                  key={cat.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveCategory(isActive ? undefined : cat.key)}
                  className={`p-6 rounded-2xl border text-right transition-all ${
                    isActive
                      ? "bg-primary/10 border-primary/30 shadow-md"
                      : "bg-card border-border/50 hover:border-primary/20 hover:shadow-sm"
                  }`}
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-1">{cat.label}</h3>
                  <p className="text-sm text-muted-foreground">{cat.desc}</p>
                </motion.button>
              );
            })}
          </div>
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
            {(categories || []).map((cat) => {
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

      {/* Products Grid */}
      <section className="py-12 section-gradient-warm min-h-[60vh]">
        <div className="container">
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
