import { Heart } from "lucide-react";
import saadiaImg from "@/assets/saadia-soldier.png";

const DONATION_URL = "https://givechak.co.il/Saadia?ref=r3";

export default function MemorialFooter() {
  return (
    <section dir="rtl" className="relative bg-[hsl(0_40%_10%)] py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_20%_50%,hsl(38_50%_70%)_0%,transparent_50%)]" />

      <div className="relative max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Photo */}
          <div className="shrink-0">
            <img
              src={saadiaImg}
              alt="סעדיה הי״ד"
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover object-top border-2 border-[hsl(38_50%_60%)/40] shadow-xl"
            />
          </div>

          {/* Text */}
          <div className="flex-1 text-center md:text-right space-y-3">
            <h3 className="font-kedem font-bold text-[hsl(38_50%_90%)] text-xl md:text-2xl leading-snug">
              הפרויקט הזה נבנה לזכרו של סעדיה הי״ד
            </h3>
            <p className="font-ploni text-[hsl(38_40%_70%)] text-sm md:text-base leading-relaxed max-w-xl">
              אתר התנ״ך החדש של בני ציון — מלא בעוצמות, בניסים, ובכוחות שהתנ״ך נותן לחיים — נבנה עכשיו לזכרו.
              עזרו לנו לסיים את ההנצחה החשובה הזאת.
            </p>
          </div>

          {/* CTA */}
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-[hsl(38_45%_80%)] text-[hsl(0_40%_12%)] font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(38_50%_90%)] hover:shadow-lg hover:scale-105 shrink-0"
          >
            <Heart className="w-5 h-5" />
            תרמו לפרויקט
          </a>
        </div>
      </div>
    </section>
  );
}
