/**
 * /design-donate — Donation page, editorial redesign (v7).
 *
 * A disciplined, award-level pass: typography as architecture (monumental
 * Hebrew display over cinematic scenery), one restrained gold accent, hairline
 * craft, asymmetric composition, custom-eased reveals. No gradient-spam, no
 * gimmick motion, no decorative icons. Voice + copy by Saar.
 *
 * Real throughout: DonateForm → Grow; proof strip + recent donors → Supabase.
 */
import { useEffect, useState } from "react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { useRecentDonations } from "@/hooks/useDonations";
import DonateForm from "@/components/donate/DonateForm";
import { useScrollReveal } from "@/components/donate/useScrollReveal";
import { useDonationStats } from "@/components/donate/useDonationStats";
import { C, EASE, fonts } from "@/components/donate/theme";
import {
  ALLOCATION, DONATE_FAQS, WHY_CARDS, TESTIMONIALS, IMAGES,
} from "@/components/donate/donateData";

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
const scrollToForm = () => scrollTo("donate-form");

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "לפני דקות";
  if (h < 24) return h === 1 ? "לפני שעה" : h === 2 ? "לפני שעתיים" : `לפני ${h} שעות`;
  const d = Math.floor(h / 24);
  return d === 1 ? "לפני יום" : d === 2 ? "לפני יומיים" : `לפני ${d} ימים`;
}

const typeLabels: Record<string, string> = { iluy_neshama: "לעילוי נשמת", refua: "לרפואת", simcha: "לכבוד", regular: "" };

// Privacy: show first-name initial + surname → "נתנאל ידגרי" → "נ. ידגרי".
function shortName(name?: string | null): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name || "";
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

// ───────────────────────────────────────────────────────────
// Primitives
// ───────────────────────────────────────────────────────────

function Kicker({ children, on = "light", center = false }: { children: React.ReactNode; on?: "light" | "dark"; center?: boolean }) {
  const color = on === "dark" ? C.gold : C.goldDeep;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.7rem", marginBottom: "1.4rem", justifyContent: center ? "center" : "flex-start" }}>
      <span aria-hidden="true" style={{ width: 30, height: 1, background: color, opacity: 0.7 }} />
      <span style={{ fontFamily: fonts.body, fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.24em", color }}>{children}</span>
    </div>
  );
}

function Reveal({ children, delay = 0, className = "", style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref as any} className={`bz-donate-reveal ${visible ? "bz-revealed" : ""} ${className}`} style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick, dark = false }: { children: React.ReactNode; onClick: () => void; dark?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`btn-primary ${dark ? "on-dark" : ""}`}>
      {children}
    </button>
  );
}

function H2({ children, center = false, big = false }: { children: React.ReactNode; center?: boolean; big?: boolean }) {
  return (
    <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: big ? "clamp(2.3rem, 5vw, 3.8rem)" : "clamp(2rem, 4vw, 3.1rem)", lineHeight: 1.06, letterSpacing: "-0.02em", color: C.ink, margin: 0, textAlign: center ? "center" : "start", textWrap: "balance" as any }}>
      {children}
    </h2>
  );
}

// ───────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────

