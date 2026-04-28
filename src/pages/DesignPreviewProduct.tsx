/**
 * /design-product/:slug — Single product page, redesigned.
 *
 * Pulls the real product from Supabase by slug. Falls back to first
 * featured/active product if no slug.
 */
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  ShoppingBag,
  Heart,
  Share2,
  Download,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Truck,
  Lock,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useProduct, useProducts } from "@/hooks/useProducts";

export default function DesignPreviewProduct() {
  const { slug } = useParams<{ slug?: string }>();

  // If no slug, default to first featured product
  const { data: allProducts } = useProducts();
  const fallbackSlug = useMemo(() => {
    if (!allProducts?.length) return undefined;
    const featured = allProducts.find((p) => p.featured);
    return (featured || allProducts[0])?.slug;
  }, [allProducts]);

  const effectiveSlug = slug || fallbackSlug;
  const { data: product, isLoading } = useProduct(effectiveSlug || "");

  // Related products (same category)
  const related = useMemo(() => {
    if (!allProducts || !product) return [];
    return allProducts
      .filter((p) => p.id !== product.id && p.category_id === product.category_id)
      .slice(0, 4);
  }, [allProducts, product]);

  if (isLoading || !product) {
    return (
      <DesignLayout>
        <div
          style={{
            padding: "10rem 0",
            display: "flex",
            justifyContent: "center",
            background: colors.parchment,
          }}
        >
          <Loader2 style={{ width: 32, height: 32, color: colors.goldDark, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DesignLayout>
    );
  }

  const discount =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

  return (
    <DesignLayout>
      {/* Breadcrumbs */}
      <div
        dir="rtl"
        style={{
          background: colors.parchment,
          padding: "1.5rem 1.5rem 0",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            fontFamily: fonts.body,
            fontSize: "0.78rem",
            color: colors.textMuted,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flexWrap: "wrap",
          }}
        >
          <Link to="/" style={{ color: colors.textMuted, textDecoration: "none" }}>
            ראשי
          </Link>
          <ChevronRight style={{ width: 12, height: 12, transform: "rotate(180deg)" }} />
          <Link to="/design-store" style={{ color: colors.textMuted, textDecoration: "none" }}>
            חנות
          </Link>
          {product.category?.name && (
            <>
              <ChevronRight style={{ width: 12, height: 12, transform: "rotate(180deg)" }} />
              <span style={{ color: colors.goldDark, fontWeight: 600 }}>{product.category.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Main product layout: image left, info right (RTL) */}
      <section style={{ background: colors.parchment, padding: "2.5rem 1.5rem 4rem" }}>
        <div
          dir="rtl"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)",
            gap: "3rem",
            alignItems: "start",
          }}
          className="product-grid"
        >
          {/* Image */}
          <div>
            <div
              style={{
                aspectRatio: "1 / 1",
                background: colors.parchmentDark,
                borderRadius: radii.xl,
                overflow: "hidden",
                position: "relative",
                boxShadow: shadows.cardSoft,
              }}
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: colors.goldDark,
                  }}
                >
                  <BookOpen style={{ width: 80, height: 80, opacity: 0.3 }} />
                </div>
              )}
              {discount && (
                <span
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    padding: "0.4rem 0.85rem",
                    borderRadius: radii.md,
                    background: "rgba(220,53,69,0.95)",
                    color: "white",
                    fontFamily: fonts.body,
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    boxShadow: "0 4px 12px rgba(220,53,69,0.3)",
                  }}
                >
                  חיסכון {discount}%
                </span>
              )}
            </div>

            {/* Gallery thumbs (placeholder if no gallery) */}
            {product.gallery_urls && product.gallery_urls.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "0.6rem",
                  marginTop: "0.85rem",
                }}
              >
                {product.gallery_urls.slice(0, 4).map((url, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: "1 / 1",
                      background: colors.parchmentDark,
                      borderRadius: radii.md,
                      overflow: "hidden",
                      border: `1px solid rgba(139,111,71,0.12)`,
                      cursor: "pointer",
                    }}
                  >
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {product.category?.name && (
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.75rem",
                  color: colors.goldDark,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: "0.6rem",
                }}
              >
                {product.category.name}
              </div>
            )}

            <h1
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                color: colors.textDark,
                lineHeight: 1.25,
                margin: "0 0 1.25rem",
              }}
            >
              {product.title}
            </h1>

            <div style={{ display: "flex", alignItems: "baseline", gap: "0.85rem", marginBottom: "1.5rem" }}>
              <span
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "2.4rem",
                  color: colors.goldDark,
                }}
              >
                {product.price}₪
              </span>
              {product.original_price && product.original_price > product.price && (
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "1.1rem",
                    color: colors.textSubtle,
                    textDecoration: "line-through",
                  }}
                >
                  {product.original_price}₪
                </span>
              )}
            </div>

            {/* Trust badges row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.5rem",
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "rgba(196,162,101,0.05)",
                borderRadius: radii.md,
                border: `1px solid rgba(139,111,71,0.08)`,
              }}
            >
              <TrustBadge icon={<Truck size={18} />} label="משלוח חינם" subtitle="מעל 200₪" />
              <TrustBadge icon={<Lock size={18} />} label="תשלום מאובטח" subtitle="SSL · Grow" />
              <TrustBadge
                icon={product.is_digital ? <Download size={18} /> : <CheckCircle2 size={18} />}
                label={product.is_digital ? "הורדה מיידית" : "במלאי"}
                subtitle={product.is_digital ? "PDF" : "מוכן למשלוח"}
              />
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
              <button
                style={{
                  flex: "1 1 240px",
                  padding: "0.95rem 1.6rem",
                  borderRadius: radii.lg,
                  border: "none",
                  background: gradients.goldButton,
                  color: "white",
                  fontFamily: fonts.accent,
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: shadows.goldGlow,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <ShoppingBag style={{ width: 18, height: 18 }} />
                הוסף לעגלה
              </button>
              <button
                aria-label="הוסף למועדפים"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radii.lg,
                  border: `1.5px solid rgba(139,111,71,0.25)`,
                  background: "white",
                  color: colors.textMuted,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Heart style={{ width: 20, height: 20 }} />
              </button>
              <button
                aria-label="שתף"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radii.lg,
                  border: `1.5px solid rgba(139,111,71,0.25)`,
                  background: "white",
                  color: colors.textMuted,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Share2 style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Short description if exists */}
            {product.description && (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "1rem",
                  lineHeight: 1.85,
                  color: colors.textMid,
                  margin: "0 0 1rem",
                }}
              >
                {product.description}
              </p>
            )}

            {/* Quick metadata */}
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                fontFamily: fonts.body,
                fontSize: "0.88rem",
                color: colors.textMuted,
                lineHeight: 2,
                paddingTop: "1.25rem",
                borderTop: `1px solid rgba(139,111,71,0.1)`,
              }}
            >
              {product.page_count && (
                <li>
                  <b style={{ color: colors.textDark }}>מספר עמודים:</b> {product.page_count}
                </li>
              )}
              <li>
                <b style={{ color: colors.textDark }}>סוג:</b>{" "}
                {product.is_digital ? "מוצר דיגיטלי (PDF)" : "ספר פיזי"}
              </li>
              {product.category?.name && (
                <li>
                  <b style={{ color: colors.textDark }}>קטגוריה:</b> {product.category.name}
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Long content (rich HTML from CMS) */}
      {product.content && (
        <section style={{ background: colors.parchmentDark, padding: "4rem 1.5rem" }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }} dir="rtl">
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.goldDark,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.4rem",
              }}
            >
              על הספר
            </div>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "clamp(1.4rem, 2.6vw, 1.8rem)",
                color: colors.textDark,
                margin: "0 0 1.5rem",
              }}
            >
              פרטים מלאים
            </h2>
            <div
              className="product-content"
              style={{
                fontFamily: fonts.body,
                fontSize: "1rem",
                lineHeight: 1.95,
                color: colors.textMid,
              }}
              dangerouslySetInnerHTML={{ __html: product.content }}
            />
            <style>{`
              .product-content h2 { font-family: ${fonts.display}; font-weight:900; color:${colors.textDark}; font-size:1.25rem; margin-top:2rem; margin-bottom:.85rem; }
              .product-content h3 { font-family: ${fonts.display}; font-weight:700; color:${colors.textDark}; font-size:1.05rem; margin-top:1.25rem; margin-bottom:.5rem; }
              .product-content p { margin-bottom:1rem; }
              .product-content a { color:${colors.goldDark}; text-decoration:underline; text-underline-offset:2px; }
              .product-content strong { color:${colors.textDark}; }
              .product-content img { max-width:100%; border-radius:${radii.md}; margin:1rem 0; }
            `}</style>
          </div>
        </section>
      )}

      {/* Related products */}
      {related.length > 0 && (
        <section style={{ background: colors.parchment, padding: "4rem 1.5rem" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div dir="rtl" style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: colors.goldDark,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: "0.3rem",
                }}
              >
                מוצרים נוספים
              </div>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)",
                  color: colors.textDark,
                  margin: 0,
                }}
              >
                מאותה קטגוריה
              </h2>
            </div>

            <div
              dir="rtl"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {related.map((p) => (
                <Link
                  key={p.id}
                  to={`/design-product/${p.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: radii.lg,
                      overflow: "hidden",
                      border: `1px solid rgba(139,111,71,0.1)`,
                      cursor: "pointer",
                      transition: "all 0.28s",
                      boxShadow: shadows.cardSoft,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = shadows.cardHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = shadows.cardSoft;
                    }}
                  >
                    <div style={{ aspectRatio: "1 / 1", background: colors.parchmentDark, overflow: "hidden" }}>
                      {p.image_url && (
                        <img
                          src={p.image_url}
                          alt={p.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div style={{ padding: "0.75rem 0.85rem 0.95rem" }}>
                      <div
                        style={{
                          fontFamily: fonts.display,
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: colors.textDark,
                          lineHeight: 1.35,
                          marginBottom: "0.4rem",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: "2.4em",
                        }}
                      >
                        {p.title}
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.display,
                          fontWeight: 800,
                          fontSize: "1rem",
                          color: colors.goldDark,
                        }}
                      >
                        {p.price}₪
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .product-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
        }
      `}</style>
    </DesignLayout>
  );
}

function TrustBadge({
  icon,
  label,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "0.3rem",
      }}
    >
      <div style={{ color: colors.goldDark }}>{icon}</div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: "0.8rem",
          color: colors.textDark,
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: "0.7rem",
          color: colors.textMuted,
          lineHeight: 1.2,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}
