import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, RotateCcw, RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Msg = {
  id: string;
  role: "user" | "model";
  content: string;
  chips?: string[];
  error?: boolean;
};
type Stage = "onboarding" | "followup-learning" | "followup-teacher" | "chat";

// ── Constants ─────────────────────────────────────────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:streamGenerateContent?key=${GEMINI_KEY}&alt=sse`;
const FIRST_VISIT_KEY = "bnz_first_visit";
const PERSONA_KEY = "bnz_persona";

const mkId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderMarkdown(raw: string): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  let inList = false;

  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /\[([^\]]+)\]\(((?:\/|https?:\/\/)[^)]+)\)/g,
        (_, label, href) => {
          const ext = href.startsWith("http");
          return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}
            class="text-primary font-semibold underline underline-offset-2 hover:opacity-75 transition-opacity"
          >${label}</a>`;
        }
      );

  for (const line of lines) {
    const bullet = line.match(/^[\*\-•] (.+)$/);
    if (bullet) {
      if (!inList) {
        out.push('<ul class="list-disc list-inside space-y-0.5 my-1.5 pr-1">');
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      const t = line.trim();
      if (t) out.push(`<p class="mb-0.5">${inline(t)}</p>`);
      else if (out.length) out.push("<br/>");
    }
  }
  if (inList) out.push("</ul>");

  // Remove trailing <br/>
  const joined = out.join("");
  return joined.endsWith("<br/>") ? joined.slice(0, -5) : joined;
}

// ── Chip parser ───────────────────────────────────────────────────────────────
function parseChips(text: string): { clean: string; chips: string[] } {
  const match = text.match(/\[CHIPS:\s*([^\]]+)\]/);
  if (!match) return { clean: text.trimEnd(), chips: [] };
  const chips = match[1]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return { clean: text.replace(match[0], "").trimEnd(), chips };
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `אתה הצ'אטבוט הרשמי של "בני ציון" – אתר התנ"ך של ישראל (bneyzion.vercel.app).

## תפקידך
נקודת הכניסה הדיגיטלית לאתר. אתה לא רק עונה על שאלות — אתה מנווט, ממליץ, ומוביל כל מבקר אל התוכן הנכון עבורו.

## 3 מטרות
1. ניווט מהיר — להוביל לתוכן רלוונטי בלי שיחפש לבד
2. זיהוי פרסונה — להבין מי עומד מולך בשאלה אחת בלבד
3. הנעה לפעולה — לחבר לקהילה, להציע תכנים, לעודד התחברות

## מה אתה לא עושה
- לא עוסק בנושאים מחוץ לתנ"ך / בני ציון
- לא ספאמי — מזכיר תכנים בתשלום רק בהקשר הנכון
- לא חוסם — כל הנעה לפעולה היא הצעה נקייה, לא לחץ
- לא ממציא — ממליץ רק על תכנים ולינקים שקיימים באתר

## כלל זהב
קודם כל עזור למצוא מה שהמשתמש צריך — אחר כך הצע עוד.

## 7 הפרסונות — זהה ותתאים:
• שי — דתל"ש: צעיר, עמוס → שיעורים קצרים 15 דקות, podcast, סדרות קלות
• חגית — מבוגרת, פנסיה, רקע בסיסי → סדרות מבוא, קבוצת לימוד
• רועי — לומד גמרא, רוצה עומק → סדרות מחקריות, ביאורים, מאמרים
• מורה חמ"ד / ממלכתי → מאגר שאלות, דפי עבודה, סדרות למורים
• רב / מרצה → מאמרים, סדרות מחקריות, הרחבות
• חרדי מתעניין → סדרות בגישה מסורתית, ביאורים
• חילוני / מסורתי → דמויות, סיפורים, ערכים, "מה זה תנ"ך"

## לינקים — תמיד בפורמט מרקדאון [כותרת](/path)
• [סדרות שיעורים](/series) — לב ההמלצה. ציין שם רב ונושא ספציפי
• [פרשת השבוע](/parasha) — למי שמחפש עקביות שבועית
• [רשימת רבנים](/rabbis) — כשמחפש לפי מרצה
• [קהילה](/community) — בסוף שיחה, "רוצה להישאר מחובר?"
• [חנות](/store) — רק כשמחפש עומק: "אגב, יש גם ספרים..."

## עקרונות כתיבה
• עברית ישירה וחברותית
• הודעות קצרות — נקודות ולא פסקאות
• לא יותר מ-2 אמוג'י בהודעה
• גבולות ברורים — לא עונה על נושאים שאינם תנ"ך / בני ציון

