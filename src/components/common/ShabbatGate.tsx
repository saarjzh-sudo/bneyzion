/**
 * ShabbatGate — כיסוי "האתר שובת" בשבתות ובחגי ישראל (רמה 26ד, 22.7.2026).
 *
 * הקלטת הבודק 13:16 + יואב "יש אפשרות שהאתר יהיה סגור בשבת?" + סער: "בטח".
 * UI בלבד — הסליקה, ה-webhooks וכל צד-השרת ממשיכים לעבוד כרגיל.
 *
 * עקיפות (sessionStorage, לבדיקות): ?shabbat=off · ?shabbat=preview · ?shabbat=auto
 */
import { useEffect, useState } from "react";
import { activeShabbatWindow } from "@/lib/shabbat";
import { colors, fonts, gradients } from "@/lib/designTokens";

const OVERRIDE_KEY = "bz-shabbat-override";

function readOverride(): string | null {
  try {
    const p = new URLSearchParams(window.location.search).get("shabbat");
    if (p === "off" || p === "preview") sessionStorage.setItem(OVERRIDE_KEY, p);
    else if (p === "auto") sessionStorage.removeItem(OVERRIDE_KEY);
    return sessionStorage.getItem(OVERRIDE_KEY);
  } catch {
    return null;
  }
}

export default function ShabbatGate() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const check = () => {
      const override = readOverride();
      if (override === "off") return setActive(false);
      if (override === "preview") return setActive(true);
      setActive(activeShabbatWindow() !== null);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="האתר שובת בשבת"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: gradients.warmDark,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <img
          src="/lovable-uploads/logo-bney-zion.png"
          alt="בני ציון"
          style={{ height: 84, margin: "0 auto 1.75rem", display: "block" }}
        />
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: colors.goldShimmer,
            marginBottom: "0.9rem",
          }}
        >
          לכבוד קדושת היום
        </div>
        <h1
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: "clamp(2rem, 7vw, 3rem)",
            color: "white",
            margin: "0 0 1rem",
            lineHeight: 1.2,
          }}
        >
          האתר שובת — שבת שלום
        </h1>
        <p
          style={{
            fontFamily: fonts.display,
            fontSize: "1.15rem",
            color: "rgba(232,213,160,0.95)",
            lineHeight: 1.9,
            margin: "0 0 1.5rem",
          }}
        >
          ״וְקָרָאתָ לַשַּׁבָּת עֹנֶג לִקְדוֹשׁ ה׳ מְכֻבָּד״
          <span style={{ display: "block", fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: "0.35rem" }}>
            ישעיהו נח, יג
          </span>
        </p>
        <p style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: "rgba(255,255,255,0.85)", margin: 0 }}>
          נשוב מיד בצאת השבת או החג. מחכים לכם כאן עם כל שיעורי התנ״ך.
        </p>
      </div>
    </div>
  );
}
