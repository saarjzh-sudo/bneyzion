import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "model"; content: string };
type Stage = "onboarding" | "followup-learning" | "followup-teacher" | "chat";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:streamGenerateContent?key=${GEMINI_KEY}&alt=sse`;
const FIRST_VISIT_KEY = "bnz_first_visit";

const SYSTEM_PROMPT = `אתה הצ'אטבוט הרשמי של "בני ציון" – אתר התנ"ך של ישראל (bneyzion.vercel.app).

## תפקידך
נקודת הכניסה הדיגיטלית לאתר. אתה לא רק עונה על שאלות – אתה מנווט, ממליץ, ומוביל כל מבקר אל התוכן הנכון עבורו.

## 3 מטרות
1. ניווט מהיר – להוביל לתוכן רלוונטי בלי שיחפש לבד
2. זיהוי פרסונה – להבין מי עומד מולך בשאלה אחת בלבד
3. הנעה לפעולה – לחבר לקהילה, להציע תכנים, לעודד התחברות

## מה אתה לא עושה
- לא עוסק בנושאים מחוץ לתנ"ך / בני ציון
- לא ספאמי – מזכיר תכנים בתשלום רק בהקשר הנכון, לא בכל שיחה
- לא חוסם – כל הנעה לפעולה היא הצעה נקייה, לא לחץ
- לא ממציא – ממליץ רק על תכנים ולינקים שקיימים באתר

## כלל זהב
קודם כל עזור למצוא מה שהמשתמש צריך – אחר כך הצע עוד.

## 7 הפרסונות – זהה ותתאים תשובה:
• שי – דתל"ש: צעיר, עמוס, מסתובב במדיה → המלץ: שיעורים קצרים 15 דקות, podcast, סדרות קלות
• חגית – מבוגרת: יצאה לפנסיה, רקע בסיסי → המלץ: סדרות מבוא, קבוצת לימוד, תוכנית התחלתית
• רועי – בייניש: לומד גמרא, רוצה עומק → המלץ: סדרות מחקריות, ביאורים, מאמרים
• מורה חמ"ד / ממלכתי: מחפש חומרי שיעור → המלץ: מאגר שאלות, דפי עבודה, סדרות למורים
• רב / מרצה: צריך ידע עמוק מהיר → המלץ: מאמרים, סדרות מחקריות, הרחבות
• חרדי מתעניין: רוצה ללמוד, מחפש לגיטימציה → המלץ: סדרות בגישה מסורתית, ביאורים
• חילוני / מסורתי: חיבור זהותי, ללא רקע תורני → המלץ: דמויות, סיפורים, ערכים, "מה זה תנ"ך"

## תכנים לדחוף – ומתי:
• **סדרות שיעורים** (לינק: /series) – זה לב ההמלצה. תמיד ציין שם רב ונושא
• **פרשת השבוע** (לינק: /parasha) – למי שמחפש עקביות שבועית
• **כלים ועזרים** – מפות, חידונים, דפי עבודה – למורים ולומדים עצמאיים
• **חנות** (לינק: /store) – רק כשמחפש עומק: "אגב, יש גם ספרים..."
• **תוכניות בתשלום** – רק אחרי גילוי עניין אמיתי, הצע בצורה טבעית
• **קהילה** (לינק: /community) – בסוף שיחה: "רוצה להישאר מחובר?"
• **רבנים** (לינק: /rabbis) – כשמחפש לפי מרצה

## עקרונות כתיבה
• עברית ישירה וחברותית – לא "בוקר טוב, כיצד אוכל לסייע לך?"
• הודעות קצרות – נקודות ולא פסקאות ארוכות
• לא יותר מ-2 אמוג'י בהודעה אחת
• לא דוחף – הנעות לפעולה כהצעה, לא כחובה
• גבולות ברורים – לא עונה על נושאים שאינם תנ"ך / בני ציון`;

// Onboarding options
const ONBOARDING_OPTS = [
  { icon: "🔍", label: "לחפש שיעור / סדרה", msg: "אני מחפש שיעור או סדרה. עזור לי למצוא לפי ספר, נושא, או רב." },
  { icon: "📖", label: 'רוצה להתחיל ללמוד תנ"ך', next: "followup-learning" as Stage },
  { icon: "👨‍🏫", label: "אני מורה / מחנך", next: "followup-teacher" as Stage },
  { icon: "🤔", label: 'יש לי שאלה בתנ"ך', focusInput: true },
  { icon: "✨", label: "סתם גולש – מה יש פה?", msg: 'ספר לי בקצרה מה יש באתר בני ציון ומה אפשר לעשות פה.' },
] as const;

const LEARNING_OPTS = [
  { label: "מתחיל לגמרי", msg: 'רוצה להתחיל ללמוד תנ"ך. אני מתחיל לגמרי, בלי רקע קודם.' },
  { label: "יש לי רקע בסיסי", msg: 'רוצה ללמוד תנ"ך. יש לי רקע בסיסי.' },
  { label: 'לומד גמרא, רוצה עומק בתנ"ך', msg: 'אני לומד גמרא ורוצה להעמיק בתנ"ך ברמה מחקרית.' },
];

