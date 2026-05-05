import "@/styles/chapter-weekly.css";

import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Users,
  BookOpen,
  Video,
  FileText,
  Gift,
  Lock,
  Heart,
  Package,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Facebook pixel helper ───────────────────────────────────────────────────
function FbPixelLead() {
  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '880780867959990');
      fbq('track', 'Lead');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement("noscript");
    noscript.innerHTML =
      '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=880780867959990&ev=Lead&noscript=1" />';
    document.body.appendChild(noscript);

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
      if (document.body.contains(noscript)) document.body.removeChild(noscript);
    };
  }, []);
  return null;
}

// ─── Shared hero wrapper ─────────────────────────────────────────────────────
function PageHero({ children }: { children: React.ReactNode }) {
  return (
    <div className="chapter-weekly-theme min-h-screen bg-gradient-to-b from-background via-secondary to-background text-foreground" dir="rtl">
      <header className="py-6 md:py-8 px-4 bg-gradient-to-br from-secondary via-muted to-secondary relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <img
            src="/lovable-uploads/b5f2dd73-fe0b-41e8-8bcd-fc1516514ecf.png"
            alt="לוגו בני ציון"
            className="h-12 md:h-16 lg:h-20 mx-auto mb-4 transition-all duration-500 hover:scale-105"
          />
        </div>
      </header>
      {children}
    </div>
  );
}

// ─── Variant: Store / book purchase ─────────────────────────────────────────
function StoreThankYou() {
  return (
    <PageHero>
      <FbPixelLead />
      <div className="bg-gradient-to-l from-primary to-primary/80 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            תודה על הרכישה!
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90">
            ההזמנה שלך התקבלה בהצלחה
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="mb-8 border-2 border-primary/30 shadow-xl bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
              מה קורה עכשיו?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: <Mail className="w-5 h-5" />,
                title: "אישור הזמנה במייל",
                body: "אישור הזמנה ופרטי תשלום נשלחו לכתובת המייל שהזנת. בדוק גם בתיקיית ספאם.",
              },
              {
                icon: <Package className="w-5 h-5" />,
                title: "משלוח",
                body: "הספר ישלח אליך תוך 5–7 ימי עסקים בהתאם לאופן המשלוח שבחרת. פרטי המשלוח יישלחו בנפרד.",
              },
              {
                icon: <CheckCircle2 className="w-5 h-5" />,
                title: "יש שאלות?",
                body: "לכל שאלה או בקשת שינוי ניתן לפנות אלינו בוואטסאפ או במייל.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-card p-4 rounded-lg border-r-4 border-primary flex items-start gap-4 flex-row-reverse"
              >
                <div className="bg-primary text-primary-foreground rounded-full p-2 flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-primary mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button asChild size="lg" className="gap-2">
            <Link to="/store">
              <BookOpen className="w-5 h-5" />
              חזרה לחנות
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="text-center mt-12 py-8 border-t border-border">
          <p className="text-lg text-foreground mb-2">תודה שבחרת בבני ציון!</p>
          <p className="text-muted-foreground">נתראה בלימוד</p>
        </div>
      </div>
    </PageHero>
  );
}

