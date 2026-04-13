import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Miracle {
  number: number;
  title: string;
  body_intro: string;
  image_url?: string;
  updated_at?: string;
}

function withCacheBustedImage(url?: string | null, updatedAt?: string) {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return updatedAt ? `${url}${separator}v=${encodeURIComponent(updatedAt)}` : url;
}

const DorHaplaotSection = () => {
  const [miracles, setMiracles] = useState<Miracle[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("miracles")
      .select("number, title, body_intro, image_url, updated_at")
      .eq("status", "published")
      .order("number", { ascending: false })
      .limit(3)
      .then(({ data }: { data: Miracle[] | null }) => {
        if (data) setMiracles(data.reverse());
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("miracles")
      .select("number", { count: "exact", head: true })
      .eq("status", "published")
      .then(({ count }: { count: number | null }) => {
        if (count) setTotal(count);
      });
  }, []);

  if (miracles.length === 0) return null;

  return (
    <section dir="rtl" className="py-14 md:py-20 bg-[hsl(38_50%_93%)]">
      <div className="container max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[hsl(0_60%_35%)/12] text-[hsl(0_60%_30%)] px-4 py-1.5 rounded-full mb-4 text-sm font-ploni font-bold">
            🇮🇱 מלחמת התקומה
          </div>
          <h2 className="font-kedem font-bold text-3xl md:text-4xl text-[hsl(0_60%_22%)] mb-3">
            דור הפלאות
          </h2>
          <p className="font-ploni text-[hsl(30_30%_40%)] text-lg max-w-xl mx-auto">
            {total} ניסים מוכחים ממלחמת התקומה — כל אחד עם חיבור עמוק לתנ״ך
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {miracles.map(miracle => (
            <Link
              key={miracle.number}
              to={`/dor-haplaot?nes=${miracle.number}`}
              className="group rounded-2xl border border-[hsl(30_30%_82%)] bg-[hsl(38_50%_97%)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[rgba(180,50,50,0.3)] text-right"
            >
              {miracle.image_url ? (
                <img
                  src={withCacheBustedImage(miracle.image_url, miracle.updated_at)}
                  alt={miracle.title}
                  className="w-full h-36 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-36 bg-gradient-to-bl from-[hsl(0_50%_28%)] to-[hsl(0_40%_18%)] flex items-center justify-center">
                  <span className="font-kedem font-bold text-4xl text-white/30">{miracle.number}</span>
                </div>
              )}
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(0_60%_35%)] text-white font-kedem font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
                    {miracle.number}
                  </span>
                  <h3 className="font-kedem font-bold text-sm md:text-base text-[hsl(0_60%_22%)] leading-tight line-clamp-2">
                    {miracle.title}
                  </h3>
                </div>
                <p className="font-ploni text-xs text-[hsl(30_25%_40%)] leading-relaxed line-clamp-2">
                  {miracle.body_intro?.slice(0, 100)}...
                </p>
                <p className="font-ploni font-bold text-xs text-[hsl(0_60%_35%)] mt-2 group-hover:underline">
                  קראו עוד ←
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/dor-haplaot"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(0_60%_32%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(0_60%_25%)] hover:shadow-xl hover:scale-105"
          >
            <BookOpen className="w-5 h-5" />
            לכל {total} הניסים
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <a
            href="https://chat.whatsapp.com/ESvREhJZyVN2hZ2Kqt8JLk?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(142_70%_30%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(142_70%_25%)] hover:shadow-lg hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            נס יומי בווצאפ
          </a>
        </div>
      </div>
    </section>
  );
};

export default DorHaplaotSection;
