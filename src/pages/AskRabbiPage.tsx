/**
 * /ask-rabbi — "שאל את הרב" (עמוד ציבורי).
 *
 * כמו באתר הישן: גולש שולח שאלה (שם חובה, מייל רשות לקבלת עותק התשובה),
 * השאלה נכנסת לתור האדמין (/admin/questions), ואחרי מענה ופרסום התשובה
 * מופיעה כאן — אקורדיון שאלות ותשובות עם חיפוש.
 *
 * עיצוב: שפת parchment+gold של האתר (designTokens), inline styles, RTL,
 * mobile-first. עטוף ב-DesignLayout כמו שאר העמודים הציבוריים.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  HelpCircle,
  Loader2,
  MessageCircleQuestion,
  Search,
  Send,
  X,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { Seo } from "@/components/seo/Seo";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { usePublishedQuestions, useSubmitQuestion, type SiteQuestion } from "@/hooks/useSiteQuestions";
import { supabase } from "@/integrations/supabase/client";

// ── Helpers ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

const fieldLabel: CSSProperties = {
  display: "block",
  fontFamily: fonts.body,
  fontSize: "0.82rem",
  fontWeight: 700,
  color: colors.textMid,
  marginBottom: "0.35rem",
};

const fieldInput: CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.9rem",
  borderRadius: radii.md,
  border: "1px solid rgba(139,111,71,0.25)",
  background: "#fff",
  fontFamily: fonts.body,
  fontSize: "0.9rem",
  color: colors.textDark,
  outline: "none",
  boxSizing: "border-box",
};

const errorText: CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "0.75rem",
  color: "#b91c1c",
  margin: "0.3rem 0 0",
};

// ── Question form ──────────────────────────────────────────────────────────

function QuestionForm() {
  const submitQuestion = useSubmitQuestion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; question?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "מלאו שם, כדי שנדע למי עונים";
    if (question.trim().length < 10) next.question = "כתבו את השאלה בכמה מילים (לפחות 10 תווים)";
    if (email.trim() && !EMAIL_RE.test(email.trim())) next.email = "כתובת המייל לא תקינה";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitQuestion.isPending) return;
    submitQuestion.mutate(
      { asker_name: name, asker_email: email.trim() || undefined, question },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  if (submitted) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: radii.xl,
          border: "1px solid rgba(139,111,71,0.15)",
          boxShadow: shadows.card,
          padding: "2.5rem 1.75rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: gradients.goldButton,
            boxShadow: shadows.goldGlowSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}
        >
          <Send size={24} style={{ color: "#fff" }} aria-hidden />
        </div>
        <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.35rem", color: colors.textDark, margin: "0 0 0.5rem" }}>
          השאלה התקבלה!
        </h2>
        <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMuted, lineHeight: 1.7, margin: "0 auto", maxWidth: 420 }}>
          הרב עובר על השאלות ועונה אישית. נפרסם תשובה בקרוב כאן בעמוד
          {email.trim() ? ", ועותק ממנה יגיע גם למייל שהשארתם." : "."}
        </p>
        <button
          type="button"
          onClick={() => {
            setQuestion("");
            setErrors({});
            setSubmitted(false);
            submitQuestion.reset();
          }}
          style={{
            marginTop: "1.5rem",
            padding: "0.6rem 1.4rem",
            borderRadius: radii.pill,
            border: `1px solid rgba(139,111,71,0.35)`,
            background: "transparent",
            color: colors.goldDark,
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          יש לי עוד שאלה
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{
        background: "#fff",
        borderRadius: radii.xl,
        border: "1px solid rgba(139,111,71,0.15)",
        boxShadow: shadows.card,
        padding: "1.75rem 1.5rem",
      }}
    >
      <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.25rem", color: colors.textDark, margin: "0 0 0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <MessageCircleQuestion size={22} style={{ color: colors.goldDark }} aria-hidden />
        שלחו שאלה לרב
      </h2>
      <p style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, margin: "0 0 1.25rem", lineHeight: 1.6 }}>
        כל שאלה בתנ״ך, באמונה או בלימוד מתקבלת בשמחה. התשובות מתפרסמות כאן בעמוד.
      </p>

      <div style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <label htmlFor="ask-name" style={fieldLabel}>
              שם <span style={{ color: colors.goldDark }}>*</span>
            </label>
            <input
              id="ask-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="השם שלכם"
              autoComplete="name"
              aria-invalid={!!errors.name}
              style={{ ...fieldInput, borderColor: errors.name ? "#b91c1c" : "rgba(139,111,71,0.25)" }}
            />
            {errors.name && <p style={errorText}>{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="ask-email" style={fieldLabel}>
              מייל <span style={{ fontWeight: 400, color: colors.textSubtle }}>(רשות)</span>
            </label>
            <input
              id="ask-email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              style={{ ...fieldInput, textAlign: "left", borderColor: errors.email ? "#b91c1c" : "rgba(139,111,71,0.25)" }}
            />
            {errors.email ? (
              <p style={errorText}>{errors.email}</p>
            ) : (
              <p style={{ fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle, margin: "0.3rem 0 0" }}>
                אם תרצו לקבל את התשובה למייל
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="ask-question" style={fieldLabel}>
            השאלה <span style={{ color: colors.goldDark }}>*</span>
          </label>
          <textarea
            id="ask-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={5}
            placeholder="כתבו כאן את השאלה..."
            aria-invalid={!!errors.question}
            style={{
              ...fieldInput,
              resize: "vertical",
              minHeight: 110,
              lineHeight: 1.7,
              borderColor: errors.question ? "#b91c1c" : "rgba(139,111,71,0.25)",
            }}
          />
          {errors.question && <p style={errorText}>{errors.question}</p>}
        </div>

        {submitQuestion.isError && (
          <p style={{ ...errorText, fontSize: "0.82rem" }}>
            השליחה לא הצליחה. בדקו את החיבור לאינטרנט ונסו שוב.
          </p>
        )}

        <button
          type="submit"
          disabled={submitQuestion.isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.8rem 1.5rem",
            borderRadius: radii.lg,
            border: "none",
            background: gradients.goldButton,
            color: "#fff",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: submitQuestion.isPending ? "wait" : "pointer",
            boxShadow: shadows.goldGlowSoft,
            opacity: submitQuestion.isPending ? 0.75 : 1,
            justifySelf: "start",
          }}
        >
          {submitQuestion.isPending ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} aria-hidden /> שולחים...
            </>
          ) : (
            <>
              <Send size={16} aria-hidden /> שליחת השאלה
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ── ארכיון השו"ת (טבלת shut_archive) + שאלות הגולשים שנענו ────────────────────
/**
 * הארכיון = 206 שאלות ותשובות שהיגרו מהאתר הישן (mediaType=שות), עם טקסט השאלה
 * המלא שנגרד מהמקור והתשובה מ-lessons.content. הטבלה לא ב-generated types →
 * גישה דרך `as never` (תבנית useSiteQuestions). קריאה ציבורית (RLS public read).
 *
 * התצוגה: כרטיסיות ב-3 טורים (כותרת + פתיח השאלה) → פופאפ עם שאלה+תשובה מלאות,
 * בלי ניווט לדף המקור. שאלות הגולשים שנענו (site_questions) מוצגות באותו גריד.
 */
