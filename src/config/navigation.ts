// Single source of truth for the site menu — desktop header AND mobile drawer.
// (Level 13, 9.7.2026: the mobile drawer had its own stale copy — רבנים/תנ״ך/קהילה —
// while the desktop menu had moved on. Never duplicate this list again.)

export interface NavItem {
  label: string;
  href: string;
}

// Order (RTL: first item = rightmost, closest to logo)
export const NAV_ITEMS: NavItem[] = [
  { label: "תנ״ך למשפחה", href: "/family-tanach" },
  { label: "אגף המורים", href: "/teachers" },
  { label: "פרשת השבוע", href: "/parasha" },
  { label: "הקורסים שלי", href: "/design-my-courses" },
  { label: "חנות", href: "/store" },
  { label: "אודותינו", href: "/about" },
];

// Teacher-context nav: same items minus "אגף המורים" (replaced by the context chip)
export const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: "פרשת השבוע", href: "/parasha" },
  { label: "חנות", href: "/store" },
  { label: "אודותינו", href: "/about" },
];

export const MEMORIAL_ITEM: NavItem = { label: "לזכר סעדיה הי״ד", href: "/memorial/saadia" };
