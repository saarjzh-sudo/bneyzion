import { useState, useMemo, useEffect, useCallback } from "react";
import { MessageCircle, Share2, ChevronDown, ArrowRight, ArrowLeft, Search, X, Copy, Check, BookOpen } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg-bney-zion.jpg";
import MemorialFooter from "@/components/dor-haplaot/MemorialFooter";
import DonationPopup from "@/components/dor-haplaot/DonationPopup";
import Layout from "@/components/layout/Layout";

interface Chapter {
  number: number;
  title: string;
  subtitle: string;
  miracle_range: string;
  sort_order: number;
}

interface Miracle {
  number: number;
  title: string;
  chapter_number: number;
  body_intro: string;
  body_miracle: string;
  body_biblical: string;
  body_personal: string;
  verse_text: string;
  verse_source: string;
  cta_text: string;
  status: string;
  image_url?: string;
  publish_at?: string;
  updated_at?: string;
}

function withCacheBustedImage(url?: string | null, updatedAt?: string) {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return updatedAt ? `${url}${separator}v=${encodeURIComponent(updatedAt)}` : url;
}

function getChapterForMiracle(miracleNumber: number, chapters: Chapter[]): Chapter | undefined {
  return chapters.find(ch => {
    const [start, end] = ch.miracle_range.split("-").map(Number);
    return miracleNumber >= start && miracleNumber <= end;
  });
}

