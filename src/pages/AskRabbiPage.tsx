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
import { useMemo, useState, type CSSProperties } from "react";
import {
  ChevronDown,
  HelpCircle,
  Loader2,
  Mail,
  MessageCircleQuestion,
  Search,
  Send,
  Sparkles,
  User,
} from "lucide-react";

import DesignLayout from "@/components/layout-v2/DesignLayout";
import { Seo } from "@/components/seo/Seo";
import { colors, fonts, gradients, radii, shadows } from "@/lib/designTokens";
import { usePublishedQuestions, useSubmitQuestion, type SiteQuestion } from "@/hooks/useSiteQuestions";

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

// ── Published Q&A accordion ────────────────────────────────────────────────

function QAItem({ q, isOpen, onToggle }: { q: SiteQuestion; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: radii.lg,
        border: `1px solid ${isOpen ? "rgba(139,111,71,0.35)" : "rgba(139,111,71,0.12)"}`,
        boxShadow: isOpen ? shadows.cardHover : shadows.cardSoft,
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          padding: "1rem 1.1rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "right",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(139,111,71,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
          <HelpCircle size={16} style={{ color: colors.goldDark }} aria-hidden />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", color: colors.textDark, lineHeight: 1.5 }}>
            {q.question}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.35rem", fontFamily: fonts.body, fontSize: "0.72rem", color: colors.textSubtle }}>
            <User size={11} aria-hidden />
            {q.asker_name}
            <span aria-hidden>·</span>
            {fmtDate(q.answered_at ?? q.created_at)}
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          style={{
            flexShrink: 0,
            color: colors.goldDark,
            marginTop: 6,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {isOpen && (
        <div style={{ padding: "0 1.1rem 1.1rem", marginInlineStart: "2.75rem" }}>
          <div
            style={{
              background: colors.parchment,
              borderRadius: radii.md,
              borderInlineStart: `3px solid ${colors.goldLight}`,
              padding: "0.9rem 1rem",
            }}
          >
            <p style={{ fontFamily: fonts.body, fontSize: "0.9rem", color: colors.textMid, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
              {q.answer}
            </p>
            {q.answered_by && (
              <p style={{ fontFamily: fonts.body, fontSize: "0.75rem", fontWeight: 700, color: colors.goldDark, margin: "0.75rem 0 0" }}>
                {q.answered_by}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PublishedList() {
  const { data: questions, isLoading, isError } = usePublishedQuestions();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = questions ?? [];
    const term = search.trim();
    if (!term) return list;
    return list.filter(
      (q) =>
        q.question.includes(term) ||
        (q.answer ?? "").includes(term) ||
        (q.answered_by ?? "").includes(term) ||
        q.asker_name.includes(term)
    );
  }, [questions, search]);

  return (
    <section style={{ marginTop: "3rem" }} aria-label="שאלות שנענו">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: "1.35rem", color: colors.textDark, margin: 0 }}>
            שאלות שכבר נענו
          </h2>
          {(questions?.length ?? 0) > 0 && (
            <p style={{ fontFamily: fonts.body, fontSize: "0.8rem", color: colors.textMuted, margin: "0.3rem 0 0" }}>
              {questions!.length} תשובות מהרב, פתוחות לכולם
            </p>
          )}
        </div>

        {(questions?.length ?? 0) > 0 && (
          <div style={{ position: "relative", minWidth: 220, flex: "0 1 280px" }}>
            <Search
              size={15}
              aria-hidden
              style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: colors.textSubtle }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש בשאלות..."
              aria-label="חיפוש בשאלות שנענו"
              style={{ ...fieldInput, padding: "0.55rem 2.2rem 0.55rem 0.9rem", fontSize: "0.82rem", borderRadius: radii.pill }}
            />
          </div>
        )}
      </div>

      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
          <Loader2 size={28} style={{ color: colors.goldDark, animation: "spin 1s linear infinite" }} aria-label="טוען" />
        </div>
      )}

      {isError && !isLoading && (
        <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, textAlign: "center", padding: "2rem 0" }}>
          לא הצלחנו לטעון את השאלות כרגע. רעננו את הדף ונסו שוב.
        </p>
      )}

      {!isLoading && !isError && (questions?.length ?? 0) === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 1.5rem", background: "rgba(139,111,71,0.04)", borderRadius: radii.xl, border: "1px dashed rgba(139,111,71,0.2)" }}>
          <Sparkles size={32} style={{ color: colors.goldDark, opacity: 0.45, margin: "0 auto 0.75rem" }} aria-hidden />
          <p style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: "1rem", color: colors.textMuted, margin: "0 0 0.3rem" }}>
            התשובות הראשונות בדרך
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: "0.82rem", color: colors.textSubtle, margin: 0 }}>
            שאלו עכשיו, והתשובה שלכם תוכל להיות הראשונה שמתפרסמת כאן.
          </p>
        </div>
      )}

      {!isLoading && !isError && (questions?.length ?? 0) > 0 && filtered.length === 0 && (
        <p style={{ fontFamily: fonts.body, fontSize: "0.85rem", color: colors.textMuted, textAlign: "center", padding: "2rem 0" }}>
          לא נמצאו שאלות שמתאימות לחיפוש "{search.trim()}".
        </p>
      )}

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {filtered.map((q) => (
          <QAItem key={q.id} q={q} isOpen={openId === q.id} onToggle={() => setOpenId(openId === q.id ? null : q.id)} />
        ))}
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AskRabbiPage() {
  return (
    <DesignLayout sidebar={false}>
      <Seo
        title="שאל את הרב"
        description="שלחו שאלה בתנ״ך ובאמונה לרב יואב אוריאל, וקראו את התשובות לשאלות שכבר נענו."
        url="https://bneyzion.co.il/ask-rabbi"
      />

      {/* ── Hero ── */}
      <div dir="rtl" style={{ background: gradients.warmDark, padding: "2.75rem 1.5rem 4.5rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 40%, rgba(232,213,160,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <div style={{ fontFamily: fonts.body, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", color: colors.goldShimmer, marginBottom: "0.6rem" }}>
            בית המדרש בני ציון
          </div>
          <h1 style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "#fff", margin: 0, lineHeight: 1.15 }}>
            שאל את הרב
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: "0.92rem", color: "rgba(255,255,255,0.65)", margin: "0.75rem auto 0", maxWidth: 520, lineHeight: 1.7 }}>
            מקום לשאלות שעולות תוך כדי הלימוד. שלחו שאלה, הרב עונה, והתשובה מתפרסמת כאן לתועלת כל הלומדים.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div dir="rtl" style={{ maxWidth: 760, margin: "0 auto", padding: "0 1.25rem 3.5rem" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Form card overlapping the hero */}
        <div style={{ marginTop: "-2.75rem", position: "relative" }}>
          <QuestionForm />
        </div>

        <PublishedList />
      </div>
    </DesignLayout>
  );
}
