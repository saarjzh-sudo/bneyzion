import { useEffect, useState } from "react";

import { EARLY_BIRD } from "./data";

/**
 * מצב חלון ההרשמה המוקדמת.
 *
 * שער fail-closed: ברגע שהתאריך עובר, `open` הופך ל-false וכל רכיבי ההרשמה
 * המוקדמת יורדים מהדף לבד. עדיף דף שקט על דף שמכריז "נשארו ‎-3 ימים".
 *
 * הספירה היא בימים שלמים לפי אזור הזמן של הגולש. זה מספיק לחלון של שבועות,
 * והמחיר היחיד הוא הפרש של יום אצל גולשים מחוץ לישראל בשעות הקטנות.
 */
export type EarlyBirdState = {
  open: boolean;
  daysLeft: number;
  /** "נשארו 24 ימים" · "נשאר יום אחד" · "היום האחרון" */
  label: string;
};

function computeDaysLeft(deadlineISO: string): number {
  const [y, m, d] = deadlineISO.split("-").map(Number);
  const deadline = new Date(y, m - 1, d);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((deadline.getTime() - today.getTime()) / MS_PER_DAY);
}

function toLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "היום האחרון";
  if (daysLeft === 1) return "נשאר יום אחד";
  if (daysLeft === 2) return "נשארו יומיים";
  return `נשארו ${daysLeft} ימים`;
}

function read(): EarlyBirdState {
  if (!EARLY_BIRD.enabled) return { open: false, daysLeft: 0, label: "" };

  const daysLeft = computeDaysLeft(EARLY_BIRD.deadlineISO);
  return {
    open: daysLeft >= 0,
    daysLeft: Math.max(0, daysLeft),
    label: toLabel(daysLeft),
  };
}

export function useEarlyBird(): EarlyBirdState {
  const [state, setState] = useState<EarlyBirdState>(read);

  useEffect(() => {
    // רענון כל דקה, כדי שכרטיסייה שנשארה פתוחה מעבר לחצות לא תשקר.
    const id = window.setInterval(() => setState(read()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return state;
}
