import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileQuestion, Puzzle, Sparkles, Loader2, Copy, Check, Download, Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";
import ReactMarkdown from "react-markdown";

const TOOLS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-tools`;

type Tool = "lesson-plan" | "quiz" | "word-search";

const toolConfig: Record<Tool, { icon: typeof BookOpen; label: string; description: string; placeholder: string; color: string }> = {
  "lesson-plan": {
    icon: BookOpen,
    label: "צור מערך שיעור",
    description: "מטרות, פתיחה, גוף, סיכום ומשימות",
    placeholder: "למשל: פרשת בראשית, סיפור יוסף ואחיו...",
    color: "from-primary/20 to-accent/10",
  },
  "quiz": {
    icon: FileQuestion,
    label: "צור מבחן",
    description: "שאלות רבות-ברירה ופתוחות עם תשובות",
    placeholder: "למשל: ספר שמות פרקים א-ה...",
    color: "from-accent/20 to-primary/10",
  },
  "word-search": {
    icon: Puzzle,
    label: "צור תפזורת",
    description: "רשימת מילים עם הגדרות ותפזורת",
    placeholder: "למשל: מושגים מספר בראשית...",
    color: "from-secondary/40 to-primary/10",
  },
};

const levels = ["כיתה א-ג", "כיתה ד-ו", "חטיבת ביניים", "תיכון", "מבוגרים"];

const demoResults: Record<Tool, string> = {
  "lesson-plan": `## מערך שיעור לדוגמה — פרשת בראשית\n\n### מטרות\n- הכרת סיפור הבריאה\n- הבנת סדר ימי הבריאה\n\n### פתיחה (5 דק׳)\nשאלה: "מה הדבר הראשון שהייתם בוראים?"\n\n### גוף השיעור (25 דק׳)\n1. קריאה משותפת של פרק א׳\n2. מילוי טבלת ימי הבריאה\n\n### סיכום (5 דק׳)\nכל תלמיד משתף את היום האהוב עליו\n\n*התחברו כדי ליצור מערכי שיעור מותאמים אישית!*`,
  "quiz": `## מבחן לדוגמה — ספר בראשית\n\n**שאלה 1:** מי היה הבן הבכור של אדם וחווה?\n- א. הבל\n- ב. **קין** ✓\n- ג. שת\n\n**שאלה 2:** כמה ימים ארכה הבריאה?\n- א. 5 ימים\n- ב. **6 ימים** ✓\n- ג. 7 ימים\n\n*התחברו כדי ליצור מבחנים מותאמים!*`,
  "word-search": `## תפזורת לדוגמה — מושגי בראשית\n\n| מילה | הגדרה |\n|------|--------|\n| בראשית | המילה הפותחת את התורה |\n| אדם | האדם הראשון |\n| גן עדן | מקום מגורי האדם הראשון |\n| נחש | הפיתה את חווה |\n\n*התחברו כדי ליצור תפזורות מותאמות!*`,
};

