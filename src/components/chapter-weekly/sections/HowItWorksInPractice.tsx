import { ArrowLeft, FileText, Video, Headphones, MessageCircle } from "lucide-react";

const HowItWorksInPractice = () => (
  <section className="py-20 md:py-28 px-4 bg-background">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          מה תקבל <span className="text-primary">כל שבוע</span>
        </h2>
        <p className="text-lg md:text-xl text-brown-light">הכל במקום אחד – פשוט וברור</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="premium-card group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">מאמר העמקה שבועי</h3>
              <p className="text-brown-light leading-relaxed">מאמר מעמיק מהרב יואב שפותח צוהר להבנה עמוקה של הפרקים השבועיים.</p>
            </div>
          </div>
        </div>

        <div className="premium-card group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
              <Video className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">שיעור זום שבועי חי</h3>
              <p className="text-brown-light leading-relaxed">עם הרב יואב (וגם הקלטה זמינה) שבו הכל מתחבר לתמונה אחת ברורה.</p>
            </div>
          </div>
        </div>

        <div className="premium-card group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
              <Headphones className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">תכנים להאזנה וצפייה</h3>
              <p className="text-brown-light leading-relaxed">ביאור פסוק-פסוק, קריאה מונחית ולב הפרק – שתוכל לשמוע בנסיעה, בהליכה, או כשיש לך כמה דקות פנויות.</p>
            </div>
          </div>
        </div>

        <div className="premium-card group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
              <MessageCircle className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">סיכום כתוב מסודר</h3>
              <p className="text-brown-light leading-relaxed">1-2 עמודים שמחזקים את ההבנה ונותנים לך נקודות לחזרה.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <a
          href="https://pay.grow.link/714ddd3db06f5aabeaecb107064b431f-MjcwODI0Ng"
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 hover:shadow-premium-lg hover:scale-105"
        >
          אני רוצה להצטרף!
          <ArrowLeft className="w-5 h-5" />
        </a>
      </div>
    </div>
  </section>
);

export default HowItWorksInPractice;
