import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Search } from "lucide-react";

const PAGES = [
  // ---- ציבורי ----
  { path: "/", label: "דף הבית", category: "ציבורי" },
  { path: "/parasha", label: "פרשת השבוע", category: "ציבורי" },
  { path: "/rabbis", label: "כל הרבנים", category: "ציבורי" },
  { path: "/rabbis/hagay-vlossky", label: "עמוד רב (דוגמה)", category: "ציבורי" },
  { path: "/series", label: "כל הסדרות", category: "ציבורי" },
  { path: "/series/1", label: "סדרה בודדת (דוגמה)", category: "ציבורי" },
  { path: "/lessons/1", label: "שיעור בודד (דוגמה)", category: "ציבורי" },
  { path: "/bible/bereshit", label: "תנ\"ך — בראשית", category: "ציבורי" },
  { path: "/community", label: "קהילה", category: "ציבורי" },
  { path: "/store", label: "חנות", category: "ציבורי" },
  { path: "/about", label: "אודותינו", category: "ציבורי" },
  { path: "/contact", label: "צור קשר", category: "ציבורי" },
  { path: "/pricing", label: "מחירים", category: "ציבורי" },
  // ---- ניסי המלחמה ----
  { path: "/dor-haplaot", label: "דור הפלאות — ניסי המלחמה", category: "ניסי המלחמה" },
  // ---- משתמש ----
  { path: "/auth", label: "כניסה / הרשמה", category: "משתמש" },
  { path: "/profile", label: "פרופיל אישי", category: "משתמש" },
  { path: "/favorites", label: "מועדפים", category: "משתמש" },
  { path: "/history", label: "היסטוריית צפייה", category: "משתמש" },
  { path: "/portal", label: "פורטל סדרות", category: "משתמש" },
  // ---- לזכר ----
  { path: "/memorial", label: "לזכר", category: "לזכר" },
  { path: "/memorial/saadia", label: "לזכר סעדיה הי\"ד", category: "לזכר" },
  // ---- תרומה / רכישה ----
  { path: "/donate", label: "תרומה", category: "תרומה" },
  { path: "/checkout", label: "צ'קאאוט", category: "תרומה" },
  { path: "/thank-you", label: "תודה", category: "תרומה" },
  { path: "/kenes", label: "כנס", category: "אירועים" },
  // ---- מיוחד ----
  { path: "/teachers", label: "פינת המורים", category: "מיוחד" },
  { path: "/chapter-weekly", label: "פרק שבועי", category: "מיוחד" },
  { path: "/megilat-esther", label: "מגילת אסתר", category: "מיוחד" },
  { path: "/proposal", label: "הצעה", category: "מיוחד" },
  { path: "/roadmap", label: "מפת דרכים", category: "מיוחד" },
  // ---- אדמין ----
  { path: "/admin", label: "לוח בקרה", category: "אדמין" },
  { path: "/admin/lessons", label: "שיעורים", category: "אדמין" },
  { path: "/admin/rabbis", label: "רבנים", category: "אדמין" },
  { path: "/admin/series", label: "סדרות", category: "אדמין" },
  { path: "/admin/homepage", label: "ניהול דף הבית", category: "אדמין" },
  { path: "/admin/users", label: "משתמשים", category: "אדמין" },
  { path: "/admin/orders", label: "הזמנות", category: "אדמין" },
  { path: "/admin/products", label: "מוצרים", category: "אדמין" },
  { path: "/admin/analytics", label: "אנליטיקס", category: "אדמין" },
  { path: "/admin/community-courses", label: "קורסי קהילה", category: "אדמין" },
  { path: "/admin/notifications", label: "התראות", category: "אדמין" },
  { path: "/admin/settings", label: "הגדרות", category: "אדמין" },
  { path: "/admin/upload", label: "העלאת תוכן", category: "אדמין" },
  { path: "/admin/migration", label: "מיגרציה", category: "אדמין" },
  { path: "/admin/messages", label: "הודעות", category: "אדמין" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "ציבורי": "bg-emerald-100 text-emerald-800",
  "ניסי המלחמה": "bg-red-100 text-red-800",
  "משתמש": "bg-blue-100 text-blue-800",
  "לזכר": "bg-gray-100 text-gray-700",
  "תרומה": "bg-amber-100 text-amber-800",
  "אירועים": "bg-purple-100 text-purple-800",
  "מיוחד": "bg-orange-100 text-orange-800",
  "אדמין": "bg-slate-100 text-slate-700",
};

const categories = [...new Set(PAGES.map(p => p.category))];

export default function DevPages() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = PAGES.filter(p => {
    const matchSearch = !search || p.label.includes(search) || p.path.includes(search);
    const matchCat = !activeCategory || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div dir="rtl" style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f8f7f4", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <img src="/lovable-uploads/logo-bney-zion.png" alt="בני ציון" style={{ width: 40, height: 40 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#2d1810" }}>ניווט דפים — bneyzion</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>{PAGES.length} דפים בפרויקט</p>
          </div>
        </div>

        {/* Search + filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, marginTop: 20 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חפש דף..."
              style={{
                width: "100%", padding: "8px 36px 8px 12px", borderRadius: 8,
                border: "1px solid #ddd", background: "white", fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
            />
            <Search size={15} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", color: "#aaa" }} />
          </div>

          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              style={{
                padding: "6px 14px", borderRadius: 999, border: "1px solid #ddd",
                background: activeCategory === cat ? "#2d1810" : "white",
                color: activeCategory === cat ? "white" : "#444",
                cursor: "pointer", fontSize: 13, fontWeight: 500
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Pages grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {filtered.map(page => (
            <Link
              key={page.path}
              to={page.path}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", background: "white", borderRadius: 10,
                border: "1px solid #e8e4de", textDecoration: "none", color: "inherit",
                transition: "box-shadow 0.15s, border-color 0.15s"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor = "#c8a96e";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.borderColor = "#e8e4de";
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a", marginBottom: 3 }}>{page.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <code style={{ fontSize: 11, color: "#888", direction: "ltr" }}>{page.path}</code>
                  <span style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 999, fontWeight: 500,
                    ...(CATEGORY_COLORS[page.category]
                      ? { background: CATEGORY_COLORS[page.category].split(" ")[0].replace("bg-", "").replace("-100", ""),
                          color: "#666" }
                      : { background: "#f0f0f0", color: "#666" })
                  }}>
                    {page.category}
                  </span>
                </div>
              </div>
              <ExternalLink size={13} style={{ color: "#aaa", flexShrink: 0 }} />
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#888", marginTop: 40, fontSize: 15 }}>
            לא נמצאו דפים עבור "{search}"
          </div>
        )}

        <div style={{ marginTop: 32, padding: "16px", background: "#fffbf0", borderRadius: 8, border: "1px solid #f0e8d0", fontSize: 13, color: "#888" }}>
          💡 דף זה קיים רק ב-dev — לא יעלה לפרוד׳ (מוגן ע"י env check) | נתיב: <code style={{direction:"ltr"}}>/dev-pages</code>
        </div>
      </div>
    </div>
  );
}
