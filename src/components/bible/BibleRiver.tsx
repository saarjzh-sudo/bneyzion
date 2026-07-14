/**
 * BibleRiver — "נהר התנ״ך" (רמה 18, 15.7.2026)
 *
 * פורט React של אב-הטיפוס ששלח הרב יואב (river.html, 14.7): ציר-נהר רציף —
 * נהר החטיבות ← נשפכת רצועת הספרים ← נשפכת רצועת הפרקים. ההחלטה (אודיו 19:32):
 * הרכיב המעוצב יושב בעמוד שנפתח מ"ניווט לפי ספר ופרק" (/bible), לא בדף הבית.
 *
 * ללא טקסטורות (יגיעו כשיופקו) — הצבע בשפת האקוורל: גרדיאנטים רכים לחטיבות
 * ו-hue משפחתי מדורג לכל ספר. פרק מוביל ל-/bible/<ספר>?chapter=N; ספרי תורה
 * ויהושע מנווטים לפי יחידות (פרשות/נושאים) אל דף הספר.
 */
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fonts } from "@/lib/designTokens";

interface BookDef {
  name: string;
  ch: number;
  /** יחידות-לימוד (פרשות בתורה, נושאים ביהושע): כותרת + טווח פרקים */
  units?: Array<{ t: string; r: string }>;
}
interface SectionDef {
  label: string;
  key: "gold" | "teal" | "sage";
  books: BookDef[];
}

const U = (t: string, r: string) => ({ t, r });

const TANACH: Record<string, SectionDef> = {
  torah: {
    label: "תורה", key: "gold",
    books: [
      { name: "בראשית", ch: 50, units: [U("בראשית","א–ו"),U("נח","ו–יא"),U("לך לך","יב–יז"),U("וירא","יח–כב"),U("חיי שרה","כג–כה"),U("תולדות","כה–כח"),U("ויצא","כח–לב"),U("וישלח","לב–לו"),U("וישב","לז–מ"),U("מקץ","מא–מד"),U("ויגש","מד–מז"),U("ויחי","מז–נ")] },
      { name: "שמות", ch: 40, units: [U("שמות","א–ו"),U("וארא","ו–ט"),U("בא","י–יג"),U("בשלח","יג–יז"),U("יתרו","יח–כ"),U("משפטים","כא–כד"),U("תרומה","כה–כז"),U("תצוה","כז–ל"),U("כי תשא","ל–לד"),U("ויקהל","לה–לח"),U("פקודי","לח–מ")] },
      { name: "ויקרא", ch: 27, units: [U("ויקרא","א–ה"),U("צו","ו–ח"),U("שמיני","ט–יא"),U("תזריע","יב–יג"),U("מצורע","יד–טו"),U("אחרי מות","טז–יח"),U("קדושים","יט–כ"),U("אמור","כא–כד"),U("בהר","כה–כו"),U("בחקתי","כו–כז")] },
      { name: "במדבר", ch: 36, units: [U("במדבר","א–ד"),U("נשא","ד–ז"),U("בהעלתך","ח–יב"),U("שלח","יג–טו"),U("קרח","טז–יח"),U("חקת","יט–כב"),U("בלק","כב–כה"),U("פינחס","כה–ל"),U("מטות","ל–לב"),U("מסעי","לג–לו")] },
      { name: "דברים", ch: 34, units: [U("דברים","א–ג"),U("ואתחנן","ג–ז"),U("עקב","ז–יא"),U("ראה","יא–טז"),U("שופטים","טז–כא"),U("כי תצא","כא–כה"),U("כי תבוא","כו–כט"),U("נצבים","כט–ל"),U("וילך","לא"),U("האזינו","לב"),U("וזאת הברכה","לג–לד")] },
    ],
  },
  neviim: {
    label: "נביאים", key: "teal",
    books: [
      { name: "יהושע", ch: 24, units: [U("מינוי יהושע","א"),U("המרגלים","ב"),U("מעבר הירדן","ג–ד"),U("הפסח והמלאך","ה"),U("כיבוש יריחו","ו"),U("הכישלון בעי","ז"),U("כיבוש העי","ח"),U("הגבעונים","ט"),U("מלכי הדרום","י"),U("מלכי הצפון","יא"),U("סיכום הכיבוש","יב"),U("עבר הירדן","יג"),U("נחלת יהודה","יד–טו"),U("בני יוסף","טז–יז"),U("שאר השבטים","יח–יט"),U("ערי המקלט","כ–כא"),U("המזבח","כב"),U("נאומי הסיום","כג–כד")] },
      { name: "שופטים", ch: 21 }, { name: "שמואל א", ch: 31 }, { name: "שמואל ב", ch: 24 },
      { name: "מלכים א", ch: 22 }, { name: "מלכים ב", ch: 25 }, { name: "ישעיהו", ch: 66 },
      { name: "ירמיהו", ch: 52 }, { name: "יחזקאל", ch: 48 }, { name: "הושע", ch: 14 },
      { name: "יואל", ch: 4 }, { name: "עמוס", ch: 9 }, { name: "עובדיה", ch: 1 },
      { name: "יונה", ch: 4 }, { name: "מיכה", ch: 7 }, { name: "נחום", ch: 3 },
      { name: "חבקוק", ch: 3 }, { name: "צפניה", ch: 3 }, { name: "חגי", ch: 2 },
      { name: "זכריה", ch: 14 }, { name: "מלאכי", ch: 3 },
    ],
  },
  ketuvim: {
    label: "כתובים", key: "sage",
    books: [
      { name: "תהילים", ch: 150 }, { name: "משלי", ch: 31 }, { name: "איוב", ch: 42 },
      { name: "שיר השירים", ch: 8 }, { name: "רות", ch: 4 }, { name: "איכה", ch: 5 },
      { name: "קהלת", ch: 12 }, { name: "אסתר", ch: 10 }, { name: "דניאל", ch: 12 },
      { name: "עזרא", ch: 10 }, { name: "נחמיה", ch: 13 }, { name: "דברי הימים א", ch: 29 },
      { name: "דברי הימים ב", ch: 36 },
    ],
  },
};

