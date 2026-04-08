import "@/styles/chapter-weekly.css";

import { useEffect } from "react";
import { ArrowLeft, Calendar, Users, BookOpen, Video, FileText, Gift, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ThankYou = () => {
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
    noscript.innerHTML = '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=880780867959990&ev=Lead&noscript=1" />';
    document.body.appendChild(noscript);

    return () => {
      document.head.removeChild(script);
      document.body.removeChild(noscript);
    };
  }, []);

  return (
    <div className="chapter-weekly-theme min-h-screen bg-gradient-to-b from-background via-secondary to-background text-foreground" dir="rtl">
      <header className="py-6 md:py-8 px-4 bg-gradient-to-br from-secondary via-muted to-secondary relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <img src="/lovable-uploads/b5f2dd73-fe0b-41e8-8bcd-fc1516514ecf.png" alt="לוגו בני ציון" className="h-12 md:h-16 lg:h-20 mx-auto mb-4 transition-all duration-500 hover:scale-105" />
        </div>
      </header>

      <div className="bg-gradient-to-l from-primary to-primary/80 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">ברוכים הבאים לתכנית "לחיות תנ\"ך - הפרק השבועי"!</h1>
          <p className="text-lg md:text-xl text-primary-foreground/90">אנחנו שמחים שהצטרפת למסע לימוד התנ"ך שלנו עם הרב יואב אוריאל</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-full">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-primary-foreground font-semibold">מתחילים ביום שני 2.2.26 – ט״ו בשבט!</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="mb-8 border-2 border-primary/30 shadow-xl bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary">לוח לימוד מגילת אסתר - השבועות הקרובים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-gradient-to-l from-primary/10 to-accent/10 rounded-lg mb-6">
              <p className="text-lg font-semibold text-foreground">עכשיו לומדים במגילת אסתר - איך עם ישראל מנצח את האימפריות הגדולות</p>
            </div>
            <div className="grid gap-3">
              {[
                { week: 1, title: "אסתר פרקים א'-ב' - משתה המלך ואסתר מגיעה למלכות" },
                { week: 2, title: "אסתר פרקים ג'-ד' - המן והגזירה, מרדכי ואסתר מתארגנים" },
                { week: 3, title: "אסתר פרקים ה'-ו' - המשתה והמהפך הגדול" },
                { week: 4, title: "אסתר פרקים ז'-ח' - נפילת המן וגזירה חדשה לטובת היהודים" },
                { week: 5, title: "אסתר פרקים ט'-י' - ניצחון היהודים ומרדכי משנה למלך" },
              ].map((item) => (
                <div key={item.week} className="bg-card p-4 rounded-lg border-r-4 border-primary">
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="font-bold text-primary">שבוע {item.week}</span>
                    <span className="text-muted-foreground">{item.title}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-6 p-4 bg-accent/10 rounded-lg">
              <p className="text-lg font-semibold text-foreground">כל שבוע נלמד שני פרקים ממגילת אסתר – תוך 5 שבועות נסיים את כל המגילה!</p>
              <p className="text-sm text-muted-foreground mt-2">איך מתמודדים כשכל העולם נגדנו – ומנצחים</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-2 border-accent/30 shadow-xl bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary">מה קורה אחרי מגילת אסתר?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-6 bg-gradient-to-l from-primary/10 to-accent/10 rounded-lg">
              <h3 className="text-xl font-bold text-foreground mb-4">ממשיכים לנביאי הבית השני!</h3>
              <p className="text-lg leading-relaxed mb-4 text-foreground">
                אחרי פסח נמשיך ללמוד את <span className="font-bold text-primary">חגי, זכריה ומלאכי</span> – הנביאים של אותו הדור של אסתר ומרדכי
              </p>
              <div className="bg-card p-4 rounded-lg border-r-4 border-accent">
                <p className="text-lg font-semibold text-foreground">הם ממשיכים באופן ישיר את סיפור המגילה להמשך ימי הבית השני</p>
                <p className="text-muted-foreground mt-2">ומשם לכל ספרי נביאים וכתובים על הסדר</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-2 border-accent/50 shadow-xl bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary">מה קורה עכשיו?</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-lg leading-relaxed text-foreground">
              כל התכנים, ההקלטות והסיכומים מחכים לך ב<span className="font-bold text-primary">פורטל הלומדים</span> שלנו:
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
                וגם – הצטרפו <span className="font-bold text-primary">לקבוצת הוואטסאפ</span> לעדכונים ודיונים:
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

        <Card className="mb-8 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-primary to-primary/80 text-primary-foreground text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold">מה צפוי לך בכל שבוע?</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {[ 
                { icon: <Calendar className="w-6 h-6" />, title: "1. יום שישי בבוקר", body: ["מקבלים תכני בסיס + העמקה על שני הפרקים השבועיים:", "• הקלטה של קריאת הפרקים", "• ביאור פשוט", "• מאמר מאת הרב יואב + הקלטות העמקה"], color: "accent" },
                { icon: <BookOpen className="w-6 h-6" />, title: "2. שישי עד ראשון", body: ["לימוד אישי – לקרוא את שני הפרקים (רק 15-20 דק'!).", "ממליצים ללמוד עם פירוש \"מצודות דוד\"."], color: "primary" },
                { icon: <Video className="w-6 h-6" />, title: "3. יום שני בשעה 21:00", body: ["שיעור הזום השבועי עם הרב יואב אוריאל", "הקלטה תמיד זמינה למי שפספס או רוצה לחזור"], color: "accent" },
                { icon: <FileText className="w-6 h-6" />, title: "4. יום שלישי", body: ["נשלח אליך סיכום כתוב + הקלטת השיעור המלא"], color: "primary" },
              ].map((item, idx) => (
                <div key={idx} className="p-6 border-b border-border hover:bg-muted/50 transition-colors last:border-b-0">
                  <div className="flex flex-row-reverse items-start gap-4">
                    <div className={`${item.color === "accent" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"} rounded-full p-3 flex-shrink-0`}>{item.icon}</div>
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

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border border-border">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <p className="text-lg text-foreground">הכל פתוח ונגיש דרך קבוצת הווצאפ או המייל שלך</p>
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
    </div>
  );
};

export default ThankYou;
