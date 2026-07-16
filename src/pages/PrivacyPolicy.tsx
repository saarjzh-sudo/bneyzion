import Layout from "@/components/layout/Layout";
import PageHero from "@/components/layout/PageHero";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { reopenCookieBanner } from "@/components/legal/CookieConsent";
import { useSiteCopy } from "@/hooks/useSiteSettings";
import { sanitizeHtml } from "@/lib/sanitize";
import { copyDefault } from "@/config/siteCopyRegistry";

const LAST_UPDATED = "6 ביולי 2026";

/** Shared prose styling so admin-editable HTML bodies match the original look. */
const LEGAL_PROSE =
  "text-muted-foreground leading-relaxed space-y-3 [&_p]:leading-relaxed [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:list-inside [&_strong]:text-foreground [&_a]:underline [&_a]:text-primary hover:[&_a]:opacity-80";

const PrivacyPolicy = () => {
  useSEO({
    title: "מדיניות פרטיות",
    description: "מדיניות הפרטיות של אתר בני ציון — איסוף מידע, שימוש, עוגיות וזכויות המשתמש.",
    url: "https://bneyzion.co.il/privacy-policy",
  });
  const copy = useSiteCopy();

  return (
    <Layout>
      <PageHero
        title="מדיניות פרטיות"
        subtitle={`עודכן לאחרונה: ${LAST_UPDATED}`}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-right" dir="rtl">
        {[
          { t: "copy.privacy.s1_title", b: "copy.privacy.s1_body" },
          { t: "copy.privacy.s2_title", b: "copy.privacy.s2_body" },
        ].map((s) => (
          <section key={s.t} className="space-y-3">
            <h2 className="text-2xl font-bold">{copy(s.t, copyDefault(s.t))}</h2>
            <div className={LEGAL_PROSE} dangerouslySetInnerHTML={{ __html: sanitizeHtml(copy(s.b, copyDefault(s.b))) }} />
          </section>
        ))}

        {/* Section 3 (Cookies) — title editable; body kept in JSX for the
            reopen-preferences button (interactive). */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">{copy("copy.privacy.s3_title", copyDefault("copy.privacy.s3_title"))}</h2>
          <p className="text-muted-foreground leading-relaxed">
            האתר משתמש בשני סוגי עוגיות:
          </p>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
            <li>
              <strong>עוגיות הכרחיות</strong> — נדרשות לתפעול בסיסי של האתר
              (התחברות, סל קניות, זכירת העדפת נגישות/עוגיות). עוגיות אלה
              פעילות תמיד ואינן דורשות הסכמה.
            </li>
            <li>
              <strong>עוגיות שיווקיות/אנליטיות</strong> — משמשות למדידת
              ביצועי קמפיינים (לדוגמה, פיקסל פייסבוק) ולשיפור חוויית
              המשתמש. עוגיות אלה נטענות <strong>רק לאחר אישורך המפורש</strong>{" "}
              בבאנר העוגיות המוצג בכניסתך הראשונה לאתר.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            ניתן לשנות את בחירתך בכל עת דרך{" "}
            <button
              type="button"
              onClick={() => reopenCookieBanner()}
              className="underline text-primary hover:opacity-80 font-semibold bg-transparent border-0 p-0 cursor-pointer"
            >
              עדכון העדפות עוגיות
            </button>
            , או דרך הגדרות הדפדפן שלך.
          </p>
        </section>

        {[
          { t: "copy.privacy.s4_title", b: "copy.privacy.s4_body" },
          { t: "copy.privacy.s5_title", b: "copy.privacy.s5_body" },
          { t: "copy.privacy.s6_title", b: "copy.privacy.s6_body" },
          { t: "copy.privacy.s7_title", b: "copy.privacy.s7_body" },
          { t: "copy.privacy.s8_title", b: "copy.privacy.s8_body" },
        ].map((s) => (
          <section key={s.t} className="space-y-3">
            <h2 className="text-2xl font-bold">{copy(s.t, copyDefault(s.t))}</h2>
            <div className={LEGAL_PROSE} dangerouslySetInnerHTML={{ __html: sanitizeHtml(copy(s.b, copyDefault(s.b))) }} />
          </section>
        ))}

        <div className="rounded-xl border border-border bg-muted/40 px-6 py-5 text-sm text-muted-foreground space-y-1">
          <p>עודכן לאחרונה: {LAST_UPDATED}</p>
          <p>
            ראו גם:{" "}
            <Link to="/terms" className="underline hover:opacity-80">
              תקנון האתר
            </Link>{" "}
            ·{" "}
            <Link to="/accessibility" className="underline hover:opacity-80">
              הצהרת נגישות
            </Link>
          </p>
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

export default PrivacyPolicy;