export default function DesignPreviewDonate() {
  const [amount, setAmount] = useState<number>(180);
  const [showBar, setShowBar] = useState(false);
  const stats = useDonationStats();
  const { data: recentDonations } = useRecentDonations();

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 620);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <DesignLayout sidebar={false}>
      <PageStyles />

      {/* Sticky bar */}
      <div className="sticky-bar" dir="rtl" style={{ transform: showBar ? "translateY(0)" : "translateY(130%)" }}>
        <div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: C.onDark, fontWeight: 600 }}>התנ״ך פתוח לכולם — בזכות השותפים שלנו</div>
          <div style={{ fontFamily: fonts.body, fontSize: "0.7rem", color: C.onDark45 }}>סליקה מאובטחת · מוכר לזיכוי מס סעיף 46</div>
        </div>
        <button type="button" onClick={scrollToForm} className="btn-primary">לתרומה</button>
      </div>

      {/* Cinematic opening — landscape video, fades into the story (restored 2.7.2026) */}
      <Hero />

      {/* Story + sticky form */}
      <section style={{ background: C.cream, padding: "clamp(2.25rem, 5vw, 3.75rem) 2rem clamp(4rem, 8vw, 6.5rem)" }} dir="rtl">
        <div className="donate-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr minmax(370px, 440px)", gap: "clamp(2.5rem, 5vw, 5rem)", alignItems: "start" }}>
          <Story />
          <div className="donate-form-col" style={{ position: "sticky", top: "5.5rem" }}>
            <DonateForm amount={amount} onAmount={setAmount} source="donate-page" />
          </div>
        </div>
      </section>

      <WhySection />
      <Testimonials />
      <PartnershipBand stats={stats} />
      <Transparency />
      <RecentDonors donations={recentDonations} />
      <Faq />
      <FinalCta />
    </DesignLayout>
  );
}

// ───────────────────────────────────────────────────────────
// Hero — cinematic opening over the Judean-desert footage
// ───────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="hero" dir="rtl" aria-label="פתיח — הצטרפות לשותפות">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/video/hero-poster.jpg"
        aria-hidden="true"
        className="hero-video"
      >
        <source src={IMAGES.heroVideo} type="video/mp4" />
      </video>
      <div aria-hidden="true" className="hero-scrim-1" />
      <div aria-hidden="true" className="hero-scrim-2" />
      <div aria-hidden="true" className="hero-fade-bottom" />
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-fade-up d1"><Kicker on="dark">שותפים לבית התנ״ך</Kicker></div>
          <h1 className="hero-title hero-fade-up d2">
            היו שותפים
            <span className="hero-title-gold">להפצת אור התנ״ך</span>
          </h1>
          <p className="hero-lead hero-fade-up d3">
            אלפי שיעורים, מאות רבנים, בית שלם של תורה — פתוח בחינם לכל יהודי.
            זה קורה בזכות אנשים שבוחרים להחזיק אותו.
          </p>
          <div className="hero-actions hero-fade-up d4">
            <PrimaryBtn onClick={scrollToForm} dark>אני מצטרף</PrimaryBtn>
            <button type="button" className="text-link on-dark" onClick={() => scrollTo("donate-why")}>
              איך התרומה פועלת?
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Story + Rav Yoav photo (asymmetric)
// ───────────────────────────────────────────────────────────

function Story() {
  return (
    <Reveal>
      <Kicker>הסיפור שלנו</Kicker>
      <H2>בית של תנ״ך,<br />פתוח לכל יהודי</H2>

      <figure className="yoav-figure">
        <div className="yoav-frame">
          <img className="yoav-photo" src={IMAGES.yoavTeaching} alt="הרב יואב אוריאל אוחז בסט ספרי בני ציון" loading="lazy" />
        </div>
        <figcaption>מאחורי כל שיעור עומדים אנשים אמיתיים שבונים תורה</figcaption>
      </figure>

      <p style={pStyle}>בני ציון נולדה מתוך אמונה פשוטה: התנ״ך הוא לא רק ספר של פעם. הוא הלב של עם ישראל — הוא מספר לנו מי אנחנו, מאיפה באנו ולאן אנחנו הולכים.</p>
      <p style={pStyle}>בשנים האחרונות נבנה כאן בית גדול ללימוד תנ״ך: שיעורים, סדרות, ספרי מכלל יופי, קורסים, תשובות וכלים למורים, הורים ולומדים. אבל כדי שכל זה יישאר פתוח באמת — צריך להחזיק אותו.</p>
      <p style={pStyle}>כל שיעור עובר דרך ארוכה: הכנה, הקלטה, עריכה, תמלול, עיצוב והעלאה. מבחוץ זה נראה פשוט. בפנים זו עבודה גדולה.</p>
      <p style={{ ...pStyle, color: C.ink, fontWeight: 600 }}>יכולנו לסגור את התוכן מאחורי תשלום. לעשות מנוי. אבל בחרנו אחרת.</p>
      <p style={pStyle}>התנ״ך שייך לעם ישראל — ולכן אנחנו רוצים שהוא יישאר פתוח לכל יהודי. ילד, מורה, חייל, הורה, וכל מי שמחפש שער להיכנס דרכו.</p>

      <blockquote className="pull-quote">
        התרומה שלכם היא לא ״תרומה לאתר״. היא עוד שיעור שילד יפגוש. עוד אדם שיפתח תנ״ך וירגיש שהוא נכנס הביתה.
      </blockquote>
    </Reveal>
  );
}