## חובה — פורמט בסוף כל תשובה
הוסף שורה אחת בסוף כל תשובה, בדיוק בפורמט הזה (אחת בלבד):
[CHIPS: שאלה קצרה 1|שאלה קצרה 2|שאלה קצרה 3]
השאלות: 3-6 מילים, ממשיכות את השיחה, מגוונות. הן לא יוצגו בגוף התשובה.`;

// ── Onboarding data ───────────────────────────────────────────────────────────
const ONBOARDING_OPTS = [
  {
    icon: "🔍",
    label: "לחפש שיעור / סדרה",
    persona: "searcher",
    msg: "אני מחפש שיעור או סדרה. עזור לי למצוא לפי ספר, נושא, או רב.",
  },
  {
    icon: "📖",
    label: 'רוצה להתחיל ללמוד תנ"ך',
    persona: "learner",
    next: "followup-learning" as Stage,
  },
  {
    icon: "👨‍🏫",
    label: "אני מורה / מחנך",
    persona: "teacher",
    next: "followup-teacher" as Stage,
  },
  {
    icon: "🤔",
    label: 'יש לי שאלה בתנ"ך',
    persona: "questioner",
    focusInput: true as const,
  },
  {
    icon: "✨",
    label: "סתם גולש – מה יש פה?",
    persona: "browser",
    msg: 'ספר לי בקצרה מה יש באתר בני ציון ומה אפשר לעשות פה.',
  },
] as const;

const LEARNING_OPTS = [
  {
    label: "מתחיל לגמרי",
    persona: "beginner",
    msg: 'רוצה להתחיל ללמוד תנ"ך. אני מתחיל לגמרי, בלי רקע קודם.',
  },
  {
    label: "יש לי רקע בסיסי",
    persona: "intermediate",
    msg: 'רוצה ללמוד תנ"ך. יש לי רקע בסיסי.',
  },
  {
    label: 'לומד גמרא, רוצה עומק בתנ"ך',
    persona: "advanced",
    msg: 'אני לומד גמרא ורוצה להעמיק בתנ"ך ברמה מחקרית.',
  },
];

const TEACHER_OPTS = [
  {
    label: 'חמ"ד',
    persona: "teacher",
    msg: 'אני מורה לתנ"ך בחמ"ד. מחפש חומרי שיעור וכלים להוראה.',
  },
  {
    label: "ממלכתי דתי",
    persona: "teacher",
    msg: 'אני מורה לתנ"ך בממלכתי דתי. מחפש חומרי שיעור.',
  },
  {
    label: "ממלכתי",
    persona: "teacher",
    msg: 'אני מורה לתנ"ך בחינוך ממלכתי. מחפש כלים להוראה.',
  },
  {
    label: "רב / מרצה",
    persona: "rabbi",
    msg: 'אני רב ומרצה. צריך תכנים עמוקים ומהירים להכנת שיעורים.',
  },
];

const PERSONA_GREETINGS: Record<string, string> = {
  searcher: "ברוך שובך! 🔍 רוצה שנמשיך לחפש שיעורים?",
  learner: "ברוך שובך! 📖 רוצה להמשיך במסלול הלימוד שלך?",
  beginner: 'ברוך שובך! 📖 נמשיך לגלות תנ"ך?',
  intermediate: "ברוך שובך! ממשיכים ללמוד?",
  advanced: "ברוך שובך! 🎓 רוצה שיעורים מחקריים נוספים?",
  teacher: "ברוך שובך! 👨‍🏫 עוד חומרי הוראה?",
  rabbi: "ברוך שובך! 📚 מה תרצה להעמיק היום?",
  questioner: 'ברוך שובך! 🤔 עוד שאלות בתנ"ך?',
  browser: "ברוך שובך! ✨ מה תרצה לגלות היום?",
};

// ── Component ──────────────────────────────────────────────────────────────────
const AIChatWidget = ({ context }: { context?: string }) => {
  // Detect return visit + saved persona
  const savedPersonaRaw = localStorage.getItem(PERSONA_KEY);
  const savedPersona = savedPersonaRaw ? (() => { try { return JSON.parse(savedPersonaRaw) as { type: string }; } catch { return null; } })() : null;
  const isReturn = !!localStorage.getItem(FIRST_VISIT_KEY) && !!savedPersona;

  const initialMessages: Msg[] = isReturn && savedPersona
    ? [{ id: mkId(), role: "model", content: PERSONA_GREETINGS[savedPersona.type] ?? "ברוך שובך! 👋" }]
    : [];

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [stage, setStage] = useState<Stage>(isReturn ? "chat" : "onboarding");
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failedPayload, setFailedPayload] = useState<{ text: string; prior: Msg[] } | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  // Mobile resize
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Auto-open first visit after 3s
  useEffect(() => {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, "1");
      const t = setTimeout(() => setOpen(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // Clear unread badge when opened
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const scrollToBottom = () =>
    setTimeout(
      () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      50
    );

  const savePersona = (type: string) =>
    localStorage.setItem(PERSONA_KEY, JSON.stringify({ type }));

  const resetToMenu = () => {
    setStage("onboarding");
    setMessages([]);
    setFailedPayload(null);
  };

  // ── Gemini streaming ────────────────────────────────────────────────────────
  const streamFromGemini = useCallback(
    async (userText: string, priorMsgs: Msg[]) => {
      const userMsg: Msg = { id: mkId(), role: "user", content: userText };
      const allMsgs = [...priorMsgs, userMsg];
      setMessages(allMsgs);
      setIsLoading(true);
      setFailedPayload(null);
      scrollToBottom();

      const systemText = context ? `${SYSTEM_PROMPT}\n\nהקשר נוכחי: ${context}` : SYSTEM_PROMPT;
      const contents = [
        { role: "user", parts: [{ text: `הוראות מערכת:\n${systemText}` }] },
        { role: "model", parts: [{ text: "הבנתי. אשמח לעזור." }] },
        // Strip chips/error fields before sending history
        ...allMsgs.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
      ];

      try {
        const resp = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.75, maxOutputTokens: 2048 },
          }),
        });

        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        const botId = mkId();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const chunk = JSON.parse(json).candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunk) {
                accumulated += chunk;
                const { clean, chips } = parseChips(accumulated);
                setMessages((p) => {
                  const last = p[p.length - 1];
                  if (last?.role === "model" && last.id === botId)
                    return p.map((m) => (m.id === botId ? { ...m, content: clean, chips } : m));
                  return [...p, { id: botId, role: "model", content: clean, chips }];
                });
                scrollToBottom();
              }
            } catch { /* partial JSON */ }
          }
        }

        if (!openRef.current) setUnread((n) => n + 1);
      } catch {
        setFailedPayload({ text: userText, prior: priorMsgs });
        setMessages((p) => [
          ...p,
          { id: mkId(), role: "model", content: "אופס, יש בעיה בחיבור 🙏", error: true },
        ]);
      }
      setIsLoading(false);
    },
    [context]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleOnboarding = (opt: (typeof ONBOARDING_OPTS)[number]) => {
    savePersona(opt.persona);
    if ("next" in opt && opt.next) {
      setStage(opt.next);
    } else if ("focusInput" in opt && opt.focusInput) {
      setStage("chat");
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if ("msg" in opt) {
      setStage("chat");
      streamFromGemini(opt.msg, []);
    }
  };

  const handleChoice = (msg: string, persona: string) => {
    savePersona(persona);
    setStage("chat");
    streamFromGemini(msg, []);
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    if (stage !== "chat") setStage("chat");
    streamFromGemini(text, messages.filter((m) => !m.error));
  }, [input, isLoading, stage, messages, streamFromGemini]);

  const handleChip = (chip: string) =>
    streamFromGemini(chip, messages.filter((m) => !m.error));

  const handleRetry = () => {
    if (!failedPayload) return;
    setMessages((p) => p.filter((m) => !m.error));
    streamFromGemini(failedPayload.text, failedPayload.prior);
  };

  // Close widget when clicking an internal link inside chat
  const handleBodyClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[href^='/']");
    if (a) setTimeout(() => setOpen(false), 80);
  };

  // ── Panel positioning ───────────────────────────────────────────────────────
  const panelBase = "z-50 bg-card flex flex-col overflow-hidden";
  const panelPositioned = isMobile
    ? `fixed inset-0 ${panelBase}`
    : `fixed bottom-24 left-4 w-[370px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border shadow-2xl ${panelBase}`;
  const panelStyle = isMobile ? {} : { maxHeight: "560px" };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating button ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            onClick={() => setOpen(true)}
            className="fixed bottom-24 left-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl
              bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all
              duration-300 hover:scale-105 relative"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            aria-label="פתח עוזר לימוד"
          >
            <Sparkles className="h-5 w-5" />
            <span className="font-display text-sm hidden md:inline">שאל אותי</span>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500
                  text-white text-[10px] font-bold flex items-center justify-center"
              >
                {unread}
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: isMobile ? 0 : 20, scale: isMobile ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? 0 : 20, scale: isMobile ? 1 : 0.95 }}
            className={panelPositioned}
            style={panelStyle}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-l from-secondary/60 to-background shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-display text-sm font-medium">עוזר בני ציון</span>
              </div>
              <div className="flex items-center gap-1">
                {stage !== "onboarding" && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={resetToMenu}
                    title="חזור לתפריט הראשי"
                    aria-label="חזור לתפריט"
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </motion.button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  aria-label="סגור"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-3"
              dir="rtl"
              onClick={handleBodyClick}
            >
              {/* ── Onboarding ───────────────────────────────────────────────── */}
              {stage === "onboarding" && (
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm leading-relaxed max-w-[88%]">
                      שלום! 👋<br />
                      אני הבוט של בני ציון.<br />
                      מה מביא אותך לכאן?
                    </div>
                  </motion.div>
                  <div className="space-y-1.5 pt-1">
                    {ONBOARDING_OPTS.map((opt, i) => (
                      <motion.button
                        key={opt.label}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                        onClick={() => handleOnboarding(opt)}
                        className="w-full text-right text-sm px-3 py-2.5 rounded-xl border border-border
                          bg-background hover:bg-secondary/60 hover:border-primary/30
                          transition-all flex items-center gap-2"
                      >
                        <span className="text-base">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Follow-up: Learning level ─────────────────────────────────── */}
              {stage === "followup-learning" && (
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[88%]">
                      📖 מה הרקע שלך בתנ"ך?
                    </div>
                  </motion.div>
                  <div className="space-y-1.5">
                    {LEARNING_OPTS.map((o, i) => (
                      <motion.button
                        key={o.label}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.06 }}
                        onClick={() => handleChoice(o.msg, o.persona)}
                        className="w-full text-right text-sm px-3 py-2.5 rounded-xl border border-border
                          bg-background hover:bg-secondary/60 hover:border-primary/30 transition-all"
                      >
                        {o.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Follow-up: Teacher framework ──────────────────────────────── */}
              {stage === "followup-teacher" && (
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[88%]">
                      👨‍🏫 באיזה מסגרת אתה מלמד?
                    </div>
                  </motion.div>
                  <div className="space-y-1.5">
                    {TEACHER_OPTS.map((o, i) => (
                      <motion.button
                        key={o.label}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.06 }}
                        onClick={() => handleChoice(o.msg, o.persona)}
                        className="w-full text-right text-sm px-3 py-2.5 rounded-xl border border-border
                          bg-background hover:bg-secondary/60 hover:border-primary/30 transition-all"
                      >
                        {o.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Chat: empty state ─────────────────────────────────────────── */}
              {stage === "chat" && messages.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  שאל כל שאלה בתנ"ך 👇
                </div>
              )}

              {/* ── Messages ─────────────────────────────────────────────────── */}
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => {
                  const isLast = i === messages.length - 1;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {/* Bubble */}
                      <div className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : msg.error
                              ? "bg-destructive/10 text-destructive rounded-bl-sm border border-destructive/20"
                              : "bg-secondary text-foreground rounded-bl-sm"
                          }`}
                        >
                          {msg.role === "model" ? (
                            <span
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                            />
                          ) : (
                            msg.content
                          )}
                          {/* Retry button on error */}
                          {msg.error && failedPayload && (
                            <button
                              onClick={handleRetry}
                              className="mt-2 flex items-center gap-1.5 text-xs text-destructive hover:opacity-75 transition-opacity"
                            >
                              <RefreshCw className="h-3 w-3" />
                              נסה שוב
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Follow-up chips — only on last bot message, after loading done */}
                      {msg.role === "model" &&
                        !msg.error &&
                        isLast &&
                        !isLoading &&
                        msg.chips &&
                        msg.chips.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="flex flex-wrap gap-1.5 justify-end"
                          >
                            {msg.chips.map((chip) => (
                              <button
                                key={chip}
                                onClick={() => handleChip(chip)}
                                className="text-xs px-2.5 py-1 rounded-full border border-primary/25
                                  text-primary bg-primary/5 hover:bg-primary/15 transition-colors"
                              >
                                {chip}
                              </button>
                            ))}
                          </motion.div>
                        )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Loading dots */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-end"
                >
                  <div className="bg-secondary px-4 py-2.5 rounded-2xl rounded-bl-sm flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2 p-3 border-t border-border shrink-0"
              dir="rtl"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={stage === "chat" ? "כתוב שאלה..." : "או כתוב כל שאלה..."}
                className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm outline-none
                  focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40
                  hover:bg-primary/90 transition-colors"
                aria-label="שלח"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