interface ShutCard {
  id: string;
  kind: "archive" | "user";
  title: string;
  question: string;
  rabbi: string | null;
  asker: string | null;
}

interface ShutFull extends ShutCard {
  answerHtml: string | null; // ארכיון = HTML
  answerText: string | null; // גולשים = טקסט
}

const PAGE = 24;

function useShutList(search: string, limit: number) {
  return useQuery({
    queryKey: ["shut-list", search, limit],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from("shut_archive" as never)
        .select("id,title,question,rabbi,sort_order", { count: "exact" })
        .order("sort_order" as never, { ascending: true })
        .limit(limit);
      const term = search.trim();
      if (term) {
        q = q.or(`title.ilike.%${term}%,question.ilike.%${term}%`);
      }
      const { data, error, count } = (await q) as {
        data: Array<{ id: string; title: string; question: string; rabbi: string | null }> | null;
        error: unknown;
        count: number | null;
      };
      if (error) throw error;
      const cards: ShutCard[] = (data ?? []).map((r) => ({
        id: r.id,
        kind: "archive",
        title: r.title,
        question: r.question,
        rabbi: r.rabbi,
        asker: null,
      }));
      return { cards, total: count ?? cards.length };
    },
    staleTime: 5 * 60_000,
  });
}

function useShutAnswer(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: ["shut-answer", id],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("shut_archive" as never)
        .select("answer_html,rabbi,title,question")
        .eq("id" as never, id as never)
        .single()) as {
        data: { answer_html: string; rabbi: string | null; title: string; question: string } | null;
        error: unknown;
      };
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60_000,
  });
}

