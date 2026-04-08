import { motion } from "framer-motion";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const communities = [
  {
    title: "קריאת כיוון – סרטון יומי בתנ״ך",
    description: "כל יום סרטון קצר וחד שמחדד פסוק או נושא תנ\"כי. כי דקה אחת של תנ\"ך יכולה לשנות את היום.",
    link: "https://chat.whatsapp.com/example-daily",
  },
  {
    title: "פסוק היומי – בני ציון",
    description: "פסוק מהתנ\"ך כל בוקר עם פירוש קצר וחיזוק. התחילו את הבוקר עם מילה טובה.",
    link: "https://chat.whatsapp.com/example-verse",
  },
];

const WhatsAppCommunitySection = () => {
  return (
    <section className="py-16 section-gradient-warm" dir="rtl">
      <div className="container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-heading gradient-warm mb-3">
            הצטרפו לקהילות הווצאפ שלנו
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            תנ״ך לא נלמד לבד — הצטרפו לאלפים שכבר חיים תנ״ך כל יום
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communities.map((community, i) => (
            <motion.a
              key={community.title}
              href={community.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 hover:shadow-lg hover:border-[#25D366]/30 transition-all duration-300"
            >
              {/* Glass overlay */}
              <div className="absolute inset-0 bg-gradient-to-bl from-[#25D366]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <WhatsAppIcon className="h-6 w-6 text-[#25D366] shrink-0" />
                    <h3 className="text-base font-display text-foreground leading-snug">
                      {community.title}
                    </h3>
                  </div>
                  <WhatsAppIcon className="h-6 w-6 text-[#25D366] shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {community.description}
                </p>

                <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-display text-sm group-hover:bg-[#20BD5A] transition-colors">
                  <WhatsAppIcon className="h-4 w-4" />
                  הצטרף לקבוצה
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatsAppCommunitySection;