const TEACHER_OPTS = [
  { label: 'חמ"ד', msg: 'אני מורה לתנ"ך בחינוך ממלכתי דתי / חמ"ד. מחפש חומרי שיעור וכלים להוראה.' },
  { label: "ממלכתי דתי", msg: 'אני מורה לתנ"ך בממלכתי דתי. מחפש חומרי שיעור.' },
  { label: "ממלכתי", msg: 'אני מורה לתנ"ך בחינוך ממלכתי. מחפש כלים להוראה.' },
  { label: "רב / מרצה", msg: 'אני רב ומרצה. צריך תכנים עמוקים ומהירים להכנת שיעורים.' },
];

// ─────────────────────────────────────────────────────────────────────────────

const AIChatWidget = ({ context }: { context?: string }) => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("onboarding");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-open on first visit after 3 seconds
  useEffect(() => {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, "1");
      const t = setTimeout(() => setOpen(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);

  const streamFromGemini = useCallback(async (userText: string, existingMsgs: Msg[]) => {
    const userMsg: Msg = { role: "user", content: userText };
    const allMsgs = [...existingMsgs, userMsg];
    setMessages(allMsgs);
    setIsLoading(true);
    scrollToBottom();

    const systemText = context ? `${SYSTEM_PROMPT}\n\nהקשר נוכחי: ${context}` : SYSTEM_PROMPT;

    const contents = [
      { role: "user", parts: [{ text: `הוראות מערכת:\n${systemText}` }] },
      { role: "model", parts: [{ text: "הבנתי. אשמח לעזור." }] },
      ...allMsgs.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    ];

    try {
      const resp = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }),
      });

      if (!resp.ok || !resp.body) {
        setMessages((p) => [...p, { role: "model", content: "מצטערים, יש בעיה טכנית. נסה שוב 🙏" }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
              setMessages((p) => {
                const last = p[p.length - 1];
                if (last?.role === "model")
                  return p.map((m, i) => (i === p.length - 1 ? { ...m, content: accumulated } : m));
                return [...p, { role: "model", content: accumulated }];
              });
              scrollToBottom();
            }
          } catch { /* partial */ }
        }
      }
    } catch {
      setMessages((p) => [...p, { role: "model", content: "מצטערים, יש בעיה בחיבור 🙏" }]);
    }
    setIsLoading(false);
  }, [context]);

  const handleOnboarding = (opt: typeof ONBOARDING_OPTS[number]) => {
    if ("next" in opt && opt.next) {
      setStage(opt.next);
    } else if ("focusInput" in opt && opt.focusInput) {
      setStage("chat");
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if ("msg" in opt && opt.msg) {
      setStage("chat");
      streamFromGemini(opt.msg, []);
    }
  };

  const handleChoice = (msg: string) => {
    setStage("chat");
    streamFromGemini(msg, []);
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    if (stage !== "chat") setStage("chat");
    streamFromGemini(text, messages);
  }, [input, isLoading, stage, messages, streamFromGemini]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            onClick={() => setOpen(true)}
            className="fixed bottom-24 left-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl
              bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            aria-label="פתח עוזר לימוד"
          >
            <Sparkles className="h-5 w-5" />
            <span className="font-display text-sm hidden md:inline">שאל אותי</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-4 z-50 w-[370px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "540px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-l from-secondary/60 to-background shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-display text-sm font-medium">עוזר בני ציון</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-secondary transition-colors" aria-label="סגור">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" dir="rtl">

              {/* ── Onboarding ── */}
              {stage === "onboarding" && (
                <div className="space-y-3">
                  {/* Greeting bubble */}
                  <div className="flex justify-end">
                    <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm leading-relaxed max-w-[88%]">
                      שלום! 👋<br />
                      אני הבוט של בני ציון.<br />
                      מה מביא אותך לכאן?
                    </div>
                  </div>
                  {/* 5 option buttons */}
                  <div className="space-y-1.5 pt-1">
                    {ONBOARDING_OPTS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleOnboarding(opt)}
                        className="w-full text-right text-sm px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-secondary/60 hover:border-primary/30 transition-all flex items-center gap-2"
                      >
                        <span className="text-base">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Follow-up: Learning level ── */}
              {stage === "followup-learning" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[88%]">
                      📖 מה הרקע שלך בתנ"ך?
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {LEARNING_OPTS.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => handleChoice(o.msg)}
                        className="w-full text-right text-sm px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-secondary/60 hover:border-primary/30 transition-all"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Follow-up: Teacher framework ── */}
              {stage === "followup-teacher" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[88%]">
                      👨‍🏫 באיזה מסגרת אתה מלמד?
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {TEACHER_OPTS.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => handleChoice(o.msg)}
                        className="w-full text-right text-sm px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-secondary/60 hover:border-primary/30 transition-all"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Chat messages ── */}
              {stage === "chat" && messages.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  שאל כל שאלה בתנ"ך 👇
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    <span dangerouslySetInnerHTML={{ __html: msg.content
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>') }} />
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-end">
                  <div className="bg-secondary px-4 py-2.5 rounded-2xl rounded-bl-sm flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
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
                className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
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