const ORDER = ["torah", "neviim", "ketuvim"] as const;

// משפחות צבע אקוורליות (מתוך האב-טיפוס)
const FAMILY: Record<SectionDef["key"], [string, string]> = {
  gold: ["#cba054", "#ecdcb2"],
  teal: ["#6fb3a6", "#cfe6df"],
  sage: ["#7aad7e", "#d5e6d3"],
};
const ZONE_WASH: Record<SectionDef["key"], string> = {
  gold: "radial-gradient(ellipse 82% 90% at 50% 46%, rgba(214,168,88,.42), transparent 72%)",
  teal: "radial-gradient(ellipse 82% 90% at 50% 46%, rgba(84,188,172,.5), transparent 70%)",
  sage: "radial-gradient(ellipse 82% 90% at 50% 46%, rgba(124,178,126,.44), transparent 72%)",
};

function hexLerp(h1: string, h2: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
  const a = p(h1), b = p(h2);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}

function gematria(n: number): string {
  const H = ["", "ק", "ר", "ש", "ת"], T = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"], O = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  let s = "", h = Math.floor(n / 100), r = n % 100;
  while (h > 4) { s += "ת"; h -= 4; }
  s += H[h] || "";
  if (r === 15) s += "טו"; else if (r === 16) s += "טז";
  else { s += T[Math.floor(r / 10)] || ""; s += O[r % 10] || ""; }
  return s;
}

