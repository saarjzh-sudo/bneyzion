import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { useSiteCopy } from "@/hooks/useSiteSettings";
import { sanitizeHtml } from "@/lib/sanitize";
import { copyDefault } from "@/config/siteCopyRegistry";

const LAST_UPDATED = "6 ביולי 2026";

/** Shared prose styling so admin-editable HTML bodies match the original look. */
const LEGAL_PROSE =
  "text-muted-foreground leading-relaxed space-y-3 [&_p]:leading-relaxed [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:list-inside [&_strong]:text-foreground [&_a]:underline [&_a]:text-primary hover:[&_a]:opacity-80";

const AccessibilityStatement = () => {
  useSEO({
    title: "הצהרת נגישות",
    description: "הצהרת הנגישות של אתר בני ציון — תנועה ללימוד תנ\"ך, בהתאם לתקן הישראלי ת\"י 5568.",
    url: "https://bneyzion.co.il/accessibility",
  });
  const copy = useSiteCopy();

  return (
    <Layout>
      <PageHero
        title="הצהרת נגישות"
        subtitle={`עודכן לאחרונה: ${LAST_UPDATED}`}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-right" dir="rtl">
        {[
          { t: "copy.accessibility.s1_title", b: "copy.accessibility.s1_body" },
          { t: "copy.accessibility.s2_title", b: "copy.accessibility.s2_body" },
          { t: "copy.accessibility.s3_title", b: "copy.accessibility.s3_body" },
          { t: "copy.accessibility.s4_title", b: "copy.accessibility.s4_body" },
          { t: "copy.accessibility.s5_title", b: "copy.accessibility.s5_body" },
        ].map((s) => (
          <section key={s.t} className="space-y-3">
            <h2 className="text-2xl font-bold">{copy(s.t, copyDefault(s.t))}</h2>
            <div className={LEGAL_PROSE} dangerouslySetInnerHTML={{ __html: sanitizeHtml(copy(s.b, copyDefault(s.b))) }} />
          </section>
        ))}

        <div className="rounded-xl border border-border bg-muted/40 px-6 py-5 text-sm text-muted-foreground space-y-1">
          <p>עודכן לאחרונה: {LAST_UPDATED}</p>
          <p>
            לשאלות נוספות:{" "}
            <Link to="/contact" className="underline hover:opacity-80">
              צור קשר
            </Link>{" "}
            ·{" "}
            <a href="mailto:office@bneyzion.co.il" className="underline hover:opacity-80">
              office@bneyzion.co.il
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AccessibilityStatement;