// ── פופאפ שאלה+תשובה ──────────────────────────────────────────────────────────
function ShutDialog({ card, onClose }: { card: ShutFull; onClose: () => void }) {
  const isArchive = card.kind === "archive";
  const { data, isLoading } = useShutAnswer(isArchive ? card.id : null);
  const answerHtml = isArchive ? data?.answer_html ?? null : null;
  const rabbi = (isArchive ? data?.rabbi : card.rabbi) ?? card.rabbi;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(45,31,14,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 1rem 2rem",
        overflowY: "auto",
      }}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        style={{
          width: "100%",
          maxWidth: 640,
          background: colors.parchment,
          borderRadius: radii.xl,
          boxShadow: "0 24px 80px rgba(45,31,14,0.35)",
          overflow: "hidden",
          animation: "shutPop 0.22s ease",
        }}
      >
        {/* כותרת השאלה + סגירה */}
        <div style={{ background: gradients.warmDark, padding: "1.5rem 1.5rem 1.6rem", position: "relative" }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            style={{
              position: "absolute",
              insetInlineStart: 14,
              top: 14,
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.14)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} aria-hidden />
          </button>
          <div style={{ fontFamily: fonts.body, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.15em", color: colors.goldShimmer, marginBottom: "0.5rem" }}>
            שאלה ותשובה
          </div>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "1.4rem", color: "#fff", margin: 0, lineHeight: 1.3, paddingInlineEnd: "2.5rem" }}>
            {card.title.replace(/^"|"$/g, "")}
          </h2>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {/* השאלה */}
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", background: "rgba(139,111,71,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HelpCircle size={16} style={{ color: colors.goldDark }} aria-hidden />
            </span>
            <div>
              <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: colors.goldDark, marginBottom: "0.25rem" }}>
                {card.asker ? `${card.asker} שואל/ת` : "השאלה"}
              </div>
              <p style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: colors.textDark, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
                {card.question}
              </p>
            </div>
          </div>

          {/* התשובה */}
          <div
            style={{
              background: "#fff",
              borderRadius: radii.lg,
              borderInlineStart: `3px solid ${colors.goldLight}`,
              padding: "1.1rem 1.2rem",
            }}
          >
            {isArchive ? (
              isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem 0" }}>
                  <Loader2 size={22} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} aria-label="טוען" />
                </div>
              ) : (
                <div
                  className="shut-answer"
                  style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: colors.textMid, lineHeight: 1.85 }}
                  dangerouslySetInnerHTML={{ __html: answerHtml ?? "" }}
                />
              )
            ) : (
              <>
                <div style={{ fontFamily: fonts.body, fontSize: "0.72rem", fontWeight: 700, color: colors.goldDark, marginBottom: "0.4rem" }}>התשובה</div>
                <p style={{ fontFamily: fonts.body, fontSize: "0.95rem", color: colors.textMid, lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap" }}>
                  {card.answerText}
                </p>
              </>
            )}
            {rabbi && !isArchive && (
              <p style={{ fontFamily: fonts.body, fontSize: "0.78rem", fontWeight: 700, color: colors.goldDark, margin: "0.9rem 0 0" }}>{rabbi}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── כרטיסיית שאלה ─────────────────────────────────────────────────────────────
function ShutCardTile({ card, onOpen }: { card: ShutCard; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        textAlign: "right",
        background: "#fff",
        border: `1px solid ${hover ? "rgba(139,111,71,0.4)" : "rgba(139,111,71,0.14)"}`,
        borderRadius: radii.xl,
        boxShadow: hover ? shadows.cardHover : shadows.cardSoft,
        padding: "1.25rem 1.25rem 1.1rem",
        cursor: "pointer",
        transition: "box-shadow 0.2s, border-color 0.2s, transform 0.2s",
        transform: hover ? "translateY(-3px)" : "none",
        height: "100%",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontFamily: fonts.body, fontSize: "0.68rem", fontWeight: 700, color: colors.goldDark, marginBottom: "0.6rem" }}>
        <HelpCircle size={13} aria-hidden />
        {card.kind === "archive" ? "שו״ת" : "שאלת גולש"}
      </span>
      <h3 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark, margin: "0 0 0.5rem", lineHeight: 1.4 }}>
        {card.title.replace(/^"|"$/g, "")}
      </h3>
      <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, lineHeight: 1.65, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {card.question}
      </p>
      <span style={{ marginTop: "auto", paddingTop: "0.9rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: fonts.body, fontSize: "0.82rem", fontWeight: 700, color: colors.goldDark }}>
        {card.rabbi ? `לתשובת ${card.rabbi}` : "לתשובה המלאה"}
        <ChevronDown size={15} style={{ transform: "rotate(90deg)" }} aria-hidden />
      </span>
    </button>
  );
}

// ── גריד הארכיון ──────────────────────────────────────────────────────────────
function ShutArchiveSection() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [active, setActive] = useState<ShutFull | null>(null);

  const published = usePublishedQuestions();

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput);
      setLimit(PAGE);
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useShutList(search, limit);
  const archiveCards = data?.cards ?? [];
  const total = data?.total ?? 0;

  // שאלות הגולשים שנענו — מסוננות מקומית ומוצגות ראשונות
  const userCards: ShutFull[] = useMemo(() => {
    const list = (published.data ?? []) as SiteQuestion[];
    const term = search.trim();
    return list
      .filter((q) => !term || q.question.includes(term) || (q.answer ?? "").includes(term))
      .map((q) => ({
        id: q.id,
        kind: "user" as const,
        title: q.question.length > 48 ? q.question.slice(0, 46) + "…" : q.question,
        question: q.question,
        rabbi: q.answered_by,
        asker: q.asker_name,
        answerHtml: null,
        answerText: q.answer,
      }));
  }, [published.data, search]);

  return (
    <section style={{ marginTop: "3.25rem" }} aria-label="ארכיון שאלות ותשובות">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.5rem", color: colors.textDark, margin: 0 }}>
            שאלות ותשובות
          </h2>
          <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, margin: "0.35rem 0 0" }}>
            {total > 0 ? `${total} תשובות מרבני בית המדרש — לחצו על כל שאלה` : "אוצר של שאלות ותשובות בתנ״ך ובאמונה"}
          </p>
        </div>
        <div style={{ position: "relative", minWidth: 220, flex: "0 1 300px" }}>
          <Search size={15} aria-hidden style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: colors.textSubtle }} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="חיפוש בשאלות ובתשובות..."
            aria-label="חיפוש בארכיון השו״ת"
            style={{ ...fieldInput, padding: "0.6rem 2.2rem 0.6rem 0.9rem", fontSize: "0.85rem", borderRadius: radii.pill }}
          />
        </div>
      </div>

      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
          <Loader2 size={28} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} aria-label="טוען" />
        </div>
      )}

      {isError && !isLoading && (
        <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, textAlign: "center", padding: "2rem 0" }}>
          לא הצלחנו לטעון את הארכיון כרגע. רעננו את הדף ונסו שוב.
        </p>
      )}

      {!isLoading && !isError && archiveCards.length === 0 && userCards.length === 0 && (
        <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMuted, textAlign: "center", padding: "2.5rem 0" }}>
          {search.trim() ? `לא נמצאו שאלות לחיפוש "${search.trim()}".` : "הארכיון ריק כרגע."}
        </p>
      )}

      <div className="shut-grid">
        {userCards.map((c) => (
          <ShutCardTile key={c.id} card={c} onOpen={() => setActive(c)} />
        ))}
        {archiveCards.map((c) => (
          <ShutCardTile
            key={c.id}
            card={c}
            onOpen={() => setActive({ ...c, answerHtml: null, answerText: null })}
          />
        ))}
      </div>

      {!isLoading && !isError && archiveCards.length < total && (
        <div style={{ textAlign: "center", marginTop: "1.75rem" }}>
          <button
            type="button"
            onClick={() => setLimit((v) => v + PAGE)}
            style={{ padding: "0.7rem 1.8rem", borderRadius: radii.pill, border: "1.5px solid rgba(139,111,71,0.35)", background: "transparent", fontFamily: fonts.body, fontWeight: 700, fontSize: "0.88rem", color: colors.goldDark, cursor: "pointer" }}
          >
            עוד שאלות ({total - archiveCards.length})
          </button>
        </div>
      )}

      {active && <ShutDialog card={active} onClose={() => setActive(null)} />}
    </section>
  );
}

