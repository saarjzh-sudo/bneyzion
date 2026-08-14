/**
 * KenesElul2026 - כנס אלול: איך ה׳ מדבר אלינו דרך התנ״ך? (13.8.2026, ליל ר״ח אלול)
 *
 * Route: /kenes-2026-08
 *
 * עמוד standalone (ללא Layout wrapper) — דף הקלטת הכנס, בתבנית KenesMilhamotHatanach.
 * הקלטה + מצגת + סיכום מורחב + תמלול מלא + CTA לתכנית הפרק השבועי (ספר חגי).
 */
import { sanitizeHtml } from "@/lib/sanitize";
import { useState } from "react";
import { Play, BookOpen, FileText, Presentation, ChevronDown, ChevronUp } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { SUMMARY_HTML, TRANSCRIPT_HTML } from "./kenesElul2026Content";

const KENES_TITLE = "כנס אלול";
const KENES_SUBTITLE = "איך ה׳ מדבר אלינו דרך התנ״ך?";
const KENES_ORG = "תנועת בני ציון ללימוד תנ״ך";
const KENES_DATE = "ליל ראש חודש אלול תשפ״ו | 13.8.2026 | שיעור מאת הרב יואב אוריאל";

const RECORDING_DRIVE_ID = "1w-_SyGCh0qEQ69aQ_VJIOojnygS7cxs3";
const SLIDES_DRIVE_ID = "1ZSOTlFc2xWOtLfniycsWJ781YCBZBOcC";

