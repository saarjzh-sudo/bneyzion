/**
 * authModalStore — חנות-מצב זעירה למודאל-ההתחברות הגלובלי.
 *
 * למה store ולא Context? כדי שאפשר יהיה לפתוח את המודאל מכל מקום באתר
 * (כותרת, באנר, דף-פנימי) בלי להזריק Provider ל-App.tsx (שאינו באזור-הבעלות
 * של מסלול זה). בקריאה הראשונה ל-openAuthModal המודאל מרכיב את עצמו ל-<body>
 * ב-root נפרד — כך הוא זמין גלובלית, אפס תלות במסלולים אחרים.
 *
 * אם בעתיד רוצים שיתוף-context מלא, אפשר במקום זה להרכיב <AuthModalHost/> פעם
 * אחת בתוך עץ-האפליקציה (App.tsx) — שתי השיטות עובדות.
 */
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

export type AuthModalVariant =
  | "general"
  | "progress"
  | "favorites"
  | "comment"
  | "enroll";

export interface AuthModalState {
  open: boolean;
  next?: string;
  variant: AuthModalVariant;
}

type Listener = (state: AuthModalState) => void;

let state: AuthModalState = { open: false, variant: "general" };
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(state);
}

export function subscribeAuthModal(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthModalState(): AuthModalState {
  return state;
}

export function openAuthModal(opts?: {
  next?: string;
  variant?: AuthModalVariant;
}): void {
  ensureMounted();
  state = {
    open: true,
    next: opts?.next,
    variant: opts?.variant ?? "general",
  };
  emit();
}

export function closeAuthModal(): void {
  state = { ...state, open: false };
  emit();
}

/* ---- self-mount ---- */
let root: Root | null = null;

function ensureMounted(): void {
  if (root || typeof document === "undefined") return;
  const el = document.createElement("div");
  el.id = "auth-modal-root";
  el.setAttribute("dir", "rtl");
  document.body.appendChild(el);
  root = createRoot(el);
  // טעינה דינמית — שומר את קוד המודאל מחוץ ל-bundle הראשוני עד שצריך אותו.
  void import("./AuthModalHost").then(({ default: AuthModalHost }) => {
    root?.render(createElement(AuthModalHost));
  });
}
