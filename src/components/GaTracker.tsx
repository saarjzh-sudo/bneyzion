/**
 * GaTracker — Google Analytics 4 (gtag) של הרב יואב, G-8RBR1T07GB (נשלח 14.9.2026).
 *
 * נטען אך ורק אחרי הסכמת-שיווק (מדיניות consent.ts מ-6.7, כמו פיקסל המטא
 * ב-ThankYou): בלי הסכמה — אף בקשה לא יוצאת לגוגל. משמעות: האנליטיקס של יואב
 * סופר רק גולשים שאישרו עוגיות, ולכן יראה פחות מהתנועה המלאה (הקונסול
 * ו-bot_sessions סופרים הכל).
 *
 * page_view נשלח ידנית על כל ניווט SPA (send_page_view כבוי — אחרת ניווט
 * ראשון נספר כפול), ודפי /admin מוחרגים כדי לא לזהם את הנתונים בתנועת ניהול.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { hasMarketingConsent, onConsentChange } from "@/lib/consent";

const GA_ID = "G-8RBR1T07GB";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let injected = false;
let lastSent = "";

function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  window.dataLayer = window.dataLayer || [];
  // gtag חייב לדחוף אובייקט arguments אמיתי — לא מערך; gtag.js מזהה לפי זה.
  function gtag(this: unknown) {
    (window.dataLayer as unknown[]).push(arguments);
  }
  window.gtag = gtag as unknown as (...args: unknown[]) => void;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

function sendPageView(path: string) {
  if (!injected || !window.gtag) return;
  if (path.startsWith("/admin")) return;
  if (path === lastSent) return; // בולם ירייה כפולה על אותו דף (mount + consent)
  lastSent = path;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export default function GaTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (hasMarketingConsent()) inject();
    return onConsentChange((state) => {
      if (state?.marketing) {
        inject();
        // המשתמש אישר באמצע ביקור — הדף הנוכחי עוד לא נספר
        sendPageView(window.location.pathname + window.location.search);
      }
    });
  }, []);

  useEffect(() => {
    sendPageView(pathname + search);
  }, [pathname, search]);

  return null;
}