export function BibleRiver() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = ORDER.includes(searchParams.get("section") as any) ? (searchParams.get("section") as string) : null;
  const [section, setSection] = useState<string | null>(initialSection);
  const initialBook = initialSection
    ? TANACH[initialSection].books.find((b) => b.name === searchParams.get("book"))?.name ?? null
    : null;
  const [book, setBook] = useState<string | null>(initialBook);
  const [announce, setAnnounce] = useState("");

  const sec = section ? TANACH[section] : null;
  const selectedBook = useMemo(
    () => (sec && book ? sec.books.find((b) => b.name === book) ?? null : null),
    [sec, book],
  );

  const syncUrl = (s: string | null, b: string | null) => {
    const p = new URLSearchParams();
    if (s) p.set("section", s);
    if (b) p.set("book", b);
    setSearchParams(p, { replace: true });
  };

  const selectSection = (k: string) => {
    setSection(k);
    if (section !== k) setBook(null);
    setAnnounce(`נפתחו ספרי ${TANACH[k].label}`);
    syncUrl(k, section === k ? book : null);
  };
  const selectBook = (name: string) => {
    setBook(name);
    setAnnounce(`נפתחו הפרקים של ${name}`);
    syncUrl(section, name);
  };

  const bookHue = (idx: number, count: number) => {
    const f = FAMILY[sec!.key];
    return hexLerp(f[0], f[1], count > 1 ? idx / (count - 1) : 0.5);
  };
  const selectedIdx = sec && selectedBook ? sec.books.indexOf(selectedBook) : 0;
  const chapterHue = sec && selectedBook ? bookHue(selectedIdx, sec.books.length) : "#ecdcb2";

  const chapterItems = useMemo(() => {
    if (!selectedBook) return [];
    if (selectedBook.units) return selectedBook.units.map((u) => ({ label: u.t, sub: u.r, chapter: null as number | null }));
    return Array.from({ length: selectedBook.ch }, (_, i) => ({ label: gematria(i + 1), sub: "פרק", chapter: i + 1 }));
  }, [selectedBook]);

  const goToChapter = (item: { chapter: number | null }) => {
    if (!selectedBook) return;
    const base = `/bible/${encodeURIComponent(selectedBook.name)}`;
    navigate(item.chapter ? `${base}?chapter=${item.chapter}` : base);
  };

  const booksScroll = (sec?.books.length ?? 0) > 7;
  const chaptersScroll = chapterItems.length > 13;

  return (
    <div dir="rtl" style={{ fontFamily: fonts.body }}>
      <style>{`
        .bzr-river{position:relative;display:flex;width:100%;height:96px;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(80,50,20,.1);background:#f7f1e7}
        .bzr-zone{position:relative;flex:1 1 0;min-width:0;cursor:pointer;border:0;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-family:inherit;color:#40260f;background:none;overflow:hidden;isolation:isolate}
        .bzr-zone::before{content:"";position:absolute;inset:0;z-index:-1;transition:opacity .35s}
        .bzr-zone:hover::before{opacity:.82}
        .bzr-zone .nm{font-family:${fonts.display};font-weight:700;font-size:1.5rem;line-height:1;text-shadow:0 1px 0 rgba(255,255,255,.45);transition:font-size .4s}
        .bzr-zone .ct{font-size:.72rem;color:#5c4a33;opacity:.85}
        .bzr-zone.dim .nm{opacity:.78;font-size:1.2rem}
        .bzr-zone.dim .ct{opacity:.62}
        .bzr-zone.sel::after{content:"";position:absolute;left:16%;right:16%;bottom:10px;height:3px;border-radius:3px;background:#fff;box-shadow:0 0 7px rgba(255,255,255,.85),0 1px 2px rgba(120,90,40,.3)}
        .bzr-pour{display:grid;grid-template-rows:0fr;transition:grid-template-rows .5s cubic-bezier(.22,1,.36,1),margin .4s}
        .bzr-pour.open{grid-template-rows:1fr;margin-top:10px}
        .bzr-pour>.inner{overflow:hidden;min-height:0}
        .bzr-stream{position:relative;display:flex;width:100%;height:60px;border-radius:16px;overflow:hidden;padding:5px;gap:0;background:#f7f1e7;box-shadow:inset 0 1px 4px rgba(80,50,20,.06)}
        .bzr-stream.ch{height:56px}
        .bzr-stream.scroll{overflow-x:auto;justify-content:flex-start;scrollbar-width:thin}
        .bzr-stream.scroll::-webkit-scrollbar{height:6px}
        .bzr-stream.scroll::-webkit-scrollbar-thumb{background:#d9c7a4;border-radius:3px}
        .bzr-seg{position:relative;flex:1 1 0;min-width:46px;cursor:pointer;border:0;padding:0 8px;font-family:inherit;color:#40260f;display:flex;align-items:center;justify-content:center;font-weight:500;font-size:.94rem;overflow:hidden;transition:transform .12s;background:none}
        .bzr-stream.scroll .bzr-seg{flex:0 0 auto;padding:0 20px}
        .bzr-seg+.bzr-seg{box-shadow:inset 1px 0 0 rgba(255,255,255,.3)}
        .bzr-seg:first-child{border-radius:0 12px 12px 0}
        .bzr-seg:last-child{border-radius:12px 0 0 12px}
        .bzr-seg span{position:relative;text-shadow:0 1px 0 rgba(255,255,255,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bzr-seg:active{transform:scale(.98)}
        .bzr-seg.sel{font-weight:700}
        .bzr-seg.sel::after{content:"";position:absolute;inset-inline:22%;bottom:6px;height:2.5px;border-radius:2px;background:rgba(255,255,255,.92);box-shadow:0 0 5px rgba(255,255,255,.7)}
        .bzr-stone{position:relative;flex:0 0 auto;cursor:pointer;border:0;font-family:inherit;color:#40260f;padding:0 14px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;overflow:hidden;transition:transform .12s;text-decoration:none;background:none}
        .bzr-stream.fill .bzr-stone{flex:1 1 0;min-width:0;padding:0 8px}
        .bzr-stone+.bzr-stone{box-shadow:inset 1px 0 0 rgba(255,255,255,.3)}
        .bzr-stone:first-child{border-radius:0 12px 12px 0}
        .bzr-stone:last-child{border-radius:12px 0 0 12px}
        .bzr-stone .st{font-weight:600;font-size:.9rem;text-shadow:0 1px 0 rgba(255,255,255,.5);white-space:nowrap}
        .bzr-stone .sc{font-size:.68rem;color:#6a5638}
        .bzr-stone:hover{transform:translateY(-2px)}
        .bzr-stone:active{transform:scale(.97)}
        .bzr-crumb{font-size:.9rem;color:#8a755d;min-height:1.4em;margin:.2rem 0 1.1rem}
        .bzr-crumb b{color:#986e26;font-weight:600}
        .bzr-hint{font-size:.78rem;color:#8a755d;margin-top:.7rem;text-align:center}
        @media (max-width:640px){
          .bzr-river{height:74px}
          .bzr-zone .nm{font-size:1.2rem}
          .bzr-zone.dim .nm{font-size:.95rem}
          .bzr-stream{height:54px}
          .bzr-seg{font-size:.9rem}
        }
        @media (prefers-reduced-motion:reduce){.bzr-pour,.bzr-zone::before,.bzr-seg,.bzr-stone{transition-duration:.12s!important}}
      `}</style>

      {/* פירור-דרך חי */}
      <div className="bzr-crumb" aria-hidden="true">
        {section ? (
          <>כל התנ״ך › <b>{TANACH[section].label}</b>{book ? <> › <b>{book}</b></> : null}</>
        ) : (
          "כל התנ״ך"
        )}
      </div>

      {/* רמה 1 — נהר החטיבות */}
      <div className="bzr-river" role="tablist" aria-label="חטיבות התנ״ך">
        {ORDER.map((k) => {
          const s = TANACH[k];
          const isSel = section === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={isSel}
              className={`bzr-zone${isSel ? " sel" : ""}${section && !isSel ? " dim" : ""}`}
              onClick={() => selectSection(k)}
            >
              <span aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: -1, background: ZONE_WASH[s.key] }} />
              <span className="nm">{s.label}</span>
              <span className="ct">{s.books.length} ספרים</span>
            </button>
          );
        })}
      </div>

      {/* רמה 2 — רצועת הספרים */}
      <div className={`bzr-pour${section ? " open" : ""}`}>
        <div className="inner">
          <div className={`bzr-stream ${booksScroll ? "scroll" : "fill"}`} role="group" aria-label="ספרי החטיבה">
            {sec?.books.map((b, i) => (
              <button
                key={b.name}
                type="button"
                className={`bzr-seg${book === b.name ? " sel" : ""}`}
                title={b.name}
                style={{
                  background: bookHue(i, sec.books.length),
                  ...(booksScroll ? {} : { flexGrow: 8 + b.ch / 5 }),
                }}
                onClick={() => selectBook(b.name)}
              >
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* רמה 3 — רצועת הפרקים / היחידות */}
      <div className={`bzr-pour${book ? " open" : ""}`}>
        <div className="inner">
          <div className={`bzr-stream ch ${chaptersScroll ? "scroll" : "fill"}`} role="group" aria-label="פרקי הספר">
            {chapterItems.map((it, i) => (
              <button
                key={`${it.label}-${i}`}
                type="button"
                className="bzr-stone"
                style={{ background: chapterHue }}
                onClick={() => goToChapter(it)}
              >
                <span className="st">{it.label}</span>
                <span className="sc">{it.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bzr-hint">
        {!section
          ? "בחרו חטיבה כדי לפתוח את הנהר"
          : !book
            ? "בחרו ספר כדי לפתוח את רצועת הפרקים"
            : "לחיצה על פרק מובילה לכל השיעורים שלו"}
      </div>
      <div role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {announce}
      </div>
    </div>
  );
}