// ───────────────────────────────────────────────────────────
// Why — three refined numbered columns
// ───────────────────────────────────────────────────────────

function WhySection() {
  return (
    <section id="donate-why" style={{ background: C.paper, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, padding: "clamp(4rem, 7vw, 6rem) 2rem" }} dir="rtl">
      <div className="why-grid" style={{ maxWidth: 1180, margin: "0 auto" }}>
        {WHY_CARDS.map((c, i) => (
          <Reveal key={c.n} delay={i * 90}>
            <div className="why-col">
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", color: C.gold, letterSpacing: "0.1em" }}>{c.n}</div>
              <div className="why-rule" />
              <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.35rem", color: C.ink, margin: "0 0 0.75rem" }}>{c.title}</h3>
              <p style={{ ...pStyle, margin: 0, fontSize: "0.95rem" }}>{c.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Testimonials (real)
// ───────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section style={{ background: C.creamDeep, padding: "clamp(4rem, 8vw, 7rem) 2rem" }} dir="rtl">
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <Reveal style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Kicker center>מה אומרים הלומדים</Kicker></div>
          <H2 center>חוויות אמיתיות מהשטח</H2>
        </Reveal>
        <div className="testi-grid">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={(i % 3) * 80}>
              <figure className="testi">
                <span aria-hidden="true" className="testi-mark">״</span>
                <blockquote>{t.text}</blockquote>
                <figcaption>
                  <span className="testi-name">{shortName(t.name)}</span>
                  {t.role && <span className="testi-role">{t.role}</span>}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Partnership band — dark break + stats + CTA to the form
// ───────────────────────────────────────────────────────────

function PartnershipBand({ stats }: { stats: ReturnType<typeof useDonationStats> }) {
  const items = [
    { v: "11,000+", l: "שיעורים ותכנים" },
    { v: "200+", l: "רבנים ומרצים" },
    stats.ready && stats.donorCount > 0
      ? { v: `${stats.donorCount.toLocaleString("he-IL")}+`, l: "שותפים שהצטרפו" }
      : { v: "1,300+", l: "סדרות לימוד" },
  ];
  return (
    <section className="band" dir="rtl">
      <Reveal style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Kicker on="dark" center>הצטרפו אלינו</Kicker></div>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.9rem, 3.8vw, 2.9rem)", lineHeight: 1.1, letterSpacing: "-0.02em", color: C.onDark, margin: "0 0 1rem" }}>
          כל שותפות פותחת עוד שער ללימוד
        </h2>
        <p style={{ fontFamily: fonts.body, fontSize: "1.08rem", lineHeight: 1.75, color: C.onDark72, margin: "0 auto 2.5rem", maxWidth: 500 }}>
          בזכות השותפים שלנו לימוד התנ״ך נשאר פתוח, חינם, לכל בית בישראל.
        </p>
        <div className="band-stats">
          {items.map((it, i) => (
            <div key={i}>
              <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", color: C.gold, lineHeight: 1, letterSpacing: "-0.02em" }}>{it.v}</div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.84rem", color: C.onDark72, marginTop: "0.5rem" }}>{it.l}</div>
            </div>
          ))}
        </div>
        <PrimaryBtn onClick={scrollToForm} dark>היו שותפים</PrimaryBtn>
      </Reveal>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Transparency — editorial ledger
// ───────────────────────────────────────────────────────────

function Transparency() {
  return (
    <section style={{ background: C.cream, padding: "clamp(4rem, 8vw, 7rem) 2rem" }} dir="rtl">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: "3rem" }}>
          <Kicker>שקיפות</Kicker>
          <H2>לאן הולכת התרומה?</H2>
        </Reveal>
        <div>
          {ALLOCATION.map((item, i) => (
            <Reveal key={item.title} delay={i * 70}>
              <div className="ledger-row">
                <div className="ledger-idx">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.25rem", color: C.ink, marginBottom: "0.3rem" }}>{item.title}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: C.ink62, lineHeight: 1.6 }}>{item.detail}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal style={{ marginTop: "2.5rem" }}>
          <p style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: C.ink42, letterSpacing: "0.04em", textAlign: "center", margin: 0 }}>
            תשלום מאובטח SSL · קבלה מיידית למייל · מוכר לזיכוי מס לפי סעיף 46 · עמותת מכלל יופי (ע״ר)
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Recent donors (real)
// ───────────────────────────────────────────────────────────

function RecentDonors({ donations }: { donations: ReturnType<typeof useRecentDonations>["data"] }) {
  if (!donations || donations.length === 0) return null;
  return (
    <section style={{ background: C.paper, borderTop: `1px solid ${C.line}`, padding: "clamp(3.5rem, 6vw, 5rem) 2rem" }} dir="rtl">
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Reveal style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Kicker center>תודה</Kicker></div>
          <h3 style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1.5rem", color: C.ink, margin: 0 }}>שותפים שהצטרפו לאחרונה</h3>
        </Reveal>
        <div className="donors-grid">
          {donations.slice(0, 6).map((d) => (
            <div key={d.id} className="donor-row">
              <span style={{ fontFamily: fonts.display, fontWeight: 700, color: C.ink }}>{d.donor_name ? shortName(d.donor_name) : "אנונימי"}</span>
              <span style={{ fontFamily: fonts.display, fontWeight: 700, color: C.goldDeep }}>{Number(d.amount).toLocaleString()} ₪</span>
              {d.dedication_name && <span style={{ fontFamily: fonts.body, fontSize: "0.78rem", color: C.ink42, gridColumn: "1 / -1" }}>{typeLabels[d.dedication_type]} {d.dedication_name}</span>}
              <span style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: C.ink42, gridColumn: "1 / -1" }}>{timeAgo(d.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// FAQ — hairline accordion
// ───────────────────────────────────────────────────────────

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section style={{ background: C.cream, padding: "clamp(4rem, 8vw, 7rem) 2rem" }} dir="rtl">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: "2.5rem" }}>
          <Kicker>שאלות נפוצות</Kicker>
          <H2>כל מה שרציתם לדעת</H2>
        </Reveal>
        <Reveal>
          {DONATE_FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="faq-item">
                <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} aria-controls={`faq-p-${i}`} id={`faq-q-${i}`} className="faq-q">
                  <span>{faq.q}</span>
                  <span aria-hidden="true" className="faq-sign" style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>+</span>
                </button>
                <div id={`faq-p-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={!isOpen} className="faq-a">
                  <p style={{ ...pStyle, margin: 0, fontSize: "0.98rem" }}>{faq.a}</p>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Final CTA — scenery bookend
// ───────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="final" dir="rtl">
      <video autoPlay muted loop playsInline aria-hidden="true" className="hero-video">
        <source src={IMAGES.heroVideo} type="video/mp4" />
      </video>
      <div aria-hidden="true" className="final-scrim" />
      <div aria-hidden="true" className="final-fade-top" />
      <Reveal style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Kicker on="dark" center>הדלת פתוחה בזכותכם</Kicker></div>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "clamp(2.1rem, 5vw, 3.6rem)", lineHeight: 1.08, letterSpacing: "-0.02em", color: C.onDark, margin: "0 0 1.5rem", textWrap: "balance" as any }}>
          תורה פתוחה לכולם —<br />מתחילה בשותפות שלכם
        </h2>
        <p style={{ fontFamily: fonts.body, fontSize: "1.1rem", lineHeight: 1.8, color: C.onDark72, margin: "0 auto 2.5rem", maxWidth: 520 }}>
          תרומה אחת יכולה לבנות שיעור. הוראת קבע יכולה לבנות סדרה. שותפות קבועה יכולה להחזיק בית שלם של תורה לדורות.
        </p>
        <PrimaryBtn onClick={scrollToForm} dark>אני מצטרף</PrimaryBtn>
      </Reveal>
    </section>
  );
}

// ───────────────────────────────────────────────────────────
// Shared
// ───────────────────────────────────────────────────────────

const pStyle: React.CSSProperties = {
  fontFamily: fonts.body, fontSize: "1.0625rem", lineHeight: 1.75, color: C.ink62, margin: "0 0 1.15rem",
};

// ───────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────

function PageStyles() {
  return (
    <style>{`
      ::selection { background: ${C.gold}; color: ${C.cream}; }

      @keyframes heroZoom { from { transform: scale(1.03); } to { transform: scale(1.13); } }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }

      /* שמות ייחודיים בכוונה — SDK של Grow/משולם מזריק CSS גלובלי ושמות קצרים מתנגשים */
      .bz-donate-reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.9s ${EASE}, transform 0.9s ${EASE}; }
      .bz-donate-reveal.bz-revealed { opacity: 1; transform: none; }

      /* Buttons */
      .btn-primary { display: inline-block; padding: 0.95rem 2.1rem; border: none; border-radius: 3px; background: ${C.gold}; color: ${C.cream}; font-family: ${fonts.body}; font-weight: 700; font-size: 0.98rem; letter-spacing: 0.02em; cursor: pointer; transition: background 0.4s ${EASE}, transform 0.4s ${EASE}; }
      .btn-primary:hover { background: ${C.ink}; transform: translateY(-2px); }
      .btn-primary.on-dark:hover { background: ${C.cream}; color: ${C.ink}; }
      .text-link { background: none; border: none; cursor: pointer; font-family: ${fonts.body}; font-size: 0.95rem; font-weight: 600; color: ${C.goldDeep}; padding: 0.5rem 0; position: relative; transition: color 0.3s ${EASE}; }
      .text-link.on-dark { color: ${C.onDark}; }
      .text-link:hover { color: ${C.gold}; }

      /* Hero */
      .hero { position: relative; overflow: hidden; min-height: 92vh; display: flex; align-items: flex-end; }
      .hero-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: ${C.ink}; animation: heroZoom 30s ${EASE} infinite alternate; will-change: transform; }
      .hero-scrim-1 { position: absolute; inset: 0; background: linear-gradient(to left, rgba(20,15,8,0.78) 0%, rgba(20,15,8,0.38) 46%, rgba(20,15,8,0.08) 100%); }
      .hero-scrim-2 { position: absolute; inset: 0; background: linear-gradient(to top, rgba(20,15,8,0.7) 0%, rgba(20,15,8,0.1) 40%, transparent 70%); }
      .hero-fade-bottom { position: absolute; inset-inline: 0; bottom: 0; height: 120px; background: linear-gradient(to top, ${C.cream}, transparent); z-index: 1; }
      .hero-inner { position: relative; z-index: 2; width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 2rem clamp(4rem, 9vh, 8rem); display: flex; justify-content: flex-start; }
      .hero-copy { max-width: 720px; text-align: start; }
      .hero-title { font-family: ${fonts.display}; font-weight: 800; font-size: clamp(2.9rem, 8.5vw, 6.4rem); line-height: 0.98; letter-spacing: -0.03em; color: ${C.onDark}; margin: 0 0 1.6rem; }
      .hero-title-gold { display: block; color: ${C.gold}; }
      .hero-lead { font-family: ${fonts.body}; font-size: clamp(1.05rem, 1.7vw, 1.22rem); line-height: 1.7; color: ${C.onDark72}; max-width: 540px; margin: 0 0 2.25rem; }
      .hero-actions { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; }
      .hero-fade-up { opacity: 0; animation: fadeUp 0.9s ${EASE} both; }
      .hero-fade-up.d1 { animation-delay: 0.15s; }
      .hero-fade-up.d2 { animation-delay: 0.3s; }
      .hero-fade-up.d3 { animation-delay: 0.5s; }
      .hero-fade-up.d4 { animation-delay: 0.7s; }

      /* Proof */
      .proof-row { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); }
      .proof-item { padding: 2.4rem 1.5rem; text-align: center; border-inline-start: 1px solid ${C.line}; }
      .proof-item:first-child { border-inline-start: none; }

      /* Impact */
      .impact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
      .tier { position: relative; display: flex; flex-direction: column; text-align: start; background: ${C.paper}; border: 1px solid ${C.line}; border-radius: 4px; padding: 2rem 1.75rem; cursor: pointer; min-height: 230px; transition: transform 0.4s ${EASE}, border-color 0.4s ${EASE}; }
      .tier:hover { transform: translateY(-4px); border-color: ${C.ink42}; }
      .tier-active { border-color: ${C.gold}; box-shadow: 0 0 0 1px ${C.gold}; }
      .tier-hi { background: ${C.ink}; border-color: ${C.ink}; }
      .tier-hi.tier-active { box-shadow: 0 0 0 1px ${C.gold}; }
      .tier-tag { position: absolute; top: -11px; inset-inline-start: 1.75rem; background: ${C.gold}; color: ${C.cream}; font-family: ${fonts.body}; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.08em; padding: 0.25rem 0.8rem; border-radius: 2px; }
      .tier-cta { margin-top: 1.25rem; font-family: ${fonts.body}; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.04em; display: inline-flex; gap: 0.4rem; }

      /* Story */
      .yoav-figure { margin: 2rem 0 2.5rem; }
      .yoav-frame { border-radius: 4px; overflow: hidden; border: 1px solid ${C.line}; }
      .yoav-photo { width: 100%; display: block; transition: transform 6s ${EASE}; will-change: transform; }
      .yoav-frame:hover .yoav-photo { transform: scale(1.05); }
      .yoav-figure figcaption { font-family: ${fonts.body}; font-size: 0.8rem; color: ${C.ink42}; margin-top: 0.85rem; letter-spacing: 0.02em; }
      .pull-quote { margin: 2rem 0 0; padding-inline-start: 1.4rem; border-inline-start: 2px solid ${C.gold}; font-family: ${fonts.display}; font-style: italic; font-weight: 600; font-size: 1.35rem; line-height: 1.55; color: ${C.ink}; }

      /* Why */
      .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(2rem, 4vw, 4rem); }
      .why-rule { width: 100%; height: 1px; background: ${C.line}; margin: 1rem 0 1.4rem; }

      /* Testimonials */
      .testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
      .testi { margin: 0; background: ${C.paper}; border: 1px solid ${C.line}; border-radius: 4px; padding: 2.25rem 1.9rem; display: flex; flex-direction: column; height: 100%; }
      .testi-mark { font-family: ${fonts.display}; font-size: 3rem; line-height: 0.6; color: ${C.gold}; opacity: 0.5; }
      .testi blockquote { margin: 1.25rem 0 1.5rem; font-family: ${fonts.body}; font-size: 0.98rem; line-height: 1.75; color: ${C.ink80}; flex: 1; }
      .testi figcaption { display: flex; align-items: baseline; gap: 0.6rem; border-top: 1px solid ${C.line}; padding-top: 1.1rem; }
      .testi-name { font-family: ${fonts.display}; font-weight: 700; color: ${C.ink}; }
      .testi-role { font-family: ${fonts.body}; font-size: 0.76rem; color: ${C.goldDeep}; }

      /* Memorial */
      .mem-flame { display: block; width: 3px; height: 26px; margin: 0 auto 1.5rem; border-radius: 2px; background: linear-gradient(to top, ${C.goldDeep}, ${C.gold}); box-shadow: 0 0 16px rgba(169,132,63,0.6); }

      /* Transparency */
      .ledger-row { display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; align-items: baseline; padding: 1.75rem 0; border-top: 1px solid ${C.line}; }
      .ledger-row:last-child { border-bottom: 1px solid ${C.line}; }
      .ledger-idx { font-family: ${fonts.display}; font-weight: 700; font-size: 1.1rem; color: ${C.gold}; letter-spacing: 0.05em; }

      /* Partnership band — warm dark break for rhythm + colour */
      .band { position: relative; overflow: hidden; padding: clamp(4rem, 8vw, 6.5rem) 2rem; background: linear-gradient(155deg, #241C12 0%, ${C.ink} 55%, #14100A 100%); }
      .band::before { content: ""; position: absolute; inset: 0; background: radial-gradient(60% 55% at 78% 18%, rgba(169,132,63,0.22), transparent 70%); pointer-events: none; }
      .band-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; max-width: 620px; margin: 0 auto 2.75rem; }

      /* Donors */
      .donors-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem 3rem; }
      .donor-row { display: grid; grid-template-columns: 1fr auto; gap: 0.2rem 0.75rem; align-items: baseline; padding-bottom: 0.9rem; border-bottom: 1px solid ${C.lineSoft}; }

      /* FAQ */
      .faq-item { border-bottom: 1px solid ${C.line}; }
      .faq-item:first-child { border-top: 1px solid ${C.line}; }
      .faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.4rem 0.25rem; background: none; border: none; cursor: pointer; text-align: start; font-family: ${fonts.display}; font-weight: 700; font-size: 1.15rem; color: ${C.ink}; }
      .faq-sign { flex-shrink: 0; font-family: ${fonts.body}; font-size: 1.4rem; font-weight: 400; color: ${C.gold}; transition: transform 0.35s ${EASE}; }
      .faq-a { padding: 0 0.25rem 1.5rem; max-width: 92%; }

      /* Final */
      .final { position: relative; overflow: hidden; padding: clamp(5rem, 11vw, 9rem) 2rem; display: flex; align-items: center; }
      .final-scrim { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(20,15,8,0.86) 0%, rgba(24,20,12,0.76) 55%, rgba(18,14,8,0.9) 100%); }
      .final-fade-top { position: absolute; inset-inline: 0; top: 0; height: 120px; background: linear-gradient(to bottom, ${C.cream}, transparent); z-index: 1; }

      /* Sticky bar */
      .sticky-bar { position: fixed; inset-inline: 0; bottom: 0; z-index: 60; background: rgba(26,21,14,0.97); backdrop-filter: blur(8px); border-top: 1px solid ${C.gold}; padding: 0.85rem 1.5rem; display: flex; align-items: center; justify-content: center; gap: 1.5rem; flex-wrap: wrap; transition: transform 0.5s ${EASE}; }

      /* Focus */
      :focus-visible { outline: 2px solid ${C.gold}; outline-offset: 3px; }

      @media (max-width: 900px) {
        .testi-grid, .why-grid { grid-template-columns: 1fr; }
        .donors-grid { grid-template-columns: 1fr; }
        .band-stats { gap: 1.25rem; }
      }
      @media (max-width: 768px) {
        .donate-grid { grid-template-columns: 1fr !important; }
        .donate-grid > .donate-form-col { order: -1; position: static !important; }
        .donate-grid > .donate-form-col { position: static !important; }
      }

      @media (prefers-reduced-motion: reduce) {
        .bz-donate-reveal, .hero-fade-up, .hero-video, .yoav-photo { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; }
      }
    `}</style>
  );
}