function Collapsible({
  title,
  icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-2xl border border-[hsl(38_50%_82%)] bg-[hsl(38_50%_95%)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-5 py-4 text-right hover:bg-[hsl(43_70%_47%/0.08)] transition-colors"
      >
        <span className="flex items-center gap-2 font-kedem font-bold text-lg md:text-xl text-[hsl(30_40%_25%)]">
          {icon}
          {title}
        </span>
        {open ? <ChevronUp className="w-5 h-5 text-[hsl(30_30%_50%)]" /> : <ChevronDown className="w-5 h-5 text-[hsl(30_30%_50%)]" />}
      </button>
      {open && <div className="px-5 pb-6">{children}</div>}
    </div>
  );
}

export default function KenesElul2026() {
  useSEO({
    title: `${KENES_TITLE} — ${KENES_SUBTITLE} | בני ציון`,
    description: `הקלטת כנס אלול של תנועת בני ציון: ${KENES_SUBTITLE} עם הרב יואב אוריאל, ליל ראש חודש אלול תשפ״ו. הקלטה מלאה, מצגת, סיכום מורחב ותמלול.`,
  });

  return (
    <div dir="rtl" className="min-h-screen bg-[hsl(38_50%_93%)]">
      {/* ===== HERO ===== */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <img
          src="/images/kenes-elul-hero.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(215_50%_12%/0.6)] via-[hsl(215_45%_12%/0.5)] to-[hsl(215_40%_10%/0.7)]" />
        <div className="relative z-10 px-4 py-16 max-w-3xl mx-auto">
          <div className="bg-[hsl(38_50%_94%/0.92)] backdrop-blur-sm rounded-3xl p-8 md:p-12 text-center shadow-xl border border-[hsl(38_40%_80%/0.5)]">
            <p className="font-kedem font-bold text-[hsl(30_40%_25%)] text-base md:text-lg mb-3 tracking-wide">
              {KENES_ORG}
            </p>
            <h1 className="font-kedem-hollow-aaa text-5xl sm:text-6xl md:text-7xl mb-4 leading-[1.05] tracking-tight text-black">
              {KENES_TITLE}
            </h1>
            <p className="font-kedem font-bold text-[hsl(30_40%_20%)] text-lg md:text-2xl mb-2">
              {KENES_SUBTITLE}
            </p>
            <p className="font-ploni text-[hsl(30_35%_35%)] text-sm md:text-base mb-8">
              {KENES_DATE}
            </p>
            <a
              href="#recording"
              className="inline-flex flex-row-reverse items-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(43_70%_47%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(43_70%_40%)] hover:shadow-xl hover:scale-105"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              לצפייה בהקלטה
            </a>
          </div>
        </div>
      </section>

      {/* ===== INTRO ===== */}
      <section className="py-10 md:py-14 px-4 bg-gradient-to-b from-[hsl(38_50%_93%)] to-[hsl(38_40%_88%)]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-kedem text-[hsl(30_40%_25%)] text-lg md:text-xl leading-relaxed mb-3">
            ערב לימוד מיוחד שהתקיים בליל ראש חודש אלול, בפתיחת לימוד ספר חגי
          </p>
          <p className="font-ploni text-[hsl(30_30%_40%)] text-base leading-relaxed">
            שעה של לימוד עומק עם הרב יואב אוריאל: איך פסוקים שנכתבו לפני אלפי שנים
            מדברים אלינו היום, ואיך שומעים את הקול הזה דווקא בחודש אלול.
          </p>
        </div>
      </section>

      {/* ===== RECORDING ===== */}
      <section id="recording" className="py-12 md:py-16 px-4 bg-[hsl(38_30%_85%)]">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <div>
            <h2 className="font-kedem font-bold text-2xl md:text-3xl text-[hsl(30_40%_20%)] text-center mb-2">
              הקלטת הכנס המלאה
            </h2>
            <p className="font-ploni text-[hsl(30_30%_45%)] text-center text-sm mb-6">
              הרב יואב אוריאל | כ-68 דקות
            </p>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black border border-[hsl(38_50%_82%)] shadow-lg">
              <iframe
                src={`https://drive.google.com/file/d/${RECORDING_DRIVE_ID}/preview`}
                title={`${KENES_TITLE} — ${KENES_SUBTITLE}`}
                className="w-full h-full"
                loading="lazy"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          </div>

          <Collapsible title="סיכום מורחב של השיעור" icon={<BookOpen className="w-5 h-5" />} defaultOpen>
            <div
              className="font-ploni text-[hsl(30_30%_30%)] leading-relaxed text-sm md:text-base [&_p]:mb-3 [&_blockquote]:border-r-4 [&_blockquote]:border-[hsl(43_70%_47%)] [&_blockquote]:pr-3 [&_blockquote]:my-3 [&_blockquote]:text-[hsl(30_40%_30%)] [&_blockquote]:italic [&_h3]:font-kedem [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-[hsl(30_40%_22%)]"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(SUMMARY_HTML) }}
            />
          </Collapsible>

          <Collapsible title="המצגת: חמשת הרצפים של התנ״ך" icon={<Presentation className="w-5 h-5" />}>
            <div className="w-full overflow-hidden rounded-xl border border-[hsl(38_50%_82%)] bg-white" style={{ height: "70vh" }}>
              <iframe
                src={`https://drive.google.com/file/d/${SLIDES_DRIVE_ID}/preview`}
                title="מצגת הכנס — חמשת הרצפים של התנ״ך"
                className="w-full h-full"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </Collapsible>

          <Collapsible title="תמלול מלא" icon={<FileText className="w-5 h-5" />}>
            <div
              className="font-ploni text-[hsl(30_30%_35%)] leading-relaxed text-sm max-h-[60vh] overflow-y-auto pl-2 [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(TRANSCRIPT_HTML) }}
            />
          </Collapsible>
        </div>
      </section>

      {/* ===== CTA — תכנית הפרק השבועי: ספר חגי ===== */}
      <div className="h-8 bg-gradient-to-b from-[hsl(38_30%_85%)] to-[hsl(175_45%_18%)]" />
      <section className="py-12 md:py-20 px-4 bg-[hsl(175_45%_18%)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-12">
            <div className="w-full md:w-2/5 shrink-0">
              <img
                src="/images/kenes-elul-hero.jpg"
                alt="תכנית הפרק השבועי — ספר חגי"
                className="w-full rounded-2xl shadow-2xl"
              />
            </div>

            <div className="flex-1 text-center md:text-right">
              <h2 className="font-kedem font-bold text-2xl md:text-3xl text-[hsl(43_70%_88%)] mb-4 leading-snug">
                מתחילים ספר חדש: חגי — הנביא של אלול
              </h2>
              <p className="font-ploni text-[hsl(38_50%_85%)] text-base leading-relaxed mb-4">
                הנבואה הראשונה בספר חגי נאמרה בא׳ אלול. בתוך פחות מחודש היא העירה עם
                שלם, ובכ״ד אלול העם כבר עמד ובנה את בית המקדש. יותר מ-2,500 שנה אחרי,
                אנחנו חוזרים באותו תאריך אל אותם הפסוקים ממש.
              </p>
              <p className="font-ploni text-[hsl(38_50%_85%)] text-base leading-relaxed mb-2">
                בתכנית הפרק השבועי עם הרב יואב אוריאל: פרק בשבוע, שיעור זום חי,
                ותכני העמקה ופורטל לימוד אישי.
              </p>
              <p className="font-ploni text-[hsl(43_70%_85%)] text-base leading-relaxed mb-8">
                מצטרפים עכשיו, רק 5 ש״ח לחודש הראשון — בלי התחייבות.
              </p>
              <a
                href="/chapter-weekly?src=kenes-page"
                className="inline-flex flex-row-reverse items-center gap-2 px-8 py-4 rounded-xl bg-[hsl(43_75%_55%)] text-[hsl(30_50%_15%)] font-kedem font-bold text-base md:text-lg shadow-lg transition-all duration-300 hover:bg-[hsl(43_75%_48%)] hover:shadow-xl hover:scale-105"
              >
                להצטרפות לתכנית הפרק השבועי
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