// ── טופס שאלה מתקפל ───────────────────────────────────────────────────────────
function CollapsibleAsk() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: "-2.75rem", position: "relative", zIndex: 2 }}>
      {open ? (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="סגירת הטופס"
            style={{ position: "absolute", insetInlineStart: 16, top: 16, zIndex: 3, width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(139,111,71,0.25)", background: "#fff", color: colors.goldDark, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={16} aria-hidden />
          </button>
          <QuestionForm />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "0.9rem",
            padding: "1.15rem 1.5rem",
            background: "#fff",
            border: "1px solid rgba(139,111,71,0.18)",
            borderRadius: radii.xl,
            boxShadow: shadows.card,
            cursor: "pointer",
            textAlign: "right",
          }}
        >
          <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: "50%", background: gradients.goldButton, boxShadow: shadows.goldGlowSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageCircleQuestion size={22} style={{ color: "#fff" }} aria-hidden />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontFamily: fonts.display, fontWeight: 800, fontSize: "1.05rem", color: colors.textDark }}>
              רוצים לשאול את הרב?
            </span>
            <span style={{ display: "block", fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textMuted, marginTop: "0.15rem" }}>
              לחצו כאן לפתיחת טופס שאלה — התשובה תתפרסם כאן ותגיע גם למייל
            </span>
          </span>
          <ChevronDown size={20} style={{ color: colors.goldDark, flexShrink: 0 }} aria-hidden />
        </button>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AskRabbiPage() {
  return (
    <DesignLayout sidebar={false}>
      <Seo
        title="שאל את הרב"
        description="שלחו שאלה בתנ״ך ובאמונה לרב, וקראו אלפי שאלות ותשובות מבית המדרש בני ציון."
        url="https://bneyzion.co.il/ask-rabbi"
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shutPop { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }
        .shut-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 900px) { .shut-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .shut-grid { grid-template-columns: 1fr; } }
        .shut-answer p { margin: 0 0 0.85rem; }
        .shut-answer h2 { font-family: ${fonts.display}; font-size: 1.05rem; color: ${colors.goldDark}; margin: 0 0 0.75rem; }
        .shut-answer .author { color: ${colors.goldDark}; font-weight: 700; }
        .shut-answer a { color: ${colors.goldDark}; text-decoration: underline; }
      `}</style>

      {/* ── Hero ── */}
      <div dir="rtl" style={{ background: gradients.warmDark, padding: "2.75rem 1.5rem 4.5rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 40%, rgba(232,213,160,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", color: colors.goldShimmer, marginBottom: "0.6rem" }}>
            בית המדרש בני ציון
          </div>
          <h1 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "#fff", margin: 0, lineHeight: 1.15 }}>
            שאל את הרב
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: "rgba(255,255,255,0.65)", margin: "0.75rem auto 0", maxWidth: 560, lineHeight: 1.7 }}>
            אוצר של שאלות ותשובות בתנ״ך ובאמונה מבית המדרש. עיינו בשאלות של אחרים, ואם עלתה לכם שאלה — שאלו גם אתם.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div dir="rtl" style={{ maxWidth: 1000, margin: "0 auto", padding: "0 1.25rem 4rem" }}>
        <CollapsibleAsk />
        <ShutArchiveSection />
      </div>
    </DesignLayout>
  );
}
