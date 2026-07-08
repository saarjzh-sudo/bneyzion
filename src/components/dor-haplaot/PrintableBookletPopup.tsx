import { useState } from "react";
import { X, Heart, CheckCircle, Download } from "lucide-react";
import bookletCover from "@/assets/dor-haplaot-booklet-cover.webp";

const DONATION_URL = "https://givechak.co.il/Saadia?ref=r3";
// החוברת המעודכנת (70 ניסים, 8.7.2026) — על Storage של האתר (Rule 13), ?download= כופה הורדה
export const BOOKLET_URL =
  "https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/lesson-files/dor-haplaot/dor-haplaot-booklet-70.pdf?download=dor-haplaot-70-nisim.pdf";

type Step = 1 | 2 | 3;

export default function PrintableBookletPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);

  if (!open) return null;

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        dir="rtl"
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-[hsl(38_50%_95%)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress */}
        <div className="bg-[hsl(0_50%_18%)] px-6 py-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s <= step ? "bg-white text-[hsl(0_50%_18%)]" : "bg-white/20 text-white/50"
                }`}>
                  {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${s < step ? "bg-white" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>
          <h2 className="font-kedem font-bold text-xl text-white text-center">
            {step === 1 && "חוברת הניסים להדפסה"}
            {step === 2 && "אישור תרומה"}
            {step === 3 && "הורדת החוברת"}
          </h2>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <div className="flex justify-center">
                <img src={bookletCover} alt="חוברת דור הפלאות" className="w-56 h-auto rounded-lg shadow-md" />
              </div>
              <p className="font-ploni text-[hsl(30_25%_20%)] leading-[1.8] text-[15px] text-center">
                מוזמנים לקבל את <strong className="text-[hsl(0_60%_25%)]">כל 70 הניסים בחוברת מעוצבת להדפסה</strong> — עם חיבור תנ״כי מרומם לכל נס!
              </p>
              <p className="font-ploni text-[hsl(30_25%_20%)] leading-[1.8] text-[15px] text-center">
                תרמו ל<strong className="text-[hsl(0_60%_25%)]">בניית אתר התנ״ך השלם לזכר סעדיה דרעי הי״ד</strong>{" "}
                וקבלו את החוברת המלאה!
              </p>
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setTimeout(() => setStep(2), 500)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[hsl(0_60%_30%)] text-white font-kedem font-bold text-lg transition-all duration-300 hover:bg-[hsl(0_60%_22%)] hover:shadow-xl hover:scale-[1.02]"
              >
                <Heart className="w-5 h-5" />
                תרמו לקמפיין
              </a>
              <button
                onClick={handleClose}
                className="w-full text-center font-ploni text-sm text-[hsl(30_30%_55%)] hover:text-[hsl(30_30%_35%)] transition-colors"
              >
                אחר כך
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="font-ploni text-[hsl(30_25%_20%)] leading-[1.8] text-[15px] text-center">
                תודה רבה! 🙏
                <br />
                האם השלמתם את התרומה?
              </p>
              <button
                onClick={() => setStep(3)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[hsl(142_70%_30%)] text-white font-kedem font-bold text-lg transition-all duration-300 hover:bg-[hsl(142_70%_25%)] hover:shadow-xl hover:scale-[1.02]"
              >
                <CheckCircle className="w-5 h-5" />
                כן, תרמתי!
              </button>
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center font-ploni text-sm text-[hsl(0_60%_35%)] hover:underline transition-colors"
              >
                עוד לא, קחו אותי לדף התרומה
              </a>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-[hsl(142_70%_30%)]" />
              </div>
              <p className="font-ploni text-[hsl(30_25%_20%)] leading-[1.8] text-[15px] text-center">
                <strong className="text-[hsl(142_50%_25%)]">תודה ענקית!</strong>
                <br />
                הנה החוברת המלאה להדפסה — 70 ניסים עם חיבור תנ״כי.
                <br />
                שתפו עם חברים ומשפחה! 🇮🇱
              </p>
              <a
                href={BOOKLET_URL}
                download
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[hsl(0_60%_30%)] text-white font-kedem font-bold text-lg transition-all duration-300 hover:bg-[hsl(0_60%_22%)] hover:shadow-xl hover:scale-[1.02]"
              >
                <Download className="w-5 h-5" />
                הורידו את החוברת (PDF)
              </a>
              <button
                onClick={handleClose}
                className="w-full text-center font-ploni text-sm text-[hsl(30_30%_55%)] hover:text-[hsl(30_30%_35%)] transition-colors"
              >
                סגור
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