const AITeacherTools = () => {
  const { user, signInWithGoogle } = useAuth();
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("כיתה ד-ו");
  const [questionCount, setQuestionCount] = useState("10");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(async () => {
    if (!activeTool || !topic.trim() || isLoading) return;
    setIsLoading(true);
    setResult("");

    try {
      const resp = await fetch(TOOLS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          tool: activeTool,
          topic: topic.trim(),
          level,
          questionCount: activeTool === "quiz" ? parseInt(questionCount) : undefined,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "שגיאה" }));
        setResult(err.error || "שגיאה בשירות");
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
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResult(accumulated);
            }
          } catch { /* partial */ }
        }
      }
    } catch {
      setResult("שגיאה בחיבור");
    }
    setIsLoading(false);
  }, [activeTool, topic, level, questionCount, isLoading]);

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printResult = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !resultRef.current) return;
    const content = resultRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8" />
        <title>${toolConfig[activeTool!]?.label || "תוכן"} — בני ציון</title>
        <style>
          body { font-family: 'David', 'Times New Roman', serif; padding: 40px; line-height: 1.8; color: #1a1a1a; max-width: 700px; margin: 0 auto; }
          h1, h2, h3 { font-family: 'David', serif; color: #5c3d2e; }
          h1 { font-size: 24px; border-bottom: 2px solid #c9a96e; padding-bottom: 8px; }
          h2 { font-size: 20px; margin-top: 24px; }
          h3 { font-size: 17px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: right; }
          th { background: #f5f0e8; }
          ul, ol { padding-right: 24px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Non-authenticated: show demo preview with CTA
  if (!user) {
    return (
      <div className="space-y-8" dir="rtl">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-display">
            <Sparkles className="h-4 w-4" />
            כלי AI למורים
          </div>
          <h3 className="text-2xl font-heading text-foreground">צרו תוכן לימודי בלחיצה</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            מערכי שיעור, מבחנים ותפזורות — הכל מותאם לנושא ולרמת הגיל. התחברו כדי להתחיל!
          </p>
        </div>

        {/* Tool cards preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {(Object.entries(toolConfig) as [Tool, typeof toolConfig["lesson-plan"]][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <motion.button
                key={key}
                whileHover={{ y: -4 }}
                onClick={() => setActiveTool(key)}
                className={`relative p-5 rounded-2xl bg-gradient-to-br ${cfg.color} border border-border/60 text-center transition-all hover:shadow-md group`}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-heading text-foreground mb-1">{cfg.label}</p>
                <p className="text-xs text-muted-foreground">{cfg.description}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Demo result */}
        <AnimatePresence>
          {activeTool && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 max-h-[300px] overflow-y-auto">
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-transparent pointer-events-none" />
                <div className="prose prose-sm max-w-none text-foreground/70 [&_h2]:text-base [&_h2]:font-heading [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_em]:text-primary/60">
                  <ReactMarkdown>{demoResults[activeTool]}</ReactMarkdown>
                </div>
                {/* Blur overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card via-card/90 to-transparent flex items-end justify-center pb-3">
                  <span className="text-xs text-muted-foreground">תצוגה מקדימה — התחברו ליצירת תוכן מלא</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SmartAuthCTA variant="general" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-heading text-foreground">כלי AI למורים</h3>
          <p className="text-xs text-muted-foreground">בחרו כלי, הקלידו נושא — וקבלו תוכן מוכן</p>
        </div>
      </div>

      {/* Tool selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.entries(toolConfig) as [Tool, typeof toolConfig["lesson-plan"]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isActive = activeTool === key;
          return (
            <motion.button
              key={key}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setActiveTool(key); setResult(""); }}
              className={`relative p-4 rounded-2xl border transition-all text-center ${
                isActive
                  ? "border-primary bg-gradient-to-br " + cfg.color + " shadow-sm"
                  : "border-border/60 bg-card/50 hover:border-primary/30"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors ${
                isActive ? "bg-primary/20" : "bg-secondary/60"
              }`}>
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-sm font-heading mb-0.5 ${isActive ? "text-primary" : "text-foreground"}`}>{cfg.label}</p>
              <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Input area */}
      <AnimatePresence>
        {activeTool && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="bg-card/60 border border-border/60 rounded-2xl p-4 space-y-3">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={toolConfig[activeTool].placeholder}
                className="w-full bg-secondary/40 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                onKeyDown={(e) => e.key === "Enter" && generate()}
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="bg-secondary/40 border border-border/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {levels.map((l) => <option key={l}>{l}</option>)}
                </select>

                {activeTool === "quiz" && (
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="bg-secondary/40 border border-border/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="5">5 שאלות</option>
                    <option value="10">10 שאלות</option>
                    <option value="15">15 שאלות</option>
                    <option value="20">20 שאלות</option>
                  </select>
                )}

                <button
                  onClick={generate}
                  disabled={!topic.trim() || isLoading}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display hover:bg-primary/90 disabled:opacity-50 transition-all hover:shadow-md"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isLoading ? "מייצר..." : "צור תוכן"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Action bar */}
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "הועתק!" : "העתק"}
            </button>
            <button
              onClick={printResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              הדפס / PDF
            </button>
          </div>

          {/* Content */}
          <div
            ref={resultRef}
            className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl p-5 md:p-6 max-h-[500px] overflow-y-auto scroll-smooth"
          >
            <div className="prose prose-sm max-w-none text-foreground [&_h1]:text-xl [&_h1]:font-heading [&_h1]:text-primary [&_h2]:text-base [&_h2]:font-heading [&_h2]:mt-6 [&_h3]:text-sm [&_h3]:font-heading [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_li]:text-muted-foreground [&_table]:text-sm [&_th]:bg-secondary/40 [&_th]:font-heading [&_td]:border-border/40 [&_th]:border-border/40 [&_strong]:text-foreground">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AITeacherTools;
