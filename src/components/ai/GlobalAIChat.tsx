import { useLocation } from "react-router-dom";
import AIChatWidget from "./AIChatWidget";

// Pages where the chat widget should NOT appear
const EXCLUDED_PREFIXES = ["/admin", "/auth", "/checkout", "/thank-you"];

const PATH_CONTEXT: Record<string, string> = {
  "/": "דף הבית — אתר בני ציון",
  "/parasha": "פרשת השבוע",
  "/rabbis": "רשימת רבנים ומרצים",
  "/series": "סדרות שיעורים",
  "/bible": "ספרי התנ\"ך",
  "/favorites": "שיעורים מועדפים",
  "/history": "היסטוריית לימוד",
  "/about": "אודות בני ציון",
  "/community": "קהילת לומדים",
  "/store": "חנות ספרים",
  "/portal": "פורטל לומדים",
};

const getContext = (pathname: string): string | undefined => {
  // Exact match first
  if (PATH_CONTEXT[pathname]) return PATH_CONTEXT[pathname];

  // Prefix match
  for (const prefix of Object.keys(PATH_CONTEXT)) {
    if (prefix !== "/" && pathname.startsWith(prefix)) {
      return PATH_CONTEXT[prefix];
    }
  }

  return undefined;
};

const GlobalAIChat = () => {
  const { pathname } = useLocation();

  const isExcluded = EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isExcluded) return null;

  // LessonPage already renders AIChatWidget with lesson context — skip global one
  if (pathname.startsWith("/lessons/")) return null;

  return <AIChatWidget context={getContext(pathname)} />;
};

export default GlobalAIChat;
