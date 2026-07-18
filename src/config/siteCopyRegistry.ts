/**
 * siteCopyRegistry — מרשם הנוסחים/תמונות שניתנים לעריכה מהאדמין (רמה 13).
 *
 * זה הלב של "מרכז השליטה" (בקשת סער 9.7 + לחץ הרב יואב: "עדיף מאשר שאשלח לך
 * כל הזמן פניות"). כל שדה כאן = מפתח ב-site_settings (prefix copy./image. או
 * מפתחות memorial_/print_ הקיימים). הקומפוננטות החיות קוראות דרך useSiteCopy
 * עם fallback לנוסח המקודד — אפס שינוי ויזואלי עד שעורכים בפועל.
 *
 * אבטחה (עוגן: "מידע רגיש נשאר של סער; לעולם לא RLS פתוח"):
 * - RLS על site_settings מתיר לאדמינים לכתוב רק מפתחות copy./image./memorial_/
 *   print_/homepage_ — גם admin לא יכול לגעת במפתח אחר (fail-closed בצד ה-DB).
 * - sensitive: true ⇒ עריכה רק ל-SUPER_ADMIN_EMAILS (סער) — נאכף גם ב-UI.
 */

export interface CopyField {
  /** site_settings key — חייב להתחיל ב-copy. / image. / memorial_ / print_ */
  key: string;
  label: string;
  group: string;
  type: "text" | "textarea" | "image";
  /** הנוסח המקודד הנוכחי — ה-fallback כשאין override ב-DB */
  defaultValue: string;
  /** איפה זה מופיע באתר */
  hint?: string;
  /** עריכה רק לסער (SUPER_ADMIN_EMAILS) */
  sensitive?: boolean;
}

export const SUPER_ADMIN_EMAILS = ["saar.j.z.h@gmail.com"];

