import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Home, Search, Library } from "lucide-react";
import Layout from "@/components/layout/Layout";

const bookPages = [
  { text: "בראשית ברא אלהים", opacity: 0.15, y: -20 },
  { text: "את השמים ואת הארץ", opacity: 0.12, y: 10 },
  { text: "והארץ היתה תהו ובהו", opacity: 0.1, y: 40 },
  { text: "ורוח אלהים מרחפת", opacity: 0.08, y: 70 },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden section-gradient-warm" dir="rtl">
        <div className="absolute inset-0 noise-overlay opacity-5 pointer-events-none" />

        {/* Animated Bible text background */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden">
          {bookPages.map((page, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              animate={{ opacity: page.opacity, x: 0 }}
              transition={{ delay: 0.8 + i * 0.3, duration: 1.2 }}
              className="font-serif text-3xl md:text-5xl text-primary/20 whitespace-nowrap"
              style={{ transform: `translateY(${page.y}px)` }}
            >
              {page.text}
            </motion.p>
          ))}
        </div>

        <div className="container relative z-10 text-center max-w-lg py-20">
          {/* Animated open book */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 inline-block"
          >
            <div className="relative">
              <motion.div
                animate={{ rotateZ: [0, -3, 3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 border border-primary/20 flex items-center justify-center shadow-xl shadow-primary/10"
              >
                <BookOpen className="h-14 w-14 md:h-18 md:w-18 text-primary" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full"
              >
                404
              </motion.span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-4xl font-heading text-foreground mb-3">
              הדף לא נמצא
            </h1>
            <p className="text-muted-foreground font-serif mb-2 text-base md:text-lg">
              אולי הדף הזה עדיין לא נכתב...
            </p>
            <p className="text-muted-foreground font-serif mb-8 text-sm">
              אבל בתנ״ך יש הרבה תוכן שכן!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-display text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
              >
                <Home className="h-4 w-4" />
                לדף הבית
              </Link>
              <Link
                to="/series"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground rounded-xl font-display text-sm hover:border-primary/30 transition-colors"
              >
                <Search className="h-4 w-4" />
                חיפוש
              </Link>
              <Link
                to="/series"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground rounded-xl font-display text-sm hover:border-primary/30 transition-colors"
              >
                <Library className="h-4 w-4" />
                שיעורים
              </Link>
            </div>
          </motion.div>

          {/* Ornament */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex items-center justify-center gap-3 text-accent/40"
          >
            <span className="h-px w-16 bg-accent/30" />
            <span className="font-serif text-xs text-muted-foreground">״כי נר מצוה ותורה אור״</span>
            <span className="h-px w-16 bg-accent/30" />
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
