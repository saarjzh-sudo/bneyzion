import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Monitor, FileText, ShoppingCart, Package, Tag } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useProduct, useProducts } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProduct(slug || "");
  const { data: relatedProducts } = useProducts(
    product?.category?.slug
  );

  const related = relatedProducts?.filter((p) => p.id !== product?.id).slice(0, 4);
  const hasDiscount = product?.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-heading text-foreground mb-4">המוצר לא נמצא</h1>
          <Link to="/store" className="text-primary hover:underline">
            חזרה לחנות ←
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="container pt-6 pb-2">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/store" className="hover:text-primary transition-colors">
            החנות
          </Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          {product.category && (
            <>
              <Link
                to={`/store?category=${product.category.slug}`}
                className="hover:text-primary transition-colors"
              >
                {product.category.name}
              </Link>
              <ArrowRight className="h-3 w-3 rotate-180" />
            </>
          )}
          <span className="text-foreground line-clamp-1">{product.title}</span>
        </nav>
      </div>

      {/* Product Detail */}
      <section className="container py-8 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="glass-card-light rounded-2xl overflow-hidden aspect-square bg-secondary/20 relative">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-20 w-20 text-muted-foreground/20" />
                </div>
              )}
              {hasDiscount && (
                <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground rounded-full w-14 h-14 flex items-center justify-center text-sm font-heading">
                  -{discountPercent}%
                </div>
              )}
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-5"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-heading text-foreground mb-2">
                {product.title}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {product.category && (
                  <Badge variant="secondary" className="text-xs">
                    {product.category.name}
                  </Badge>
                )}
                {product.is_digital && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Monitor className="h-3 w-3" />
                    מוצר דיגיטלי
                  </Badge>
                )}
                {!product.is_digital && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Package className="h-3 w-3" />
                    משלוח עד הבית
                  </Badge>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="glass-card-gold rounded-xl p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-heading gradient-warm">₪{product.price.toFixed(0)}</span>
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    ₪{product.original_price!.toFixed(0)}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  חיסכון של ₪{(product.original_price! - product.price).toFixed(0)}
                </p>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description.replace(/&hellip;/g, '…').replace(/&amp;/g, '&') }} />
            )}

            {product.page_count && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{product.page_count} עמודים</span>
              </div>
            )}

            {/* CTA */}
            {product.source_url ? (
              <a
                href={product.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button size="lg" className="w-full text-base gap-2 py-6">
                  <ShoppingCart className="h-5 w-5" />
                  לרכישה
                </Button>
              </a>
            ) : (
              <Button size="lg" className="w-full text-base gap-2 py-6">
                <ShoppingCart className="h-5 w-5" />
                לרכישה
              </Button>
            )}

            {/* Content */}
            {product.content && (
              <div
                className="prose prose-sm max-w-none text-foreground/80 mt-6"
                dangerouslySetInnerHTML={{ __html: product.content }}
              />
            )}
          </motion.div>
        </div>
      </section>

      {/* Related Products */}
      {related && related.length > 0 && (
        <section className="py-12 section-gradient-warm">
          <div className="container max-w-5xl">
            <h2 className="text-xl font-heading gradient-warm mb-6">מוצרים נוספים</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p) => (
                <Link
                  key={p.id}
                  to={`/store/${p.slug}`}
                  className="glass-card-light rounded-2xl overflow-hidden block group hover:shadow-lg transition-all"
                >
                  <div className="aspect-square bg-secondary/30 overflow-hidden">
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-display text-foreground line-clamp-2 mb-1">
                      {p.title}
                    </h3>
                    <span className="text-sm font-heading text-primary">₪{p.price.toFixed(0)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default ProductPage;
