/**
 * נכסי הדף — מקום אחד לכל התמונות של chapter-weekly-v2.
 *
 * ⚠️ 10.9.2026, סבב ב׳: סער הפנה את הדף לשפה **צילומית ובהירה** לפי הפלייר שלו
 * (נופי ירושלים, אור בוקר חם, הספרים המודפסים) — ולא לאקוורל הנייבי הכהה של
 * `bneyzion-image-expert`. האיורים מהסבב הקודם נשארים כאן לשימוש בדפים אחרים.
 * המקורות והפרומפטים: `O-output/bz-chapter-weekly-v2/`.
 */

// ── צילומים (השפה החדשה) ───────────────────────────────────────────────────
import photoOlive from "@/assets/cw2-photo-band-olive.webp";
import photoStone from "@/assets/cw2-photo-band-stone.webp";
import photoSunrise from "@/assets/cw2-photo-band-sunrise.webp";
import photoHero from "@/assets/cw2-photo-hero-hills.webp";
import photoLearning from "@/assets/cw2-photo-learning.webp";
import ravFlyer from "@/assets/cw2-rav-flyer.webp";

// ── הכריכות המודפסות האמיתיות (קובצי ההדפסה 2025 מהדרייב, לא הדמיה) ────────
import booksGift from "@/assets/cw2-books-gift.webp";
import bookShoftim from "@/assets/cw2-book-shoftim.webp";

// ── אקוורל (הסבב הקודם) ────────────────────────────────────────────────────
import path from "@/assets/cw2-path.webp";
import shoftim from "@/assets/cw2-shoftim.webp";
import study from "@/assets/cw2-study.webp";
import yehoshua from "@/assets/cw2-yehoshua.webp";

export const ART = {
  /** הירו: מרפסת אבן ירושלמית, ענפי זית ונוף ההרים באור בוקר. */
  photoHero,
  /** רצועות פרלקס. */
  photoOlive,
  photoStone,
  photoSunrise,
  /** מישהו לומד מול הזום, עם התנ״ך פתוח לצידו. */
  photoLearning,
  /** הרב יואב — חתוך מהפלייר של סער. */
  ravFlyer,
  /** שני הכרכים המודפסים, מהדורת 2025. */
  booksGift,
  /** ספר שופטים לבדו — המתנה (יואב 13.9: שופטים, לא יהושע). */
  bookShoftim,
  // אקוורל
  yehoshua,
  shoftim,
  study,
  path,
} as const;

export type ArtKey = keyof typeof ART;
