import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { useSiteCopy } from "@/hooks/useSiteSettings";
import { sanitizeHtml } from "@/lib/sanitize";
import { copyDefault } from "@/config/siteCopyRegistry";

const LAST_UPDATED = "3 במאי 2026";

/** Shared prose styling so admin-editable HTML bodies match the original look. */
const LEGAL_PROSE =
  "text-muted-foreground leading-relaxed space-y-3 [&_p]:leading-relaxed [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:list-inside [&_strong]:text-foreground [&_a]:underline [&_a]:text-primary hover:[&_a]:opacity-80";

const Terms = () => {
  useSEO({
    title: "תקנון ומדיניות פרטיות",
    description: "תקנון האתר ומדיניות הפרטיות של תנועת בני ציון ללימוד תנ\"ך.",
    url: "https://bneyzion.co.il/terms",
  });
  const copy = useSiteCopy();

  return (
    <Layout>
      <PageHero
        title="תקנון ומדיניות פרטיות"
        subtitle={`עודכן לאחרונה: ${LAST_UPDATED}`}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-right" dir="rtl">

        {[
          { t: "copy.terms.s1_title", b: "copy.terms.s1_body", id: undefined as string | undefined },
          { t: "copy.terms.s2_title", b: "copy.terms.s2_body", id: undefined },
          { t: "copy.terms.s3_title", b: "copy.terms.s3_body", id: undefined },
          { t: "copy.terms.s4_title", b: "copy.terms.s4_body", id: undefined },
          { t: "copy.terms.s5_title", b: "copy.terms.s5_body", id: undefined },
          { t: "copy.terms.s6_title", b: "copy.terms.s6_body", id: undefined },
          { t: "copy.terms.s7_title", b: "copy.terms.s7_body", id: undefined },
          { t: "copy.terms.s8_title", b: "copy.terms.s8_body", id: undefined },
          { t: "copy.terms.s9_title", b: "copy.terms.s9_body", id: "privacy" },
          { t: "copy.terms.s10_title", b: "copy.terms.s10_body", id: undefined },
          { t: "copy.terms.s11_title", b: "copy.terms.s11_body", id: undefined },
        ].map((s) => (
          <section key={s.t} id={s.id} className="space-y-3">
            <h2 className="text-2xl font-bold">{copy(s.t, copyDefault(s.t))}</h2>
            <div className={LEGAL_PROSE} dangerouslySetInnerHTML={{ __html: sanitizeHtml(copy(s.b, copyDefault(s.b))) }} />
          </section>
        ))}

        {/* Closing note */}
        <div className="rounded-xl border border-border bg-muted/40 px-6 py-5 text-sm text-muted-foreground space-y-1">
          <p>עודכן לאחרונה: {LAST_UPDATED}</p>
          <p>
            לשאלות:{" "}
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

export default Terms;
