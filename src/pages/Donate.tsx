import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, Gift, BookOpen, Sparkles, Users, Flame, Clock, Crown, Award, Trophy, Gem } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRecentDonations, useCreateDonation } from "@/hooks/useDonations";
import { useAuth } from "@/contexts/AuthContext";

// ─── Fake donation toasts ───
const fakeNames = [
  "משפחת כהן", "אברהם י.", "שרה ל.", "דוד מ.", "רחל ב.", "יוסף ש.",
  "מרים ע.", "משה ד.", "חנה ר.", "אליהו פ.", "נעמי ח.", "יעקב ת.",
  "משפחת לוי", "משפחת ישראלי", "אנונימי",
];
const fakeAmounts = [18, 36, 52, 100, 180, 260, 360, 520, 1800];

const useFakeDonationToasts = () => {
  const { toast } = useToast();
  useEffect(() => {
    const show = () => {
      const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
      const amount = fakeAmounts[Math.floor(Math.random() * fakeAmounts.length)];
      toast({ title: `${name} תרמ/ה ₪${amount}`, description: "תודה רבה על התמיכה!", duration: 4000 });
    };
    const t = setTimeout(show, 4000 + Math.random() * 4000);
    const i = setInterval(show, 12000 + Math.random() * 10000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, []);
};

const presetAmounts = [
  { value: 36, label: "ל״ו", subtitle: "חי כפול", Icon: Heart },
  { value: 72, label: "ע״ב", subtitle: "שם קדוש", Icon: Star },
  { value: 180, label: "חי×10", subtitle: "סגולה", Icon: Sparkles },
  { value: 520, label: "חודשי", subtitle: "הנצחה", Icon: Award },
  { value: 1800, label: "חי×100", subtitle: "מייסד", Icon: Crown },
];

const donationReasons = [
  { icon: BookOpen, text: "הנגשת אלפי שיעורי תנ״ך בחינם" },
  { icon: Users, text: "תמיכה בעשרות מרצים ורבנים" },
  { icon: Gift, text: "פיתוח תכנים חדשים ומרתקים" },
  { icon: Sparkles, text: "שדרוג הפלטפורמה הדיגיטלית" },
];

const typeLabels: Record<string, string> = {
  iluy_neshama: "לעילוי נשמת",
  refua: "לרפואת",
  regular: "",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "לפני דקות";
  if (hours < 24) return `לפני ${hours} שעות`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
}

const Donate = () => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(180);
  const [customAmount, setCustomAmount] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const [dedicationName, setDedicationName] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donationType, setDonationType] = useState<"regular" | "iluy_neshama" | "refua">("regular");
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: recentDonations } = useRecentDonations();
  const createDonation = useCreateDonation();

  useFakeDonationToasts();

  const finalAmount = selectedAmount ?? (customAmount ? parseInt(customAmount) : 0);

  const handleDonate = useCallback(() => {
    if (!finalAmount || finalAmount < 1) {
      toast({ title: "נא לבחור סכום תרומה", variant: "destructive" });
      return;
    }

    createDonation.mutate(
      {
        amount: finalAmount,
        is_monthly: isMonthly,
        dedication_type: donationType,
        dedication_name: dedicationName || undefined,
        donor_name: donorName || undefined,
        donor_email: donorEmail || undefined,
        user_id: user?.id,
      },
      {
        onSuccess: () => {
          toast({
            title: "התרומה נרשמה!",
            description: "מערכת התשלומים בהקמה. נציג ייצור איתך קשר להשלמת התשלום.",
          });
        },
        onError: (err: any) => toast({ title: "שגיאה", description: err.message, variant: "destructive" }),
      }
    );
  }, [finalAmount, isMonthly, donationType, dedicationName, donorName, donorEmail, user]);

  return (
    <Layout>
      {/* Hero - Memorial theme for Saadia z"l */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-primary/5 to-background" />
        <div className="absolute inset-0 noise-overlay opacity-20" />

        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [-10, 10, -10], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}

        <div className="container relative z-10 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-primary/10 flex items-center justify-center"
          >
            <Flame className="h-10 w-10 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl font-heading gradient-warm mb-4"
          >
            תרומה לזכר סעדיה ז״ל
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-muted-foreground font-serif leading-relaxed max-w-xl mx-auto"
          >
            לזכרו ולעילוי נשמתו של סעדיה נחמני ז״ל
            <br />
            כל תרומה מקרבת עוד יהודי ללימוד התנ״ך ומנציחה את זכרו.
          </motion.p>
        </div>
      </section>

      {/* Main donation form */}
      <section className="py-16 section-gradient-warm">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Left: Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-3 space-y-6"
            >
              {/* Monthly toggle */}
              <div className="glass-card-light rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Star className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-display text-foreground">סוג תרומה</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[false, true].map((monthly) => (
                    <button
                      key={String(monthly)}
                      onClick={() => setIsMonthly(monthly)}
                      className={`py-3 px-4 rounded-xl font-display text-sm transition-all border ${
                        isMonthly === monthly
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-card text-foreground border-border hover:border-primary/30"
                      }`}
                    >
                      {monthly ? "חודשית קבועה" : "חד-פעמית"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount selection */}
              <div className="glass-card-light rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Gift className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-display text-foreground">בחרו סכום</h2>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                  {presetAmounts.map((preset) => (
                    <motion.button
                      key={preset.value}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setSelectedAmount(preset.value); setCustomAmount(""); }}
                      className={`relative py-4 px-2 rounded-xl font-display text-center transition-all border ${
                        selectedAmount === preset.value
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                          : "bg-card text-foreground border-border hover:border-primary/30 hover:shadow-md"
                      }`}
                    >
                      <preset.Icon className="h-5 w-5 block mb-0.5 mx-auto" />
                      <span className="text-lg font-heading block">₪{preset.value.toLocaleString()}</span>
                      <span className="text-[10px] opacity-75 block">{preset.subtitle}</span>
                    </motion.button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="סכום אחר..."
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                    className="w-full py-3 px-4 bg-card border border-border rounded-xl text-foreground font-display text-center placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₪</span>
                </div>
              </div>

              {/* Dedication */}
              <div className="glass-card-light rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-display text-foreground">הקדשה (רשות)</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {([
                    { value: "regular" as const, label: "תרומה רגילה" },
                    { value: "iluy_neshama" as const, label: "לעילוי נשמת" },
                    { value: "refua" as const, label: "לרפואת" },
                  ]).map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setDonationType(type.value)}
                      className={`py-2 px-3 rounded-lg text-xs font-display transition-all border ${
                        donationType === type.value
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-card text-muted-foreground border-border hover:border-primary/20"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {donationType !== "regular" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <Input
                        placeholder={donationType === "iluy_neshama" ? "שם הנפטר/ת..." : "שם החולה..."}
                        value={dedicationName}
                        onChange={(e) => setDedicationName(e.target.value)}
                        className="font-serif"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Donor details */}
              <div className="glass-card-light rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-display text-foreground">פרטי התורם (רשות)</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>שם</Label>
                    <Input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="שמך..." className="mt-1" />
                  </div>
                  <div>
                    <Label>אימייל</Label>
                    <Input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} placeholder="email@..." dir="ltr" className="mt-1" />
                  </div>
                </div>
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDonate}
                disabled={!finalAmount || createDonation.isPending}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-display text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <Heart className="h-5 w-5" />
                {createDonation.isPending
                  ? "שולח..."
                  : finalAmount > 0
                  ? `תרמו ₪${finalAmount.toLocaleString()}${isMonthly ? " בחודש" : ""}`
                  : "בחרו סכום לתרומה"}
              </motion.button>

              <p className="text-center text-xs text-muted-foreground">
                סליקה מאובטחת בקרוב — נציג ייצור קשר להשלמת התשלום
                <br />
                תרומות מעל ₪100 מזכות באישור לפי סעיף 46
              </p>
            </motion.div>

            {/* Right: Info sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Why donate */}
              <div className="glass-card-gold rounded-2xl p-6">
                <h3 className="text-lg font-heading gradient-warm mb-4">למה לתרום?</h3>
                <div className="space-y-4">
                  {donationReasons.map((reason, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <reason.icon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm text-foreground/80 font-serif leading-relaxed pt-1">{reason.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Impact counter */}
              <div className="glass-card-light rounded-2xl p-6 text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-4xl font-heading gradient-warm mb-2"
                >
                  {finalAmount > 0 ? `₪${finalAmount.toLocaleString()}` : "—"}
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  {finalAmount >= 1800 ? "תורם/ת מייסד/ת!" : finalAmount >= 520 ? "תורם/ת זהב!" : finalAmount >= 180 ? "תורם/ת כסף!" : finalAmount >= 72 ? "תרומה נדיבה!" : finalAmount > 0 ? "תודה על כל שקל!" : "בחרו סכום"}
                </p>
                {isMonthly && finalAmount > 0 && (
                  <p className="text-xs text-primary mt-2 font-display">₪{(finalAmount * 12).toLocaleString()} בשנה</p>
                )}
              </div>

              {/* Recent donors from DB */}
              {recentDonations && recentDonations.length > 0 && (
                <div className="glass-card-light rounded-2xl p-6">
                  <h3 className="text-sm font-heading text-foreground mb-3">תורמים אחרונים</h3>
                  <div className="space-y-3">
                    {recentDonations.slice(0, 5).map((d) => (
                      <div key={d.id} className="flex items-start gap-2 text-sm">
                        <Heart className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-display text-foreground">{d.donor_name || "אנונימי"}</span>
                          <span className="text-muted-foreground"> תרמ/ה </span>
                          <span className="font-heading text-primary">₪{Number(d.amount).toLocaleString()}</span>
                          {d.dedication_name && (
                            <span className="text-muted-foreground text-xs block">
                              {typeLabels[d.dedication_type]} {d.dedication_name}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(d.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quote */}
              <div className="glass-card-light rounded-2xl p-6">
                <p className="text-sm font-serif text-foreground/70 leading-[2] text-center">
                  ״כל המחזיק בתורה – כאילו הקריב כל הקרבנות כולם״
                </p>
                <p className="text-[10px] text-muted-foreground text-center mt-2 font-display">(ויקרא רבה)</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Donate;
