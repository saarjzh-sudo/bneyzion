import { ArrowLeft } from "lucide-react";
import { SubscribeButton } from "@/components/chapter-weekly/SubscribeButton";

const MeetRabbi = () => (
  <section className="py-20 md:py-28 px-4 bg-primary text-primary-foreground">
    <div className="max-w-4xl mx-auto">
      <p className="text-center text-lg md:text-xl mb-4 text-primary-foreground/80">תכירו את מי שיוביל אתכם במסע –</p>

      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12">הרב יואב אוריאל</h2>

      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-12">
        <img
          src="/lovable-uploads/fbbe71d6-129b-47d8-a0ec-ce3ce44cdb29.png"
          alt="הרב יואב אוריאל"
          className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-2xl shadow-2xl ring-4 ring-accent flex-shrink-0"
        />

        <div className="text-center md:text-right">
          <p className="text-lg md:text-xl leading-relaxed text-primary-foreground/90 mb-6">
            הרב יואב אוריאל כבר יותר מ־15 שנה:
            לוקח את אותו התנ"ך, שלפעמים פותחים אותו בהיסוס או בראש כבד,
            ומחזיר לו את הסקרנות, הרלוונטיות והעומק – כך שכל אחד יכול להתחבר.
          </p>

          <h4 className="font-bold text-accent text-xl mb-4">קצת על הדרך שלו:</h4>
          <ul className="space-y-2 text-primary-foreground/90 text-lg mb-6">
            <li>• ראש תנועת "בני ציון" ללימוד תנ"ך</li>
            <li>• מחבר סדרת הספרים "מכלל יופי" על התנ"ך</li>
            <li>• מרצה ותיק במכללה ירושלים, מלמד בישיבות וכנסים ברחבי הארץ</li>
            <li>• 15 שנות ניסיון בהוראת תנ"ך לקהל מגוון – תלמידי ישיבה, סטודנטים, אנשי מקצוע, הורים ואפילו מי שמעולם לא פתח תנ"ך ברצינות</li>
          </ul>
        </div>
      </div>

      <div className="premium-card bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground mb-12">
        <h4 className="font-bold text-accent text-xl mb-4 text-center">הגישה שלו – מה שהופך את הלימוד לחוויה אחרת לגמרי:</h4>
        <div className="grid md:grid-cols-2 gap-4">
          {[ 
            ["סקרנות של ילד", " – להתרגש מכל גילוי חדש"],
            ["בהירות ורצינות", " – להבין את הרצף, המגמה וההיגיון הפנימי"],
            ["שילוב בין פשט לעומק", " – גם לראות את הסיפור, וגם לגלות את השאלות הגדולות והלקחים האמוניים"],
            ["חיבור לימינו", " – איך כל פרק בתנ\"ך משליך באופנים מפתיעים על ההתמודדויות שלנו עכשיו, כאן במדינת ישראל"],
          ].map(([a, b]) => (
            <div key={a} className="p-4 bg-primary-foreground/5 rounded-lg">
              <span className="font-bold text-accent">{a}</span>
              <span className="text-primary-foreground/90">{b}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mb-12">
        <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed max-w-2xl mx-auto">
          דמיין שאתה נכנס לשיעור תנ"ך, ומרגיש כבר בדקות הראשונות שזה לא עוד שיעור רגיל.
          הפסוקים שאתה מכיר מקבלים חיים חדשים, שאלות שאתה לא חשבת לשאול פתאום מתעוררות
          ואתה מבין – <span className="text-accent font-semibold">יש כאן שיטה, סדר, בהירות.</span>
        </p>
      </div>

      <div className="text-center">
        <SubscribeButton>
      <button type="button" className="inline-flex items-center gap-3 bg-accent text-accent-foreground px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-gold hover:scale-105">
          אני רוצה להצטרף
          <ArrowLeft className="w-5 h-5" />
        </button>
    </SubscribeButton>
      </div>
    </div>
  </section>
);

export default MeetRabbi;
