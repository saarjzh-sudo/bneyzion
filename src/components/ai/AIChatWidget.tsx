import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, BookOpen } from "lucide-react";

type Msg = { role: "user" | "model"; content: string };

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_KEY}&alt=sse`;

const SYSTEM_PROMPT = `אתה עוזר לימוד מומחה בתנ"ך, פרשנות יהודית מסורתית, פרשת השבוע ושיעורי תורה.
אתה שייך לאתר "בני ציון" — פלטפורמת לימוד תנ"ך מקוונת.
ענה תמיד בעברית. הסגנון שלך: חם, מלומד, מעמיק, ועם אהבת תורה.
תן תשובות ממוקדות ולא ארוכות מדי, אבל עם עומק תורני אמיתי.
אם שואלים על נושא שאינו קשור לתנ"ך, תורה או יהדות — הפנה בנחיסות בחזרה לנושאי הלימוד.`;

const SUGGESTED = [
  "מה המסר המרכזי של פרשת בראשית?",
  "מי כתב את ספר תהילים?",
  "מה ההבדל בין נביא לשופט?",
];

const AIChatWidget = ({ context }: { context?: string }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  const send = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    const systemText = context
      ? `${SYSTEM_PROMPT}\n\nהקשר נוכחי: ${context}`
      : SYSTEM_PROMPT;

    // Gemini v1 doesn't support system_instruction — inject as first exchange
    const contents = [
      { role: "user", parts: [{ text: `הוראות: ${systemText}` }] },
      { role: "model", parts: [{ text: "הבנתי. אשמח לעזור בכל שאלה בתנ״ך ובתורה." }] },
      ...allMsgs.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    ];

    try {
      const resp = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      });

      if (!resp.ok || !resp.body) {
        setMessages((prev) => [...prev, { role: "model", content: "שגיאה בחיבור לשירות AI" }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";

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
            const parsed = JSON.parse(json);
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              assistantSoFar += chunk;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "model") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "model", content: assistantSoFar }];
              });
              scrollToBottom();
            }
          } catch { /* partial chunk */ }
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "model", content: "שגיאה בחיבור לשירות AI" }]);
    }

    setIsLoading(false);
  }, [input, messages, isLoading, context]);

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        className={`fixed bottom-24 left-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl
          bg-primary text-primary-foreground shadow-lg hover:shadow-xl
          transition-all duration-300 hover:scale-105 ${open ? "hidden" : ""}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring" }}
        aria-label="פתח עוזר לימוד"
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-display text-sm hidden md:inline">שאל שאלה</span>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "520px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-l from-secondary/80 to-background">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="font-display text-sm text-foreground">עוזר לימוד תנ״ך</span>
                {context && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">· {context}</span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary transition-colors"
                aria-label="סגור"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-3"
              style={{ minHeight: "260px" }}
              dir="rtl"
            >
              {messages.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <Sparkles className="h-8 w-8 text-primary/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">שאל כל שאלה בתנ״ך ובתורה</p>
                  <div className="space-y-1.5">
                    {SUGGESTED.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="block w-full text-right text-xs px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-end">
                  <div className="bg-secondary px-4 py-2 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-center gap-2 p-3 border-t border-border"
              dir="rtl"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="שאל שאלה בתנ״ך..."
                className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                disabled={isLoading}
                autoFocus={false}
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
