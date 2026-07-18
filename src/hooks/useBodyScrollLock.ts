import { useEffect } from "react";

/**
 * נעילת גלילת ה-body כשתפריט/מגירה פתוחים (הרב יואב 17.7: "כשפותחים את
 * התפריט המסך מאחורה ממשיך להיגלל"). position:fixed ולא רק overflow:hidden —
 * ב-iOS Safari overflow:hidden על body לא עוצר touch-scroll.
 * בשחרור מחזירים את מיקום הגלילה המקורי.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const scrollY = window.scrollY;
    const { position, top, left, right, width, overflow } = document.body.style;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.left = left;
      document.body.style.right = right;
      document.body.style.width = width;
      document.body.style.overflow = overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
