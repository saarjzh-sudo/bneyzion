import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, CheckCircle2, XCircle } from "lucide-react";

const QuizSection = () => {
  const [selected, setSelected] = useState<number | null>(null);
  const correctAnswer = 0;
  const options = ["פי החירות", "רעמסס", "סוכות", "אילים"];

  return (
    <section className="py-20">
      <div className="container max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 flex items-center justify-center mb-4 shadow-md shadow-primary/10">
            <Brain className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="text-2xl md:text-4xl font-heading gradient-sunset">
            בחן את עצמך
          </h2>
        </div>

        <div className="glass-spring rounded-2xl shadow-lg p-8">
          <p className="font-serif text-xl text-foreground mb-8 text-center font-bold leading-relaxed">
            מה שם המקום שבו חנו בני ישראל לפני קריעת ים סוף?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt, i) => {
              const isCorrect = selected === i && i === correctAnswer;
              const isWrong = selected === i && i !== correctAnswer;
              const isRevealedCorrect = selected !== null && i === correctAnswer;
              return (
                <motion.button
                  key={i}
                  whileHover={selected === null ? { scale: 1.02 } : {}}
                  whileTap={selected === null ? { scale: 0.98 } : {}}
                  className={`py-5 rounded-xl border text-sm font-display transition-all duration-300 flex items-center justify-center gap-2 ${
                    isCorrect
                      ? "border-primary bg-primary/10 text-primary"
                      : isWrong
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : isRevealedCorrect
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : selected !== null
                      ? "border-border/50 text-muted-foreground/40"
                      : "border-border/60 bg-white/60 text-foreground hover:border-accent/40 hover:bg-white/80 shadow-sm"
                  }`}
                  onClick={() => selected === null && setSelected(i)}
                  disabled={selected !== null}
                >
                  {isCorrect && <CheckCircle2 className="h-4 w-4" />}
                  {isWrong && <XCircle className="h-4 w-4" />}
                  {opt}
                </motion.button>
              );
            })}
          </div>
          {selected !== null && (
            <motion.p
              className="text-center mt-6 text-sm font-medium"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {selected === correctAnswer
                ? <span className="text-primary">נכון! פי החירות – שמות י"ד, ב'</span>
                : <span className="text-destructive">לא נכון. התשובה: פי החירות – שמות י"ד, ב'</span>}
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuizSection;
