import { ArrowLeft, Target, Clock, BookOpen, Users } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const HowItWorks = () => (
  <section className="py-20 md:py-28 px-4 bg-cream-warm">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
          למה כל הניסיונות הקודמים <span className="text-primary">לא הצליחו</span>?
        </h2>
        <p className="text-lg md:text-xl text-brown-light max-w-2xl mx-auto">וזה לא באשמתך. פשוט לא היה לך ליווי נכון.</p>
      </div>

      <div className="premium-card mb-16 text-center">
        <p className="text-lg md:text-xl text-brown-light leading-relaxed">
          מה שכנראה לא פגשת עדיין, הוא ש<span className="font-bold text-foreground">לתנ"ך יש סדר פנימי.</span>
          <br />
          יש הגיון. יש מבנה. יש עומק.
          <br />
          <span className="text-primary font-semibold">אבל כדי להגיע אליו – צריך ליווי נכון.</span>
        </p>
      </div>

      <h3 className="text-2xl md:text-3xl font-bold text-center text-primary mb-12">השיטה הפשוטה שעובדת</h3>

      <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-12">
        <div className="premium-card group">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <h4 className="text-xl font-bold text-foreground mb-3">שני פרקים בשבוע</h4>
          <p className="text-brown-light leading-relaxed">במגילת אסתר לומדים שני פרקים בשבוע – קצב מהיר שמאפשר להקיף את כל המגילה תוך 5 שבועות בלבד.</p>
        </div>

        <div className="premium-card group">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <h4 className="text-xl font-bold text-foreground mb-3">15 דקות הכנה + זום שבועי</h4>
          <p className="text-brown-light leading-relaxed">לפני כל שיעור הכנה קצרה וממוקדת. ואז – זום שבועי חי שמחבר את הכל לתמונה אחת ברורה.</p>
        </div>

        <div className="premium-card group">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h4 className="text-xl font-bold text-foreground mb-3">תנ"ך לדורנו</h4>
          <p className="text-brown-light leading-relaxed">אנחנו לא רק מסבירים את הפסוקים – אנחנו חיים אותם. מופתעים כל פעם לפגוש איך הסיפור של פעם מסביר את הסיפור שלנו היום.</p>
        </div>

        <div className="premium-card group">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h4 className="text-xl font-bold text-foreground mb-3">קהילה תומכת + מומחיות מוכחת</h4>
          <p className="text-brown-light leading-relaxed">אתה לא לומד לבד. יש סביבך קבוצה של אנשים שרוצים בדיוק כמוך להבין, ויש לך את הרב יואב אוריאל – 15 שנה של הוראת תנ"ך.</p>
        </div>
      </div>

      <div className="text-center">
        <SubscribeButton>
      <button type="button" className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 hover:shadow-premium-lg hover:scale-105">
          אני רוצה לקבל את התכנים
          <ArrowLeft className="w-5 h-5" />
        </button>
    </SubscribeButton>
      </div>
    </div>
  </section>
);

export default HowItWorks;
