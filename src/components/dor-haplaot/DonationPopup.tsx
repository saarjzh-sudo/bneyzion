import { useState, useEffect } from "react";
import { X, Heart } from "lucide-react";

const DONATION_URL = "https://givechak.co.il/Saadia?ref=r3";

export default function DonationPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("dor_popup_shown")) return;

    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setShow(true);
      sessionStorage.setItem("dor_popup_shown", "1");
    };

    const timer = setTimeout(trigger, 25000);

    const onScroll = () => {
      const scrollPercent =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= 65) trigger();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-[hsl(38_50%_95%)] rounded-2xl shadow-2xl overflow-hidden"
      >
        <button
          onClick={() => setShow(false)}
          className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-l from-[hsl(0_60%_25%)] to-[hsl(0_50%_18%)] p-6 text-white text-center">
          <h2 className="font-kedem font-bold text-xl mb-1">הצטרפו לפרויקט דור הפלאות</h2>
          <p className="font-ploni text-white/80 text-sm">תרמו ועזרו לנו להמשיך לפרסם ניסים</p>
        </div>

        <div className="p-6 space-y-4 text-center">
          <p className="font-ploni text-[hsl(30_25%_20%)] leading-[1.8] text-[15px]">
            עזרו לנו לבנות את אתר התנ״ך לזכר{" "}
            <strong className="text-[hsl(0_60%_25%)]">סעדיה דרעי הי״ד</strong>{" "}
            — ותקבלו את חוברת כל 64 הניסים!
          </p>
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[hsl(0_60%_30%)] text-white font-kedem font-bold text-lg transition-all duration-300 hover:bg-[hsl(0_60%_22%)] hover:shadow-xl hover:scale-[1.02]"
          >
            <Heart className="w-5 h-5" />
            תרמו לקמפיין
          </a>
          <button
            onClick={() => setShow(false)}
            className="w-full text-center font-ploni text-sm text-[hsl(30_30%_55%)] hover:text-[hsl(30_30%_35%)] transition-colors"
          >
            אחר כך
          </button>
        </div>
      </div>
    </div>
  );
}