export const SITE_COPY_REGISTRY: CopyField[] = [
  // ── דף הבית — הירו ──
  {
    key: "copy.home.hero_title",
    label: "כותרת ההירו",
    group: "דף הבית",
    type: "text",
    defaultValue: "אתר התנ״ך של ישראל",
    hint: "הכותרת הגדולה מעל וידאו-האקוורל בדף הבית",
  },
  {
    key: "copy.home.hero_cta_primary",
    label: "כפתור ראשי בהירו",
    group: "דף הבית",
    type: "text",
    defaultValue: "התחילו ללמוד",
    hint: "הכפתור המוזהב בדף הבית",
  },
  {
    key: "copy.home.hero_cta_secondary",
    label: "כפתור משני בהירו",
    group: "דף הבית",
    type: "text",
    defaultValue: "לתכנית הפרק השבועי",
    hint: "הכפתור השקוף ליד הכפתור המוזהב",
  },

  // ── דף הבית — פס המספרים ──
  {
    key: "copy.home.stat1_num",
    label: "מספר 1 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "+11,000",
    hint: "הפס הכהה מתחת להירו",
  },
  {
    key: "copy.home.stat1_label",
    label: "תווית 1 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "שיעורים ומאמרים",
  },
  {
    key: "copy.home.stat2_num",
    label: "מספר 2 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "+200",
  },
  {
    key: "copy.home.stat2_label",
    label: "תווית 2 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "רבנים ומרצים",
  },
  {
    key: "copy.home.stat3_num",
    label: "מספר 3 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "+1,300",
  },
  {
    key: "copy.home.stat3_label",
    label: "תווית 3 בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "סדרות לימוד",
  },

  // ── דף הבית — שורת הנצחה (רמה 20, יואב 16.7) ──
  {
    key: "copy.home.memorial_line",
    label: "שורת ההנצחה בפס הנתונים",
    group: "דף הבית",
    type: "text",
    defaultValue: "האתר מוקדש לזכר סעדיה דרעי ז״ל",
    hint: "השורה מתחת למספרים בפס הכהה — מקשרת לעמוד ההנצחה",
  },

  // ── דף הבית — רצועת דור הפלאות (יואב 18.7: "אני רוצה לשנות את השורה הזאת") ──
  {
    key: "copy.home.miracles_eyebrow",
    label: "רצועת דור הפלאות — תגית עליונה",
    group: "דף הבית",
    type: "text",
    defaultValue: "ניסי המלחמה",
  },
  {
    key: "copy.home.miracles_title",
    label: "רצועת דור הפלאות — כותרת",
    group: "דף הבית",
    type: "text",
    defaultValue: "דור הפלאות — נסים מהמלחמה",
  },
  {
    key: "copy.home.miracles_subtitle",
    label: "רצועת דור הפלאות — שורת המשנה",
    group: "דף הבית",
    type: "text",
    defaultValue: "מאות סיפורים מתועדים של נסים גלויים שהתרחשו בשדות הקרב ובעורף",
    hint: "השורה הבהירה מתחת לכותרת ברצועה הכהה של דור הפלאות",
  },

  // ── דף התרומות /donate (רמה 20, יואב 16.7: "איפה אני יכול לערוך את המלל בדף התרומות?") ──
  {
    key: "copy.donate.hero_eyebrow",
    label: "תגית פתיחה",
    group: "דף התרומות",
    type: "text",
    defaultValue: "שותפים לבית התנ״ך",
    hint: "התגית הקטנה מעל הכותרת בראש עמוד /donate",
  },
  {
    key: "copy.donate.hero_title_line1",
    label: "כותרת ראשית — שורה 1",
    group: "דף התרומות",
    type: "text",
    defaultValue: "היו שותפים איתנו",
  },
  {
    key: "copy.donate.hero_title_line2",
    label: "כותרת ראשית — שורה 2",
    group: "דף התרומות",
    type: "text",
    defaultValue: "להפצת אור התנ״ך!",
  },
  {
    key: "copy.donate.photo_caption",
    label: "כיתוב מתחת לתמונת הרב יואב",
    group: "דף התרומות",
    type: "text",
    defaultValue: "מאחורי כל שיעור עומדים אנשים אמיתיים שבונים תורה",
  },
  {
    key: "copy.donate.story_p1",
    label: "פסקת סיפור 1",
    group: "דף התרומות",
    type: "textarea",
    defaultValue:
      "בני ציון נולדה מתוך אמונה פשוטה: התנ״ך הוא לא רק ספר של פעם. הוא הלב של עם ישראל — הוא מספר לנו מי אנחנו, מאיפה באנו ולאן אנחנו הולכים.",
  },
  {
    key: "copy.donate.story_p2",
    label: "פסקת סיפור 2",
    group: "דף התרומות",
    type: "textarea",
    defaultValue:
      "בשנים האחרונות נבנה כאן בית גדול ללימוד תנ״ך: שיעורים, סדרות, ספרי מכלל יופי, קורסים, תשובות וכלים למורים, הורים ולומדים. אבל כדי שכל זה יישאר פתוח באמת — צריך להחזיק אותו.",
  },
  {
    key: "copy.donate.story_p3",
    label: "פסקת סיפור 3",
    group: "דף התרומות",
    type: "textarea",
    defaultValue:
      "כל שיעור עובר דרך ארוכה: הכנה, הקלטה, עריכה, תמלול, עיצוב והעלאה. מבחוץ זה נראה פשוט. בפנים זו עבודה גדולה.",
  },
  {
    key: "copy.donate.story_p4",
    label: "פסקת סיפור 4 (מודגשת)",
    group: "דף התרומות",
    type: "textarea",
    defaultValue: "יכולנו לסגור את התוכן מאחורי תשלום. לעשות מנוי. אבל בחרנו אחרת.",
  },
  {
    key: "copy.donate.story_p5",
    label: "פסקת סיפור 5",
    group: "דף התרומות",
    type: "textarea",
    defaultValue:
      "התנ״ך שייך לעם ישראל — ולכן אנחנו רוצים שהוא יישאר פתוח לכל יהודי. ילד, מורה, חייל, הורה, וכל מי שמחפש שער להיכנס דרכו.",
  },
  {
    key: "copy.donate.quote",
    label: "ציטוט מודגש (pull-quote)",
    group: "דף התרומות",
    type: "textarea",
    defaultValue:
      "התרומה שלכם היא לא ״תרומה לאתר״. היא עוד שיעור שילד יפגוש. עוד אדם שיפתח תנ״ך וירגיש שהוא נכנס הביתה.",
  },

  // ── חנות ──
  {
    key: "copy.store.hero_title",
    label: "כותרת החנות",
    group: "חנות",
    type: "text",
    defaultValue: "ספרי תנ״ך מבית בני ציון",
    hint: "הכותרת בראש עמוד /store",
  },
  {
    key: "copy.store.hero_subtitle",
    label: "תת-כותרת החנות",
    group: "חנות",
    type: "textarea",
    defaultValue:
      "ספרי פרשנות מקוריים, מגילות, קורסים דיגיטליים וימי עיון — הכל מבית בני ציון",
  },

  // ── הנצחה (מפתחות קיימים ב-DB — בלי copy. prefix) ──
  {
    key: "memorial_name",
    label: "שם המונצח",
    group: "הנצחה",
    type: "text",
    defaultValue: "סעדיה ז״ל",
    hint: "עמוד ההנצחה",
    sensitive: true,
  },
  {
    key: "memorial_subtitle",
    label: "תת-כותרת ההנצחה",
    group: "הנצחה",
    type: "text",
    defaultValue: "תהא נשמתו צרורה בצרור החיים",
    sensitive: true,
  },
  {
    key: "memorial_verse",
    label: "פסוק ההנצחה",
    group: "הנצחה",
    type: "text",
    defaultValue: "״והחי ייתן אל ליבו״ – קהלת ז׳, ב׳",
    sensitive: true,
  },
  {
    key: "memorial_dedication",
    label: "הקדשת האתר",
    group: "הנצחה",
    type: "textarea",
    defaultValue: "",
    sensitive: true,
  },
  {
    key: "memorial_bio",
    label: "ביוגרפיה",
    group: "הנצחה",
    type: "textarea",
    defaultValue: "",
    sensitive: true,
  },
  {
    key: "memorial_legacy",
    label: "מורשת",
    group: "הנצחה",
    type: "textarea",
    defaultValue: "",
    sensitive: true,
  },
  {
    key: "print_dedication",
    label: "הקדשה בהדפסה",
    group: "הנצחה",
    type: "text",
    defaultValue: "לעילוי נשמת סעדיה בן שמחה ז״ל",
    hint: "מופיעה בתחתית כל עמוד מודפס",
    sensitive: true,
  },

  // ── אודות (/about) — בקשת הלקוח ──
  {
    key: "copy.about.vision_p1",
    label: "פסקת חזון 1 (עם ההדגשה 'בני ציון')",
    group: "אודות",
    type: "textarea",
    defaultValue:
      "<strong>'בני ציון'</strong> היא הבמה המרכזית של לימוד התנ\"ך, בדרך הממשיכה את מסורת ישראל לדורותיה.",
    hint: "הפסקה הראשונה בכרטיס הזהב בראש עמוד /about — HTML מותר",
  },
  {
    key: "copy.about.vision_p2",
    label: "פסקת חזון 2",
    group: "אודות",
    type: "textarea",
    defaultValue: "דרך זו מאגדת עשרות רבנים המתמחים בתנ\"ך ומלמדים אותו במשך שנים רבות.",
  },
  {
    key: "copy.about.vision_p3",
    label: "פסקת חזון 3 (הנצחה — כולל קישור לעמוד ההנצחה)",
    group: "אודות",
    type: "textarea",
    defaultValue:
      "'בני ציון' הוקמה להנצחת זכרו של <a href=\"/memorial\">בן ציון חיים הנמן הי\"ד</a> — בחור ישיבה מלא חיים, אוהב תנ\"ך, אשר מסר נפשו בקרב עם מחבלים בשכם. שמו הטהור נושא את שם התנועה עד היום.",
    hint: "HTML מותר — הקישור <a href=\"/memorial\"> מוביל לעמוד ההנצחה",
  },
  {
    key: "copy.about.vision_p4",
    label: "פסקת חזון 4 (הרב יואב)",
    group: "אודות",
    type: "textarea",
    defaultValue: "בראש התכנית עומד <strong>הרב יואב אוריאל</strong>.",
  },
  {
    key: "copy.about.card1_title",
    label: "כרטיס משימה 1 — כותרת",
    group: "אודות",
    type: "text",
    defaultValue: "להנגיש",
  },
  {
    key: "copy.about.card1_desc",
    label: "כרטיס משימה 1 — תיאור",
    group: "אודות",
    type: "textarea",
    defaultValue: "אלפי שיעורים ומאמרים בחינם, זמינים לכל אחד בכל עת",
  },
  {
    key: "copy.about.card2_title",
    label: "כרטיס משימה 2 — כותרת",
    group: "אודות",
    type: "text",
    defaultValue: "להעמיק",
  },
  {
    key: "copy.about.card2_desc",
    label: "כרטיס משימה 2 — תיאור",
    group: "אודות",
    type: "textarea",
    defaultValue: "תוכן ברמה גבוהה מרבני ומורי הדור, המחבר בין פשט לדרש",
  },
  {
    key: "copy.about.card3_title",
    label: "כרטיס משימה 3 — כותרת",
    group: "אודות",
    type: "text",
    defaultValue: "לחבר",
  },
  {
    key: "copy.about.card3_desc",
    label: "כרטיס משימה 3 — תיאור",
    group: "אודות",
    type: "textarea",
    defaultValue: "לבנות קהילה של לומדים שמתחברים לשורשים ולמורשת ישראל",
  },

  // ── תקנון (/terms) — כל סעיף = כותרת + גוף HTML ──
  {
    key: "copy.terms.s1_title",
    label: "תקנון · סעיף 1 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "1. זהות בעל האתר ופרטי קשר",
  },
  {
    key: "copy.terms.s1_body",
    label: "תקנון · סעיף 1 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>האתר <strong>bneyzion.co.il</strong> מופעל על-ידי <strong>עמותת מכלל יופי (ע\"ר)</strong>, מספר עמותה <strong>580731974</strong>. <strong>כתובת בית העסק:</strong> רחוב הרקפת 5, ירושלים, מיקוד 9650515. האתר פועל תחת המותג \"בני ציון — תנועה ללימוד תנ\"ך\", בניהולו של הרב יואב אוריאל.</p><p>לפניות ושאלות: <a href=\"/contact\">דף יצירת קשר</a> · <a href=\"mailto:office@bneyzion.co.il\">office@bneyzion.co.il</a> · <a href=\"tel:+972534706610\">053-470-6610</a></p>",
    hint: "HTML — כתובת ומספרי הקשר אמיתיים",
  },
  {
    key: "copy.terms.s2_title",
    label: "תקנון · סעיף 2 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "2. תיאור השירות",
  },
  {
    key: "copy.terms.s2_body",
    label: "תקנון · סעיף 2 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>האתר מציע מנוי דיגיטלי לגישה לתכני לימוד תנ\"ך — שיעורים מוקלטים, חוברות לימוד, סדרות נושאיות ועוד — ממאות רבנים ומלמדים. התכנים מיועדים לשימוש אישי בלבד.</p><p>בנוסף לתכנים הדיגיטליים, מופעל חנות מוצרים פיזיים בכתובת <a href=\"https://club.bneyzion.co.il\" target=\"_blank\" rel=\"noopener noreferrer\">club.bneyzion.co.il</a> הכפופה לתנאים נפרדים.</p>",
  },
  {
    key: "copy.terms.s3_title",
    label: "תקנון · סעיף 3 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "3. מדיניות תשלום",
  },
  {
    key: "copy.terms.s3_body",
    label: "תקנון · סעיף 3 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<ul><li>התשלום מתבצע דרך מערכת Grow / Meshulam, מאובטחת בתקן PCI-DSS.</li><li>פרטי כרטיס האשראי אינם נשמרים בשרתי האתר בשום שלב.</li><li>מנוי חודשי מחויב בתחילת כל חודש; מנוי שנתי מחויב פעם בשנה.</li><li>הסכום שמוצג בזמן הרכישה הוא הסכום הסופי כולל מע\"מ.</li><li>קבלה תישלח אוטומטית לכתובת הדוא\"ל שסופקה בעת הרכישה.</li></ul>",
  },
  {
    key: "copy.terms.s4_title",
    label: "תקנון · סעיף 4 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "4. מדיניות ביטולים והחזרים",
  },
  {
    key: "copy.terms.s4_body",
    label: "תקנון · סעיף 4 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p><strong>ביטול עסקה — תנאים ונוהל:</strong></p><p>בהתאם לחוק הגנת הצרכן, התשמ\"א-1981 ותקנותיו:</p><ul><li><strong>תכנים דיגיטליים ומנויים:</strong> ניתן לבטל את רכישת המוצר בתוך 14 יום מרגע רכישת המוצר. הביטול יעשה אך ורק בהודעה בכתב לכתובת <a href=\"mailto:office@bneyzion.co.il\">office@bneyzion.co.il</a>, ובלבד שלא נעשה שימוש בתכנים.</li><li><strong>מוצרים פיזיים:</strong> ניתן לבטל את רכישת המוצר בתוך 14 יום מרגע רכישת המוצר. הביטול יעשה אך ורק בהודעה בכתב לכתובת <a href=\"mailto:office@bneyzion.co.il\">office@bneyzion.co.il</a>. יש להחזיר את המוצר באריזתו המקורית, שלם וללא פגיעה ו/או נזק ו/או פגם מכל מין וסוג שהוא. דמי המשלוח בגין ההחזרה יחולו על הרוכש.</li><li>ביטול לאחר 14 יום — לא יינתן החזר על תקופה שחלפה; המנוי יופסק עם תום התקופה ששולמה.</li><li>ההחזר יבוצע לאמצעי התשלום המקורי תוך 14 ימי עסקים.</li></ul>",
  },
  {
    key: "copy.terms.s5_title",
    label: "תקנון · סעיף 5 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "5. הגבלת גיל וכשירות לרכישה",
  },
  {
    key: "copy.terms.s5_body",
    label: "תקנון · סעיף 5 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>אנו דורשים שהרוכש יהיה בן 18 ומעלה. <strong>תנאי לרכישה באתר כי הרוכש הינו בן 18 שנים ומעלה.</strong> ביצוע רכישה או הרשמה לאתר מהווה הצהרת המשתמש כי מלאו לו 18 שנים ומעלה וכי הוא כשיר משפטית לכרות חוזה מחייב. קטין המבצע רכישה ללא אישור הורה או אפוטרופוס אחראי — הרכישה עלולה להתבטל ולהיות מוחזרת.</p>",
  },
  {
    key: "copy.terms.s6_title",
    label: "תקנון · סעיף 6 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "6. מדיניות אספקת מוצרים ושירותים ומסירת תכנים",
  },
  {
    key: "copy.terms.s6_body",
    label: "תקנון · סעיף 6 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p><strong>תכנים דיגיטליים ומנויים:</strong></p><ul><li>גישה לתכנים דיגיטליים (שיעורים מוקלטים, חוברות, הפרק השבועי וכל מנוי דיגיטלי אחר) מופעלת <strong>באופן מיידי</strong> עם אישור התשלום, דרך אזור אישי מאובטח.</li><li>אישור המנוי ישלח לכתובת הדוא\"ל שסופקה בעת הרכישה תוך מספר דקות.</li></ul><p><strong>מוצרים פיזיים (ספרים וחוברות):</strong></p><p>אספקת המוצר בימי עסקים וכרוכה בתשלום דמי משלוח בהתאם לאזור וסוג המשלוח. להלן אפשרויות משלוח:</p><ul><li><strong>דואר רשום:</strong> המשלוח יצא תוך 3 ימי עסקים מאישור ההזמנה; זמן מסירה <strong>דואר רשום תוך 14 ימי עסקים</strong> מיום המשלוח. דמי משלוח כמפורט בשלב הסיום של ההזמנה.</li><li><strong>דואר שליחים:</strong> <strong>דואר שליחים תוך 7 ימי עסקים</strong> מאישור ההזמנה (בתשלום נפרד).</li><li><strong>איסוף עצמי:</strong> ניתן לתיאום מראש עם הצוות דרך דף יצירת קשר.</li><li>האתר לא יישא באחריות לעיכוב ו/או איחור בשילוח שמבוצע ע\"י צד ג' אשר מושפע מכוח עליון ו/או שביתות ו/או השבתות ו/או אי-מענה מצד הלקוח לתיאום המשלוח.</li></ul>",
  },
  {
    key: "copy.terms.s7_title",
    label: "תקנון · סעיף 7 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "7. אחריות המוצר והגבלת אחריות",
  },
  {
    key: "copy.terms.s7_body",
    label: "תקנון · סעיף 7 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>החברה ו/או מי מטעמה לא יהיו אחראים לנזק ישיר ו/או עקיף שיגרם כתוצאה משימוש בשירות ו/או שימוש במוצר שנרכש באתר, לרבות נזק עקיף, נזק תוצאתי, אובדן הכנסה או אובדן נתונים. התוכן באתר אינו מהווה חוות דעת מקצועית. כל תוכן או מידע שיימסר באתר אינו מהווה ייעוץ מקצועי, המלצה או חוות דעת. האחריות על השימוש במידע היא על המשתמש בלבד.</p><p><strong>מוצרים פיזיים (ספרים וחוברות):</strong></p><ul><li><strong>מוצר פגום / שגוי:</strong> ניתן להחזיר תוך <strong>14 ימי עסקים</strong> מיום קבלת המשלוח ולקבל החלפה או החזר מלא, ללא עלות משלוח.</li><li><strong>החלפה בשל שינוי דעה:</strong> ניתן להחזיר מוצר שלם ולא-פגום תוך 14 יום מקבלתו; דמי המשלוח בגין ההחזרה יחולו על הרוכש.</li><li>לפניות בנושא אחריות: <a href=\"/contact\">דף יצירת קשר</a> או <a href=\"mailto:office@bneyzion.co.il\">office@bneyzion.co.il</a>.</li></ul>",
  },
  {
    key: "copy.terms.s8_title",
    label: "תקנון · סעיף 8 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "8. שימוש בתכנים וזכויות יוצרים",
  },
  {
    key: "copy.terms.s8_body",
    label: "תקנון · סעיף 8 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<ul><li>כל התכנים באתר — שיעורים, חוברות, תמלולים — הם רכוש תנועת בני ציון ו/או מרצאיהם ושמורות להם כל הזכויות.</li><li>הגישה לתכנים מוענקת למנוי לשימוש אישי בלבד.</li><li>אסור להוריד, להפיץ, לשתף, להקליט, לשדר מחדש, למכור או לעשות שימוש מסחרי כלשהו בתכנים.</li><li>הפרת הסעיף תגרור ביטול המנוי מיידי ועלולה להקים עילה משפטית.</li></ul>",
  },
  {
    key: "copy.terms.s9_title",
    label: "תקנון · סעיף 9 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "9. מדיניות פרטיות",
  },
  {
    key: "copy.terms.s9_body",
    label: "תקנון · סעיף 9 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p><a href=\"/privacy-policy\">מדיניות הפרטיות המלאה</a> זמינה גם בכתובת /privacy-policy. החנות נוקטת באמצעי זהירות מקובלים כדי לשמור, ככל האפשר, על סודיות המידע. החנות מתחייבת לא לעשות שימוש בפרטי הלקוחות הרשומים באתר אלא לצרכי תפעול האתר בלבד, וכדי לאפשר את ביצוע הרכישה.</p><p><strong>מידע שאנו אוספים:</strong></p><ul><li>שם מלא, כתובת דוא\"ל, מספר טלפון — שנמסרו בעת ההרשמה או הרכישה.</li><li>היסטוריית צפייה ורכישות — לצורך מתן השירות ושיפורו.</li><li>כתובת IP ונתוני דפדפן — לצורכי אבטחה וניתוח תעבורה.</li></ul><p><strong>שימוש במידע:</strong></p><ul><li>הפעלת השירות — אימות זהות, שליחת קבלות, תמיכה טכנית.</li><li>שיפור חוויית המשתמש ופיתוח תכנים חדשים.</li><li>משלוח עדכונים רלוונטיים (ניתן לביטול בכל עת).</li></ul><p><strong>העברת מידע לצד שלישי:</strong></p><ul><li>מידע על תשלום מועבר לחברת Grow / Meshulam לצורך עיבוד התשלום בלבד.</li><li>נשמר שם מלא, דוא\"ל וטלפון לצורך שליחת קבלות (Paperless).</li><li>המידע אינו נמכר או מועבר לצד שלישי לצורכי פרסום.</li></ul><p><strong>זכויות המשתמש:</strong></p><ul><li>ניתן לבקש עיון, תיקון או מחיקת המידע האישי בכל עת.</li><li>לפניות בנושאי פרטיות: <a href=\"/contact\">דף יצירת קשר</a> או בדוא\"ל.</li></ul>",
  },
  {
    key: "copy.terms.s10_title",
    label: "תקנון · סעיף 10 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "10. שינויים בתקנון",
  },
  {
    key: "copy.terms.s10_body",
    label: "תקנון · סעיף 10 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>עמותת מכלל יופי (ע\"ר) שומרת לעצמה את הזכות לעדכן תקנון זה בהתאם לשינויים בשירות או בדרישות החוק. שינויים מהותיים יפורסמו באתר ויישלח עדכון למנויים פעילים לפחות 30 יום לפני כניסתם לתוקף. המשך שימוש בשירות לאחר מועד זה מהווה הסכמה לתנאים המעודכנים.</p>",
  },
  {
    key: "copy.terms.s11_title",
    label: "תקנון · סעיף 11 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "11. ברירת דין וסמכות שיפוט",
  },
  {
    key: "copy.terms.s11_body",
    label: "תקנון · סעיף 11 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>תקנון זה כפוף לדין הישראלי. כל מחלוקת הנוגעת לשירות תידון בבית המשפט המוסמך בירושלים, ישראל, בלעדית.</p>",
  },

  // ── מדיניות פרטיות (/privacy-policy) ──
  {
    key: "copy.privacy.s1_title",
    label: "פרטיות · סעיף 1 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "1. כללי",
  },
  {
    key: "copy.privacy.s1_body",
    label: "פרטיות · סעיף 1 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>מדיניות פרטיות זו חלה על האתר <strong>bneyzion.co.il</strong>, המופעל על-ידי <strong>עמותת מכלל יופי (ע\"ר)</strong>, מספר עמותה <strong>580731974</strong>, רחוב הרקפת 5, ירושלים. המדיניות מתארת אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, ומהן זכויותיך כמשתמש.</p>",
  },
  {
    key: "copy.privacy.s2_title",
    label: "פרטיות · סעיף 2 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "2. איזה מידע אנו אוספים",
  },
  {
    key: "copy.privacy.s2_body",
    label: "פרטיות · סעיף 2 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<ul><li>שם מלא, כתובת דוא\"ל ומספר טלפון — שנמסרו בעת הרשמה, רכישה או פנייה.</li><li>היסטוריית צפייה, מעקב התקדמות ותכנים שנרכשו — לצורך מתן השירות ושיפורו.</li><li>כתובת IP, סוג דפדפן ונתוני מכשיר — לצורכי אבטחה, מניעת הונאות וניתוח תעבורה.</li><li>פרטי תשלום — מעובדים ונשמרים אצל ספק הסליקה בלבד (ראו סעיף 5), לא בשרתי האתר.</li></ul>",
  },
  {
    key: "copy.privacy.s3_title",
    label: "פרטיות · סעיף 3 (עוגיות) — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "3. עוגיות (Cookies)",
    hint: "הגוף של סעיף זה נשאר קבוע (כולל כפתור עדכון העדפות עוגיות)",
  },
  {
    key: "copy.privacy.s4_title",
    label: "פרטיות · סעיף 4 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "4. כיצד אנו משתמשים במידע",
  },
  {
    key: "copy.privacy.s4_body",
    label: "פרטיות · סעיף 4 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<ul><li>הפעלת השירות — אימות זהות, מתן גישה לתכנים, שליחת קבלות ותמיכה טכנית.</li><li>שיפור חוויית המשתמש ופיתוח תכנים חדשים.</li><li>משלוח עדכונים רלוונטיים (ניתן לביטול בכל עת בלחיצה על \"הסרה\" בתחתית כל מייל).</li><li>מדידת ביצועי קמפיינים שיווקיים — בכפוף להסכמתך לעוגיות שיווקיות (סעיף 3).</li></ul>",
  },
  {
    key: "copy.privacy.s5_title",
    label: "פרטיות · סעיף 5 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "5. שיתוף מידע עם צדדים שלישיים",
  },
  {
    key: "copy.privacy.s5_body",
    label: "פרטיות · סעיף 5 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>איננו מוכרים את המידע האישי שלך. אנו משתפים מידע מוגבל עם ספקים הפועלים בשמנו, בהיקף הנדרש לתפעול השירות בלבד:</p><ul><li><strong>Grow / Meshulam</strong> — לצורך עיבוד תשלומים וסליקת כרטיסי אשראי (מאובטח בתקן PCI-DSS). פרטי הכרטיס אינם נשמרים בשרתי האתר.</li><li><strong>Meta (פייסבוק/אינסטגרם)</strong> — פיקסל מדידת המרות, נטען אך ורק בהסכמתך לעוגיות שיווקיות.</li><li><strong>Paperless</strong> — לצורך הפקת חשבוניות/קבלות (שם מלא, דוא\"ל, טלפון).</li><li><strong>Smoove</strong> — לצורך משלוח דיוור ועדכונים במייל, בכפוף לזכותך להסרה בכל עת.</li></ul>",
  },
  {
    key: "copy.privacy.s6_title",
    label: "פרטיות · סעיף 6 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "6. אבטחת מידע",
  },
  {
    key: "copy.privacy.s6_body",
    label: "פרטיות · סעיף 6 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>אנו נוקטים באמצעי אבטחה מקובלים (הצפנת תעבורה, בקרת גישה) כדי להגן על המידע האישי שלך, אך אין באפשרותנו להבטיח הגנה מוחלטת מפני כל שימוש לרעה, ככל שירותי אינטרנט אחרים.</p>",
  },
  {
    key: "copy.privacy.s7_title",
    label: "פרטיות · סעיף 7 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "7. זכויות המשתמש",
  },
  {
    key: "copy.privacy.s7_body",
    label: "פרטיות · סעיף 7 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<ul><li>ניתן לבקש עיון, תיקון או מחיקת המידע האישי שלך בכל עת.</li><li>ניתן להסיר את עצמך מרשימות תפוצה בלחיצה אחת בתחתית כל מייל.</li><li>ניתן לעדכן את בחירת העוגיות בכל עת (סעיף 3).</li><li>לכל פנייה בנושאי פרטיות: <a href=\"/contact\">דף יצירת קשר</a> או <a href=\"mailto:office@bneyzion.co.il\">office@bneyzion.co.il</a>.</li></ul>",
  },
  {
    key: "copy.privacy.s8_title",
    label: "פרטיות · סעיף 8 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "8. שינויים במדיניות",
  },
  {
    key: "copy.privacy.s8_body",
    label: "פרטיות · סעיף 8 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>עמותת מכלל יופי (ע\"ר) שומרת לעצמה את הזכות לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר. המשך שימוש בשירות לאחר עדכון המדיניות מהווה הסכמה לתנאים המעודכנים.</p>",
  },

  // ── הצהרת נגישות (/accessibility) ──
  {
    key: "copy.accessibility.s1_title",
    label: "נגישות · סעיף 1 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "1. התחייבותנו לנגישות",
  },
  {
    key: "copy.accessibility.s1_body",
    label: "נגישות · סעיף 1 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>תנועת בני ציון רואה חשיבות רבה במתן שירות שוויוני ונגיש לכלל הציבור, לרבות אנשים עם מוגבלות. אנו פועלים להנגשת האתר כך שיהיה שמיש ככל האפשר עבור כל משתמש, ללא תלות ביכולת הראייה, השמיעה, התנועה או הקוגניציה שלו.</p>",
  },
  {
    key: "copy.accessibility.s2_title",
    label: "נגישות · סעיף 2 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "2. רמת ההתאמה",
  },
  {
    key: "copy.accessibility.s2_body",
    label: "נגישות · סעיף 2 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>האתר תוכנן ונבנה מתוך שאיפה לעמידה בדרישות תקן הנגישות הישראלי <strong>ת\"י 5568</strong> (המבוסס על הנחיות WCAG 2.1 ברמה <strong>AA</strong>), ובהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע\"ג-2013.</p><p>הנגשת האתר היא תהליך מתמשך. אנו ממשיכים לבדוק ולשפר את הנגישות באופן שוטף, ואיננו טוענים להתאמה מלאה בכל עת ובכל עמוד.</p>",
  },
  {
    key: "copy.accessibility.s3_title",
    label: "נגישות · סעיף 3 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "3. אמצעי נגישות שיושמו באתר",
  },
  {
    key: "copy.accessibility.s3_body",
    label: "נגישות · סעיף 3 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<ul><li>מבנה דף סמנטי (כותרות, אזורים, ניווט) המותאם לקוראי מסך.</li><li>אפשרות דילוג ישיר לתוכן הראשי באמצעות מקלדת (\"דלג לתוכן הראשי\").</li><li>ניווט מלא במקלדת בכל הרכיבים האינטראקטיביים (תפריטים, טפסים, חלונות קופצים).</li><li>טקסט חלופי (alt) לתמונות משמעותיות.</li><li>ניגודיות צבעים נבדקת מול רקע, לפי יחסי ניגודיות מומלצים.</li><li>תמיכה מלאה בכיווניות מימין-לשמאל (RTL) התואמת את שפת התוכן.</li><li>תיוג נגיש (aria) לכפתורים, חלונות מודאליים ואזורי הודעה דינאמיים.</li></ul>",
  },
  {
    key: "copy.accessibility.s4_title",
    label: "נגישות · סעיף 4 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "4. מגבלות ידועות",
  },
  {
    key: "copy.accessibility.s4_body",
    label: "נגישות · סעיף 4 — גוף",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>ייתכן שחלקים מסוימים באתר — בעיקר תכני וידאו/שמע ישנים שהועלו במסגרת תהליך המרה מאתר קודם — עדיין אינם כוללים כתוביות או תמלול מלא. אנו פועלים להשלים הנגשה זו בהדרגה. נתקלתם ברכיב שאינו נגיש? נשמח שתדווחו לנו כמפורט מטה.</p>",
  },
  {
    key: "copy.accessibility.s5_title",
    label: "נגישות · סעיף 5 — כותרת",
    group: "תקנון ומדיניות",
    type: "text",
    defaultValue: "5. פנייה בנושאי נגישות",
  },
  {
    key: "copy.accessibility.s5_body",
    label: "נגישות · סעיף 5 — גוף (כולל פרטי רכז הנגישות)",
    group: "תקנון ומדיניות",
    type: "textarea",
    defaultValue:
      "<p>נתקלתם בבעיית נגישות באתר, או שיש לכם הצעה לשיפור? נשמח שתפנו אלינו ונטפל בפנייה בהקדם האפשרי:</p><ul><li>דוא\"ל רכז הנגישות: <a href=\"mailto:office@bneyzion.co.il\">office@bneyzion.co.il</a></li><li>טלפון: <a href=\"tel:+972527368607\">052-736-8607</a></li><li>או דרך <a href=\"/contact\">דף יצירת הקשר</a>, תוך ציון \"פניית נגישות\" בנושא ההודעה.</li></ul>",
    hint: "כולל דוא\"ל וטלפון רכז הנגישות — פרטי קשר אמיתיים, לשמור",
  },

  // ── צור קשר (/contact) ──
  {
    key: "copy.contact.title",
    label: "כותרת עמוד צור קשר",
    group: "צור קשר",
    type: "text",
    defaultValue: "צרו קשר",
  },
  {
    key: "copy.contact.subtitle",
    label: "תת-כותרת עמוד צור קשר",
    group: "צור קשר",
    type: "text",
    defaultValue: "נשמח לשמוע מכם — שאלות, הצעות, או סתם מילה טובה",
  },

  // ── פוטר (DesignFooter) ──
  {
    key: "copy.footer.description",
    label: "תיאור המותג בפוטר",
    group: "פוטר",
    type: "textarea",
    defaultValue: "אתר התנ״ך הגדול בישראל — שיעורים, סדרות, ופרשנות מ-200+ רבנים, בגישה חופשית.",
    hint: "מתחת ללוגו בעמודת המותג בפוטר",
  },
  {
    key: "copy.footer.memorial_label",
    label: "שורת 'לעילוי נשמת' בפוטר",
    group: "פוטר",
    type: "text",
    defaultValue: "לעילוי נשמת",
  },
  {
    key: "copy.footer.copyright",
    label: "שורת זכויות יוצרים בפוטר",
    group: "פוטר",
    type: "text",
    defaultValue: "בני ציון — כל הזכויות שמורות",
    hint: "מופיעה אחרי © והשנה בתחתית הפוטר",
  },

  // ── שגיאות (404 / NotFound) ──
  {
    key: "copy.notfound.title",
    label: "כותרת עמוד 404",
    group: "שגיאות",
    type: "text",
    defaultValue: "הדף לא נמצא",
  },
  {
    key: "copy.notfound.message",
    label: "הודעת עמוד 404 (שורה 1)",
    group: "שגיאות",
    type: "text",
    defaultValue: "אולי הדף הזה עדיין לא נכתב...",
  },

  // ── שאל את הרב (/ask-rabbi) ──
  {
    key: "copy.ask_rabbi.intro",
    label: "פסקת פתיחה בטופס השאלה",
    group: "שאל את הרב",
    type: "textarea",
    defaultValue: "כל שאלה בתנ״ך, באמונה או בלימוד מתקבלת בשמחה. התשובות מתפרסמות כאן בעמוד.",
  },
  {
    key: "copy.ask_rabbi.success",
    label: "הודעת הצלחה אחרי שליחת שאלה",
    group: "שאל את הרב",
    type: "textarea",
    defaultValue: "הרב עובר על השאלות ועונה אישית. נפרסם תשובה בקרוב כאן בעמוד",
    hint: "מוצגת אחרי שליחה מוצלחת; המערכת מוסיפה בסוף הערה על עותק למייל",
  },
];

export const COPY_GROUPS = [...new Set(SITE_COPY_REGISTRY.map((f) => f.group))];

/**
 * מפת key → defaultValue. משמשת עמודים עם גופי-טקסט ארוכים (תקנון/פרטיות/נגישות)
 * כדי להעביר את ה-fallback ל-useSiteCopy בלי לשכפל את המחרוזת הארוכה בקוד ה-JSX —
 * מקור-אמת יחיד. `copyDefault(key)` = בדיוק ה-defaultValue המקודד ⇒ אפס שינוי
 * ויזואלי כל עוד אין override ב-DB.
 */
const COPY_DEFAULTS = new Map(SITE_COPY_REGISTRY.map((f) => [f.key, f.defaultValue]));
export function copyDefault(key: string): string {
  return COPY_DEFAULTS.get(key) ?? "";
}