// ─── Variant: Subscription (weekly chapter) ──────────────────────────────────
function SubscriptionThankYou() {
  return (
    <PageHero>
      <FbPixelLead />
      <div className="bg-gradient-to-l from-primary to-primary/80 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            ברוכים הבאים לתכנית "לחיות תנ"ך — הפרק השבועי"!
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90">
            אנחנו שמחים שהצטרפת למסע לימוד התנ"ך שלנו עם הרב יואב אוריאל
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-full">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-primary-foreground font-semibold">
              שיעור שבועי: ערב רביעי
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Currently studying */}
        <Card className="mb-8 border-2 border-primary/30 shadow-xl bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
              מה לומדים עכשיו?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-gradient-to-l from-primary/10 to-accent/10 rounded-lg mb-6">
              <p className="text-lg font-semibold text-foreground">
                כעת לומדים: <span className="text-primary">חגי, זכריה, מלאכי</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                נביאי הבית השני — ממשיכים ישירות את סיפור מגילת אסתר לתקופת שיבת ציון
              </p>
            </div>
            <div className="grid gap-3">
              {[
                { book: "חגי", desc: "הנביא שמעודד את בניין בית המקדש השני" },
                { book: "זכריה", desc: "חזיונות ועידוד — מבניין הבית ועד ימות המשיח" },
                { book: "מלאכי", desc: "הנביא האחרון — קריאה לחזרה בתשובה לפני גאולה" },
              ].map((item) => (
                <div key={item.book} className="bg-card p-4 rounded-lg border-r-4 border-primary">
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="font-bold text-primary">{item.book}</span>
                    <span className="text-muted-foreground text-sm">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-6 p-4 bg-accent/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                בהמשך נעבור לשאר ספרי נביאים וכתובים על הסדר
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What happens each week */}
        <Card className="mb-8 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-primary to-primary/80 text-primary-foreground text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold">מה צפוי לך בכל שבוע?</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {[
                {
                  icon: <Calendar className="w-6 h-6" />,
                  title: "1. יום שישי בבוקר",
                  body: [
                    "מקבלים תכני בסיס + העמקה על הפרקים השבועיים:",
                    "• הקלטה של קריאת הפרקים",
                    "• ביאור פשוט",
                    "• מאמר מאת הרב יואב + הקלטות העמקה",
                  ],
                  color: "accent",
                },
                {
                  icon: <BookOpen className="w-6 h-6" />,
                  title: "2. שישי עד ראשון",
                  body: ["לימוד אישי – לקרוא את הפרקים (רק 15–20 דק׳!).", 'ממליצים ללמוד עם פירוש "מצודות דוד".'],
                  color: "primary",
                },
                {
                  icon: <Video className="w-6 h-6" />,
                  title: "3. ערב רביעי — שיעור זום שבועי",
                  body: [
                    "שיעור הזום השבועי עם הרב יואב אוריאל",
                    "הקלטה תמיד זמינה למי שפספס או רוצה לחזור",
                  ],
                  color: "accent",
                },
                {
                  icon: <FileText className="w-6 h-6" />,
                  title: "4. יום חמישי",
                  body: ["נשלח אליך סיכום כתוב + הקלטת השיעור המלא"],
                  color: "primary",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 border-b border-border hover:bg-muted/50 transition-colors last:border-b-0"
                >
                  <div className="flex flex-row-reverse items-start gap-4">
                    <div
                      className={`${
                        item.color === "accent"
                          ? "bg-accent text-accent-foreground"
                          : "bg-primary text-primary-foreground"
                      } rounded-full p-3 flex-shrink-0`}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-xl font-bold text-primary mb-3">{item.title}</h3>
                      {item.body.map((t) => (
                        <p key={t} className="text-lg text-foreground mt-2">
                          {t}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA — portal */}
        <Card className="mb-8 border-2 border-accent/50 shadow-xl bg-gradient-to-br from-card to-accent/10">
          <CardContent className="p-8 text-center space-y-6">
            <p className="text-lg leading-relaxed text-foreground">
              כל התכנים, ההקלטות והסיכומים מחכים לך ב
              <span className="font-bold text-primary">פורטל הלומדים</span> שלנו:
            </p>
            <a
              href="/portal"
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 rounded-2xl text-xl font-bold inline-flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <BookOpen className="w-6 h-6" />
              כניסה לפורטל הלומדים
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="border-t border-border pt-6 mt-6">
              <p className="text-foreground mb-3">
                וגם — הצטרפו{" "}
                <span className="font-bold text-primary">לקבוצת הוואטסאפ</span>{" "}
                לעדכונים ודיונים:
              </p>
              <a
                href="https://chat.whatsapp.com/L1PZWRh8kxdDojWmUDMBs3"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl text-lg font-bold inline-flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Users className="w-5 h-5" />
                הצטרף לקבוצת הוואטסאפ
                <ArrowLeft className="w-4 h-4" />
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border border-border">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <p className="text-lg text-foreground">הכל פתוח ונגיש דרך קבוצת הוואטסאפ או המייל שלך</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border border-border">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <p className="text-lg text-foreground">אין התחייבות – רק רצון ללמוד ולהתחבר</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-primary mb-6">מוכנים להתחיל ללמוד?</h3>
            <a
              href="/portal"
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-10 py-5 rounded-2xl text-xl font-bold inline-flex items-center gap-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <BookOpen className="w-6 h-6" />
              כניסה לפורטל הלומדים
              <ArrowLeft className="w-6 h-6" />
            </a>
          </CardContent>
        </Card>

        <div className="text-center mt-12 py-8 border-t border-border">
          <p className="text-lg text-foreground mb-2">תודה שהצטרפת אלינו!</p>
          <p className="text-muted-foreground">נתראה בלימוד</p>
        </div>
      </div>
    </PageHero>
  );
}

// ─── Variant: Donation ───────────────────────────────────────────────────────
function DonationThankYou() {
  return (
    <PageHero>
      <FbPixelLead />
      <div className="bg-gradient-to-l from-primary to-primary/80 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            תודה רבה על תרומתך!
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90">
            תרומתך תורמת ישירות להרחבת לימוד התורה והתנ"ך בישראל
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="mb-8 border-2 border-primary/30 shadow-xl bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
              ברכה ממעמקי הלב
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-lg leading-relaxed text-foreground">
              תרומתך מאפשרת לאלפי אנשים ללמוד תנ"ך ברמה גבוהה, ללא עלות —
              ממש כמו שהתורה מיועדת להיות: נחלת כלל ישראל.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mt-4">
              {[
                { icon: <BookOpen className="w-6 h-6" />, text: "הנגשת אלפי שיעורים בחינם" },
                { icon: <Users className="w-6 h-6" />, text: "תמיכה ברבנים ומרצים" },
                { icon: <Gift className="w-6 h-6" />, text: "פיתוח תכנים ופלטפורמה" },
              ].map((item, idx) => (
                <div key={idx} className="bg-card p-4 rounded-xl border border-border flex flex-col items-center gap-2">
                  <div className="text-primary">{item.icon}</div>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border border-border shadow-md">
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto mb-2 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-primary text-lg">קבלה במייל</h3>
            <p className="text-muted-foreground text-sm">
              קבלה על התרומה תישלח לכתובת המייל שהזנת בקרוב.
              לכל שאלה ניתן לפנות אלינו ישירות.
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button asChild size="lg" className="gap-2">
            <Link to="/">
              <BookOpen className="w-5 h-5" />
              לעמוד הבית
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="text-center mt-12 py-8 border-t border-border">
          <p className="text-lg text-foreground mb-2">תודה שאתה שותף לחזון!</p>
          <p className="text-muted-foreground">יהי רצון שזכות לימוד התנ"ך תעמוד לך ולכל יקיריך</p>
        </div>
      </div>
    </PageHero>
  );
}

// ─── Variant: Cart / generic ─────────────────────────────────────────────────
function CartThankYou() {
  return (
    <PageHero>
      <FbPixelLead />
      <div className="bg-gradient-to-l from-primary to-primary/80 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            תודה על ההזמנה!
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90">
            פרטי הרכישה נשלחו למייל שלך
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="mb-8 border-2 border-primary/30 shadow-xl bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              ההזמנה התקבלה בהצלחה
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-foreground">
              אישור הזמנה ופרטי התשלום נשלחו לכתובת המייל שלך. אם לא קיבלת — בדוק בתיקיית ספאם.
            </p>
            <p className="text-muted-foreground">לכל שאלה ניתן לפנות אלינו בוואטסאפ.</p>
          </CardContent>
        </Card>

        <div className="text-center mt-8 flex gap-4 justify-center flex-wrap">
          <Button asChild size="lg" className="gap-2">
            <Link to="/store">
              <Package className="w-5 h-5" />
              חזרה לחנות
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to="/">
              <BookOpen className="w-5 h-5" />
              עמוד הבית
            </Link>
          </Button>
        </div>

        <div className="text-center mt-12 py-8 border-t border-border">
          <p className="text-lg text-foreground mb-2">תודה שבחרת בבני ציון!</p>
          <p className="text-muted-foreground">נתראה בלימוד</p>
        </div>
      </div>
    </PageHero>
  );
}

// ─── Root component — switches on ?type= ────────────────────────────────────
const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") ?? "cart";

  switch (type) {
    case "store":
      return <StoreThankYou />;
    case "subscription":
      return <SubscriptionThankYou />;
    case "donation":
      return <DonationThankYou />;
    default:
      return <CartThankYou />;
  }
};

export default ThankYou;