function ShareButtons({ miracle }: { miracle: Miracle }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/dor-haplaot?nes=${miracle.number}`;
  const text = `🇮🇱 נס מספר ${miracle.number}: ${miracle.title}\n${miracle.body_intro.slice(0, 100)}...\nקראו את הטור המלא:\n${url}`;

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  const shareFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={shareWhatsApp} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(142_70%_30%)] text-white font-ploni font-bold text-sm transition-all hover:bg-[hsl(142_70%_25%)] hover:scale-105">
        <MessageCircle className="w-4 h-4" /> WhatsApp
      </button>
      <button onClick={shareFacebook} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(220_60%_50%)] text-white font-ploni font-bold text-sm transition-all hover:bg-[hsl(220_60%_42%)] hover:scale-105">
        <Share2 className="w-4 h-4" /> Facebook
      </button>
      <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(38_40%_85%)] text-[hsl(30_40%_20%)] font-ploni font-bold text-sm transition-all hover:bg-[hsl(38_40%_78%)] hover:scale-105">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "הועתק!" : "העתק קישור"}
      </button>
    </div>
  );
}

function MiracleCard({ miracle, onClick, chapters }: { miracle: Miracle; onClick: () => void; chapters: Chapter[] }) {
  const chapter = getChapterForMiracle(miracle.number, chapters);
  return (
    <button
      onClick={onClick}
      className="group text-right rounded-2xl border border-[hsl(30_30%_82%)] bg-[hsl(38_50%_95%)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[rgba(180,50,50,0.3)] w-full"
    >
      {miracle.image_url && (
        <img
          src={withCacheBustedImage(miracle.image_url, miracle.updated_at)}
          alt={miracle.title}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(0_60%_35%)] text-white font-kedem font-bold text-lg shrink-0 group-hover:scale-110 transition-transform">
            {miracle.number}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-kedem font-bold text-base md:text-lg text-[hsl(0_60%_25%)] mb-1 leading-tight">
              {miracle.title}
            </h3>
            {chapter && (
              <p className="font-ploni text-xs text-[hsl(30_30%_45%)] mb-2">
                {chapter.subtitle} — {chapter.title}
              </p>
            )}
            <p className="font-ploni font-bold text-sm text-[hsl(30_25%_30%)] leading-relaxed line-clamp-2">
              {miracle.body_intro.slice(0, 120)}...
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <span className="font-ploni font-bold text-xs text-[hsl(0_60%_35%)] group-hover:underline">
            קראו עוד ←
          </span>
        </div>
      </div>
    </button>
  );
}

function MiracleDetail({ miracle, onClose, onPrev, onNext, hasPrev, hasNext, chapters }: {
  miracle: Miracle;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  chapters: Chapter[];
}) {
  const chapter = getChapterForMiracle(miracle.number, chapters);
  return (
    <div className="max-h-[85vh] overflow-y-auto">
      <div className="bg-gradient-to-l from-[hsl(0_60%_25%)] to-[hsl(0_50%_18%)] relative overflow-hidden">
        {miracle.image_url && (
          <img src={withCacheBustedImage(miracle.image_url, miracle.updated_at)} alt={miracle.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative p-6 md:p-8 text-white">
          <div className="flex items-center justify-end mb-4 gap-2">
            {hasPrev && (
              <button onClick={onPrev} className="p-2 rounded-full hover:bg-white/10 transition-colors" title="נס קודם">
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            {hasNext && (
              <button onClick={onNext} className="p-2 rounded-full hover:bg-white/10 transition-colors" title="נס הבא">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 text-white font-kedem font-bold text-2xl shrink-0 border-2 border-white/30">
              {miracle.number}
            </span>
            <div>
              <h2 className="font-kedem font-bold text-xl md:text-2xl leading-tight mb-1">
                {miracle.title}
              </h2>
              {chapter && (
                <p className="font-ploni text-sm text-white/70">
                  {chapter.subtitle} — {chapter.title}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        <p className="font-ploni font-bold text-[hsl(30_25%_20%)] leading-[1.9] text-base">
          {miracle.body_intro}
        </p>
        <p className="font-ploni font-bold text-[hsl(30_25%_20%)] leading-[1.9] text-base">
          {miracle.body_miracle}
        </p>
        {miracle.body_biblical && (
          <div className="bg-[hsl(38_40%_92%)] rounded-xl p-5 border-r-4 border-[hsl(0_60%_35%)]">
            <p className="font-ploni font-bold text-[hsl(30_25%_20%)] leading-[1.9] text-base">
              {miracle.body_biblical}
            </p>
          </div>
        )}
        {miracle.body_personal && (
          <p className="font-ploni font-bold text-[hsl(30_25%_20%)] leading-[1.9] text-base italic">
            {miracle.body_personal}
          </p>
        )}
        {miracle.verse_text && (
          <div className="bg-[hsl(38_45%_90%)] rounded-xl p-5 text-center">
            <p className="font-kedem font-bold text-lg md:text-xl text-[hsl(0_60%_25%)] leading-relaxed mb-2">
              ״{miracle.verse_text}״
            </p>
            <p className="font-ploni text-sm text-[hsl(30_30%_45%)]">
              📜 {miracle.verse_source}
            </p>
          </div>
        )}
        {miracle.cta_text && (
          <div className="bg-[hsl(38_40%_95%)] rounded-xl p-5 text-center">
            <p className="font-ploni font-bold text-[hsl(30_30%_30%)] mb-4">
              {miracle.cta_text}
            </p>
            <ShareButtons miracle={miracle} />
          </div>
        )}
        <div className="flex items-center justify-between pt-4 border-t border-[hsl(38_40%_85%)]">
          {hasPrev ? (
            <button onClick={onPrev} className="flex items-center gap-2 font-ploni font-bold text-sm text-[hsl(0_60%_35%)] hover:underline">
              <ArrowRight className="w-4 h-4" /> נס קודם
            </button>
          ) : <div />}
          {hasNext ? (
            <button onClick={onNext} className="flex items-center gap-2 font-ploni font-bold text-sm text-[hsl(0_60%_35%)] hover:underline">
              נס הבא <ArrowLeft className="w-4 h-4" />
            </button>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}

export default function DorHaplaot() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [miracles, setMiracles] = useState<Miracle[]>([]);
  const [introduction, setIntroduction] = useState<{ title: string; body: string; image_url: string | null } | null>(null);

  const fetchData = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("chapters")
      .select("number, title, subtitle, miracle_range, sort_order")
      .order("sort_order")
      .then(({ data }: { data: Chapter[] | null }) => {
        if (data) setChapters(data);
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("miracles")
      .select("number, title, chapter_number, body_intro, body_miracle, body_biblical, body_personal, verse_text, verse_source, cta_text, status, image_url, publish_at, updated_at")
      .order("number")
      .then(({ data }: { data: Miracle[] | null }) => {
        if (data) setMiracles(data);
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("dor_site_content")
      .select("title, body, image_url")
      .eq("key", "introduction")
      .single()
      .then(({ data }: { data: { title: string; body: string; image_url: string | null } | null }) => {
        if (data) setIntroduction(data);
      });
  }, []);

  useEffect(() => {
    fetchData();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchData]);

  // URL param: open specific miracle
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nesNum = params.get("nes");
    if (nesNum && miracles.length > 0) {
      const found = miracles.find(m => m.number === Number(nesNum));
      if (found) setSelectedMiracle(found);
    }
  }, [miracles]);

  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMiracle, setSelectedMiracle] = useState<Miracle | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const filteredMiracles = useMemo(() => {
    const now = new Date();
    let filtered = miracles.filter(m => {
      if (m.status !== "published") return false;
      if (m.publish_at && new Date(m.publish_at) > now) return false;
      return true;
    });
    if (selectedChapter !== null) filtered = filtered.filter(m => m.chapter_number === selectedChapter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.body_intro?.toLowerCase().includes(q) ||
        m.body_miracle?.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => sortAsc ? a.number - b.number : b.number - a.number);
    return filtered;
  }, [miracles, selectedChapter, searchQuery, sortAsc]);

  const currentIdx = selectedMiracle ? filteredMiracles.findIndex(m => m.number === selectedMiracle.number) : -1;
  const handlePrev = () => { if (currentIdx > 0) setSelectedMiracle(filteredMiracles[currentIdx - 1]); };
  const handleNext = () => { if (currentIdx < filteredMiracles.length - 1) setSelectedMiracle(filteredMiracles[currentIdx + 1]); };

  return (
    <Layout>
      <div dir="rtl" className="min-h-screen bg-[hsl(38_50%_93%)]">

        {/* ===== HERO ===== */}
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden -mt-24">
          <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover object-[30%_center] md:object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-[hsl(38_50%_93%)]" />
          <div className="relative z-10 text-center px-4 py-20 md:py-24 max-w-3xl mx-auto">
            <img
              src="/lovable-uploads/logo-bney-zion.png"
              alt="לוגו בני ציון"
              className="h-24 md:h-28 mx-auto mb-6 drop-shadow-lg"
            />
            <h1 className="font-kedem text-5xl sm:text-6xl md:text-7xl mb-4 leading-tight text-white drop-shadow-lg font-bold">
              דור הפלאות
            </h1>
            <p className="font-kedem text-xl md:text-2xl text-white/90 mb-2">
              ניסי מלחמת התקומה
            </p>
            <p className="font-ploni text-sm md:text-lg text-white/75 mb-8">
              כל יום נס אחד עם חיבור מיוחד לתנ״ך
            </p>

            <div className="flex items-center justify-center gap-2 md:gap-8 mb-8 text-white/80 font-ploni text-xs md:text-base">
              <span className="bg-white/10 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/20">
                <strong className="text-white">{filteredMiracles.length}</strong> ניסים זמינים
              </span>
              <span className="bg-white/10 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/20">
                <strong className="text-white">{chapters.length}</strong> פרקים
              </span>
              <span className="bg-white/10 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/20">
                כל יום נס חדש
              </span>
            </div>

            <div className="flex flex-col sm:flex-row-reverse items-center justify-center gap-3">
              <a
                href="#miracles-grid"
                className="flex flex-row-reverse items-center gap-2 px-5 py-2.5 md:px-7 md:py-3.5 rounded-xl bg-[hsl(0_60%_35%)] text-white font-kedem font-bold text-sm md:text-base transition-all duration-300 hover:bg-[hsl(0_60%_28%)] hover:shadow-xl hover:scale-105"
              >
                התחילו לקרוא
                <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              <a
                href="https://chat.whatsapp.com/ESvREhJZyVN2hZ2Kqt8JLk?mode=gi_t"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row-reverse items-center gap-2 px-5 py-2.5 md:px-7 md:py-3.5 rounded-xl bg-[hsl(142_70%_30%)] text-white font-kedem font-bold text-sm md:text-base transition-all duration-300 hover:bg-[hsl(142_70%_25%)] hover:shadow-xl hover:scale-105"
              >
                <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                הצטרפו לקבוצת WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* ===== INTRODUCTION ===== */}
        {introduction && (
          <section className="py-12 md:py-16 px-4 md:px-8 max-w-4xl mx-auto">
            <div className="bg-[hsl(38_50%_97%)] rounded-2xl shadow-lg overflow-hidden border border-[hsl(30_30%_82%)]">
              {introduction.image_url && (
                <img src={introduction.image_url} alt="הקדמה לדור הפלאות" className="w-full h-48 md:h-64 object-cover" />
              )}
              <div className="p-6 md:p-10">
                <h2 className="font-kedem font-bold text-2xl md:text-3xl text-[hsl(0_60%_25%)] text-center mb-6 leading-tight">
                  {introduction.title}
                </h2>
                <div className="font-ploni text-[hsl(30_25%_20%)] leading-[2] text-base md:text-lg space-y-4">
                  {introduction.body.split("\n").map((line, i) => {
                    if (!line.trim()) return <div key={i} className="h-2" />;
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={i}>
                        {parts.map((p, j) =>
                          j % 2 === 1 ? <strong key={j} className="font-bold text-[hsl(0_60%_25%)]">{p}</strong> : <span key={j}>{p}</span>
                        )}
                      </p>
                    );
                  })}
                </div>
                <div className="mt-8 text-center">
                  <a
                    href="https://chat.whatsapp.com/ESvREhJZyVN2hZ2Kqt8JLk?mode=gi_t"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[hsl(142_70%_30%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(142_70%_25%)] hover:shadow-xl hover:scale-105"
                  >
                    <MessageCircle className="w-5 h-5" />
                    הזמינו חברים לקבוצה
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== FILTERS & GRID ===== */}
        <section id="miracles-grid" className="py-12 md:py-20 px-4 md:px-8 max-w-6xl mx-auto">
          <h2 className="font-kedem font-bold text-3xl md:text-4xl text-[hsl(0_60%_25%)] text-center mb-3">
            ניסי המלחמה
          </h2>
          <p className="font-ploni text-[hsl(30_30%_45%)] text-center mb-10 text-lg">
            בחרו פרק או חפשו נס ספציפי
          </p>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 max-w-xl mx-auto">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(30_30%_55%)]" />
              <input
                type="text"
                placeholder="חיפוש לפי כותרת או תוכן..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-[hsl(38_40%_82%)] bg-[hsl(38_50%_97%)] font-ploni text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(180,50,50,0.3)] text-right"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-[hsl(30_30%_55%)]" />
                </button>
              )}
            </div>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="px-4 py-2.5 rounded-xl border border-[hsl(38_40%_82%)] bg-[hsl(38_50%_97%)] font-ploni font-bold text-sm text-[hsl(30_30%_35%)] hover:bg-[hsl(38_40%_92%)] transition-colors shrink-0"
            >
              {sortAsc ? `1 → ${filteredMiracles.length}` : `${filteredMiracles.length} → 1`}
            </button>
          </div>

          {/* Chapter Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              onClick={() => setSelectedChapter(null)}
              className={`px-4 py-2 rounded-full font-ploni font-bold text-sm transition-all ${
                selectedChapter === null
                  ? "bg-[hsl(0_60%_35%)] text-white shadow-md"
                  : "bg-[hsl(38_40%_90%)] text-[hsl(30_30%_35%)] hover:bg-[hsl(38_40%_85%)]"
              }`}
            >
              הכל
            </button>
            {chapters.map(ch => {
              const now = new Date();
              const chapterHasMiracles = miracles.some(m =>
                m.chapter_number === ch.number &&
                m.status === "published" &&
                (!m.publish_at || new Date(m.publish_at) <= now)
              );
              const isSelected = selectedChapter === ch.number;
              return (
                <button
                  key={ch.number}
                  onClick={() => chapterHasMiracles ? setSelectedChapter(isSelected ? null : ch.number) : undefined}
                  className={`px-4 py-2 rounded-full font-ploni font-bold text-xs md:text-sm transition-all ${
                    isSelected
                      ? "bg-[hsl(0_60%_35%)] text-white shadow-md"
                      : chapterHasMiracles
                        ? "bg-[hsl(38_40%_90%)] text-[hsl(30_30%_35%)] hover:bg-[hsl(38_40%_85%)]"
                        : "bg-[hsl(38_40%_93%)] text-[hsl(30_30%_60%)] cursor-default opacity-70"
                  }`}
                >
                  {ch.subtitle}: {ch.title}
                  {!chapterHasMiracles && <span className="mr-1 text-[10px] font-normal"> (בקרוב)</span>}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMiracles.map(miracle => (
              <MiracleCard
                key={miracle.number}
                miracle={miracle}
                chapters={chapters}
                onClick={() => setSelectedMiracle(miracle)}
              />
            ))}
          </div>

          {filteredMiracles.length === 0 && miracles.length > 0 && (
            <p className="text-center font-ploni text-[hsl(30_30%_50%)] py-12 text-lg">
              לא נמצאו ניסים התואמים את החיפוש
            </p>
          )}

          {miracles.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-[hsl(0_60%_35%)/30] mx-auto mb-4" />
              <p className="font-ploni text-[hsl(30_30%_50%)] text-lg">טוען ניסים...</p>
            </div>
          )}
        </section>

        {/* ===== CTA ===== */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-[hsl(38_50%_93%)] to-[hsl(38_40%_88%)]">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-kedem font-bold text-2xl md:text-3xl text-[hsl(0_60%_25%)] mb-4">
              הצטרפו לפרויקט דור הפלאות
            </h2>
            <p className="font-ploni text-[hsl(30_30%_40%)] text-base mb-6">
              קבלו כל יום נס חדש ישירות לווצאפ — עם חיבור מיוחד לתנ״ך
            </p>
            <a
              href="https://chat.whatsapp.com/ESvREhJZyVN2hZ2Kqt8JLk?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[hsl(142_70%_30%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(142_70%_25%)] hover:shadow-xl hover:scale-105"
            >
              <MessageCircle className="w-5 h-5" />
              הצטרפו לקבוצת WhatsApp
            </a>
          </div>
        </section>

        <MemorialFooter />

        <footer className="py-8 px-4 bg-[hsl(0_50%_12%)] text-center">
          <p className="font-ploni text-[hsl(38_40%_85%)] text-sm">
            תנועת בני ציון — דור הפלאות © {new Date().getFullYear()}
          </p>
        </footer>

        <DonationPopup />

        {/* Miracle Detail Dialog */}
        <Dialog open={!!selectedMiracle} onOpenChange={open => !open && setSelectedMiracle(null)}>
          <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden bg-[hsl(38_50%_97%)] border-none" dir="rtl">
            {selectedMiracle && (
              <MiracleDetail
                miracle={selectedMiracle}
                onClose={() => setSelectedMiracle(null)}
                onPrev={handlePrev}
                onNext={handleNext}
                hasPrev={currentIdx > 0}
                hasNext={currentIdx < filteredMiracles.length - 1}
                chapters={chapters}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
