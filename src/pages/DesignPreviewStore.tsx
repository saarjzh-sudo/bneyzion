/**
 * /design-store — Storefront, redesigned.
 *
 * Pulls real products + categories from Supabase. Filter by category, search
 * by title, sort by featured/price. Card pattern matches home-page cards.
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, ShoppingBag, Sparkles, BookOpen, Download } from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import DesignPageHero from "@/components/layout-v2/DesignPageHero";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { useProducts, useProductCategories, type Product } from "@/hooks/useProducts";

export default function DesignPreviewStore() {
  const { data: categories } = useProductCategories();
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"featured" | "priceAsc" | "priceDesc">("featured");

  const slugFilter = activeCat === "all" ? undefined : activeCat;
  const { data: products = [], isLoading } = useProducts(slugFilter);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => (p.title || "").toLowerCase().includes(q));
    }
    if (sort === "priceAsc") list.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort_order - b.sort_order);
    return list;
  }, [products, search, sort]);

  const featured = useMemo(() => products.filter((p) => p.featured).slice(0, 3), [products]);

  return (
    <DesignLayout>
      <DesignPageHero
        variant="parchment"
        eyebrow="חנות בני ציון"
        title="ספרי תנ״ך, מגילות וקורסים דיגיטליים"
        subtitle={
          products.length
            ? `${products.length} מוצרים פעילים, ב-${categories?.length || 0} קטגוריות. ספרי פרשנות, ימי עיון, וקורסים מקיפים.`
            : "טוען..."
        }
      >
        <div style={{ position: "relative", maxWidth: 480, margin: "1rem auto 0" }}>
          <Search
            style={{
              position: "absolute",
              top: "50%",
              right: 16,
              transform: "translateY(-50%)",
              width: 18,
              height: 18,
              color: colors.textSubtle,
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש מוצר..."
            style={{
              width: "100%",
              padding: "0.85rem 3rem 0.85rem 1.25rem",
              borderRadius: radii.lg,
              border: `1.5px solid ${colors.parchmentDeep}`,
              background: "white",
              fontFamily: fonts.body,
              fontSize: "0.95rem",
              color: colors.textDark,
              outline: "none",
              direction: "rtl",
              boxShadow: shadows.cardSoft,
            }}
          />
        </div>
      </DesignPageHero>

      {/* Featured strip */}
      {featured.length > 0 && (
        <section style={{ background: colors.parchment, padding: "3rem 1.5rem 0" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div dir="rtl" style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontFamily: fonts.body,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: colors.goldDark,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: "0.3rem",
                }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
                מוצרים נבחרים
              </div>
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "clamp(1.4rem, 2.8vw, 1.9rem)",
                  color: colors.textDark,
                  margin: 0,
                }}
              >
                החביבים על הקוראים
              </h2>
            </div>
            <div
              dir="rtl"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {featured.map((p) => (
                <FeaturedCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category chips + sort */}
      <section
        style={{
          background: colors.parchment,
          padding: "2rem 1.5rem 0",
          position: "sticky",
          top: 96,
          zIndex: 10,
          borderBottom: `1px solid rgba(139,111,71,0.08)`,
        }}
      >
        <div
          dir="rtl"
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            paddingBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", flex: 1 }}>
            <CatChip label="הכל" active={activeCat === "all"} onClick={() => setActiveCat("all")} />
            {categories?.map((c) => (
              <CatChip
                key={c.slug}
                label={c.name}
                active={activeCat === c.slug}
                onClick={() => setActiveCat(c.slug)}
              />
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            style={{
              padding: "0.5rem 0.85rem",
              borderRadius: radii.md,
              border: `1.5px solid ${colors.parchmentDeep}`,
              background: "white",
              fontFamily: fonts.body,
              fontSize: "0.85rem",
              color: colors.textDark,
              cursor: "pointer",
              direction: "rtl",
            }}
          >
            <option value="featured">מומלץ</option>
            <option value="priceAsc">מחיר: מהזול ליקר</option>
            <option value="priceDesc">מחיר: מהיקר לזול</option>
          </select>
        </div>
      </section>

      {/* Products grid */}
      <section style={{ background: colors.parchment, padding: "3rem 1.5rem 6rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            dir="rtl"
            style={{
              fontFamily: fonts.body,
              fontSize: "0.85rem",
              color: colors.textMuted,
              marginBottom: "1.5rem",
            }}
          >
            {filtered.length} מוצרים{search && ` לחיפוש "${search}"`}
          </div>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
              <Loader2
                style={{
                  width: 28,
                  height: 28,
                  color: colors.goldDark,
                  animation: "spin 1s linear infinite",
                }}
              />
            </div>
          ) : (
            <div
              dir="rtl"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DesignLayout>
  );
}

// ────────────────────────────────────────────────────────────────────────
function CatChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.5rem 1.1rem",
        borderRadius: radii.pill,
        border: `1.5px solid ${active ? colors.goldDark : "rgba(139,111,71,0.2)"}`,
        background: active ? colors.goldDark : "white",
        color: active ? "white" : colors.textMuted,
        fontFamily: fonts.body,
        fontSize: "0.82rem",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function FeaturedCard({ product }: { product: Product }) {
  const discount =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

  return (
    <Link to={`/design-product/${product.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          overflow: "hidden",
          border: `1.5px solid ${colors.goldDark}`,
          boxShadow: "0 8px 24px rgba(139,111,71,0.18), 0 0 0 4px rgba(196,162,101,0.1)",
          cursor: "pointer",
          transition: "all 0.28s",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow =
            "0 14px 38px rgba(139,111,71,0.22), 0 0 0 4px rgba(196,162,101,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 8px 24px rgba(139,111,71,0.18), 0 0 0 4px rgba(196,162,101,0.1)";
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -10,
            right: 14,
            zIndex: 5,
            padding: "0.3rem 0.85rem",
            borderRadius: radii.pill,
            background: gradients.goldButton,
            color: "white",
            fontFamily: fonts.body,
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            boxShadow: shadows.goldGlow,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <Sparkles style={{ width: 12, height: 12 }} />
          מומלץ
        </div>

        <div
          style={{
            aspectRatio: "1 / 1",
            background: colors.parchmentDark,
            position: "relative",
            overflow: "hidden",
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
              <BookOpen style={{ width: 48, height: 48, opacity: 0.4 }} />
            </div>
          )}
          {discount && (
            <span
              style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                padding: "0.3rem 0.7rem",
                borderRadius: radii.sm,
                background: "rgba(220,53,69,0.95)",
                color: "white",
                fontFamily: fonts.body,
                fontSize: "0.78rem",
                fontWeight: 800,
              }}
            >
              -{discount}%
            </span>
          )}
        </div>
        <div style={{ padding: "1.1rem 1.2rem 1.25rem" }}>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: "1.05rem",
              color: colors.textDark,
              lineHeight: 1.35,
              marginBottom: "0.65rem",
              minHeight: "2.7em",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.title}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.55rem", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: "1.4rem",
                color: colors.goldDark,
              }}
            >
              {product.price}₪
            </span>
            {product.original_price && product.original_price > product.price && (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: "0.85rem",
                  color: colors.textSubtle,
                  textDecoration: "line-through",
                }}
              >
                {product.original_price}₪
              </span>
            )}
            {product.is_digital && (
              <span
                style={{
                  marginInlineStart: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.2rem 0.55rem",
                  borderRadius: radii.sm,
                  background: "rgba(45,125,125,0.1)",
                  color: colors.tealMain,
                  fontFamily: fonts.body,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                <Download style={{ width: 11, height: 11 }} />
                דיגיטלי
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discount =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;
  return (
    <Link to={`/design-product/${product.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "white",
          borderRadius: radii.xl,
          overflow: "hidden",
          border: `1px solid rgba(139,111,71,0.1)`,
          boxShadow: shadows.cardSoft,
          cursor: "pointer",
          transition: "all 0.28s",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = shadows.cardHover;
          e.currentTarget.style.borderColor = colors.goldDark;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = shadows.cardSoft;
          e.currentTarget.style.borderColor = "rgba(139,111,71,0.1)";
        }}
      >
        <div
          style={{
            aspectRatio: "1 / 1",
            background: colors.parchmentDark,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
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
              <BookOpen style={{ width: 40, height: 40, opacity: 0.4 }} />
            </div>
          )}
          {discount && (
            <span
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                padding: "0.2rem 0.55rem",
                borderRadius: radii.sm,
                background: "rgba(220,53,69,0.95)",
                color: "white",
                fontFamily: fonts.body,
                fontSize: "0.7rem",
                fontWeight: 800,
              }}
            >
              -{discount}%
            </span>
          )}
          {product.is_digital && (
            <span
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
                padding: "0.2rem 0.5rem",
                borderRadius: radii.sm,
                background: "rgba(45,125,125,0.92)",
                color: "white",
                fontFamily: fonts.body,
                fontSize: "0.65rem",
                fontWeight: 700,
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            >
              <Download style={{ width: 10, height: 10 }} />
              דיגיטלי
            </span>
          )}
        </div>

        <div
          style={{
            padding: "0.95rem 1.05rem 1.1rem",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {product.category?.name && (
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: "0.66rem",
                color: colors.goldDark,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "0.3rem",
              }}
            >
              {product.category.name}
            </div>
          )}
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: "0.92rem",
              color: colors.textDark,
              lineHeight: 1.35,
              marginBottom: "0.5rem",
              flex: 1,
              minHeight: "2.5em",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "0.5rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid rgba(139,111,71,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
              <span
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: "1.1rem",
                  color: colors.textDark,
                }}
              >
                {product.price}₪
              </span>
              {product.original_price && product.original_price > product.price && (
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "0.75rem",
                    color: colors.textSubtle,
                    textDecoration: "line-through",
                  }}
                >
                  {product.original_price}₪
                </span>
              )}
            </div>
            <button
              style={{
                padding: "0.4rem 0.7rem",
                borderRadius: radii.sm,
                border: "none",
                background: gradients.goldButton,
                color: "white",
                fontFamily: fonts.accent,
                fontWeight: 700,
                fontSize: "0.72rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <ShoppingBag style={{ width: 12, height: 12 }} />
              לעגלה
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
