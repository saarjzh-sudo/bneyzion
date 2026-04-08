import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Play, Loader2, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BatchResult {
  parasha: string;
  articles: number;
  errors: string[];
}

interface ImportResponse {
  success: boolean;
  processed: number;
  totalParashaPages: number;
  startIndex: number;
  nextIndex: number | null;
  totalArticles: number;
  totalErrors: number;
  results: BatchResult[];
}

const ParashaImportButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    results: BatchResult[];
    totalArticles: number;
    totalErrors: number;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const runImport = useCallback(async () => {
    setIsRunning(true);
    setProgress(null);
    const allResults: BatchResult[] = [];
    let totalArticles = 0;
    let totalErrors = 0;
    let startIndex = 0;
    const batchSize = 5;
    let totalPages = 60; // will be updated from first response

    try {
      while (startIndex < totalPages) {
        const { data, error } = await supabase.functions.invoke("import-parasha-articles", {
          body: { startIndex, batchSize },
        });

        if (error) throw new Error(error.message);
        
        const response = data as ImportResponse;
        if (!response.success) throw new Error("Import failed");

        totalPages = response.totalParashaPages || totalPages;
        allResults.push(...response.results);
        totalArticles += response.totalArticles;
        totalErrors += response.totalErrors;

        setProgress({
          current: Math.min(startIndex + batchSize, totalPages),
          total: totalPages,
          results: [...allResults],
          totalArticles,
          totalErrors,
        });

        if (response.nextIndex === null) break;
        startIndex = response.nextIndex;

        // Small delay between batches
        await new Promise((r) => setTimeout(r, 500));
      }

      toast({
        title: `✅ הייבוא הושלם`,
        description: `${totalArticles} מאמרים יובאו מ-${allResults.length} פרשיות. ${totalErrors} שגיאות.`,
      });
    } catch (err: any) {
      toast({
        title: "שגיאה בייבוא",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="glass-card-light rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-foreground">ייבוא מאמרי פרשת השבוע</h3>
          <p className="text-xs text-muted-foreground">
            מייבא ~270 מאמרים מ-54 דפי פרשה (הפרשה במבט רחב, סימן לבנים, מידות בפרשה, מבט על ההפטרה)
          </p>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: isRunning ? 1 : 1.02 }}
        whileTap={{ scale: isRunning ? 1 : 0.98 }}
        onClick={runImport}
        disabled={isRunning}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-display text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            מייבא... {pct}%
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            התחל ייבוא פרשות
          </>
        )}
      </motion.button>

      {/* Progress bar */}
      {progress && (
        <div className="space-y-3">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.current}/{progress.total} פרשיות</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-primary" />
                {progress.totalArticles} מאמרים
              </span>
              {progress.totalErrors > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  {progress.totalErrors} שגיאות
                </span>
              )}
            </span>
          </div>

          {/* Expandable details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? "rotate-180" : ""}`} />
            פירוט
          </button>

          {showDetails && (
            <div className="max-h-60 overflow-y-auto space-y-1 text-xs">
              {progress.results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    r.errors.length > 0 ? "bg-destructive/5" : "bg-primary/5"
                  }`}
                >
                  <span className="text-foreground">{r.parasha}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{r.articles} מאמרים</span>
                    {r.errors.length > 0 && (
                      <span className="text-destructive" title={r.errors.join(", ")}>
                        {r.errors.length} שגיאות
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParashaImportButton;
