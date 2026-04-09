import { sanitizeHtml } from "@/lib/sanitize";
import { useState } from "react";
import { Play, MessageCircle, ExternalLink, BookOpen, ChevronDown, ChevronUp, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/layout/Layout";
import { useSEO } from "@/hooks/useSEO";
import kenesHeroBg from "@/assets/hero-bg-bney-zion.jpg";
import watercolorBook from "@/assets/watercolor-book.png";
import kriatKivunBanner from "@/assets/kriat-kivun-banner.png";

interface Recording {
  name: string;
  videoUrl: string;
  duration: string;
  summary?: string;
}

const recordings: Recording[] = [
  { name: "הרב לונדין", duration: "12:45", videoUrl: "https://drive.google.com/file/d/1xidJwu1GeORZ5xw8X2Xjo6_y0d8lwsIX/view", summary: `<h3 style="font-size:1.1em;font-weight:bold;margin-bottom:8px;">הרב חגי לונדין</h3><p style="color:hsl(30 30% 45%);margin-bottom:12px;font-style:italic;">ערב חג פורים תשפ״ו – מגילת אסתר ומציאות ימינו</p><p style="margin-bottom:10px;">אשתי אמרה לי דבר נכון מאוד: בדרך כלל אנחנו אומרים שקוראים ״מגילת סתר״ – להבין כיצד הקדוש ברוך הוא מנהל את הדברים בצורה מסותרת. השנה היא אמרה לי: ״הקדוש ברוך הוא שכח שזה בסתר, ועשה את זה בגלוי.״ פשוט תלמדו מגילת אסתר ותראו מה שאתם שומעים בחדשות – ממש מילה במילה.</p><h4 style="font-weight:bold;margin:14px 0 6px;">המאבק עם אותה ישות פרסית</h4><p style="margin-bottom:10px;">אנחנו ניצבים מול אותה ישות פרסית מלפני 2,300 שנה. מבחינה גנטית, העם הפרסי הוא המשך ישיר של עם פרס מימי אחשוורוש והמן – אותו חבל ארץ, אותה אובססיה: ״להשמיד, להרוג ולאבד את כל היהודים.״</p><p style="margin-bottom:10px;">המהר״ל בספר אור חדש מביא את ארבע המלכויות שעם ישראל מתמודד מולן. מלכות פרס היא הכוח הנאבק על הגוף – המאבק הפיזי נגד עם ישראל. המהר״ל מציין דבר מדהים: כשישמעאל מצטרף לפרס, נוצרת מפלצת חדשה. וזה בדיוק מה שאנחנו רואים בדורנו.</p><h4 style="font-weight:bold;margin:14px 0 6px;">מרדכי – מונח וזרקה</h4><p style="margin-bottom:10px;">כל הסיפור של מגילת אסתר התרחש לאורך 9 עד 13 שנים. תחשבו על היהודים שמשך שנים ארוכות חשו כיצד טבעת החנק מתהדקת סביב צווארם.</p><p style="margin-bottom:10px;">מרדכי ואסתר פעלו במשך כל השנים הללו להכין את הקרקע. מרדכי היה מראשי הסנהדרין. אסתר פעלה כסוכנת שנשתלה בבית אחשוורוש. ומרדכי עצמו בנה מערכת חינוך – לימד תינוקות של בית רבן.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״אִם-הַחֲרֵשׁ תַּחֲרִישִׁי בָּעֵת הַזֹּאת, רֶוַח וְהַצָּלָה יַעֲמוֹד לַיְּהוּדִים מִמָּקוֹם אַחֵר, וְאַתְּ וּבֵית-אָבִיךְ תֹּאבֵדוּ; וּמִי יוֹדֵעַ אִם-לְעֵת כָּזֹאת הִגַּעַתְּ לַמַּלְכוּת״ (אסתר ד׳, יד)</p><p style="margin-bottom:10px;">המילים ״החרש תחרישי״ מוטעמות בטעמים: מונח-זרקה. הרב קוק מסביר: <strong>מונח זה אגירת כוח</strong> – אדם שנמצא במנוחה אוגר כוח. <strong>וזרקה כמו מזרק</strong> – כלי דחוס שהנוזל נאגר בתוכו, ובהגיע הרגע מזריקים.</p><h4 style="font-weight:bold;margin:14px 0 6px;">הדבר הזה מתרחש לנגד עינינו</h4><p style="margin-bottom:10px;">המשטר האיראני – 47 שנה, מ-1979 עד 2026 – כל כולו התרכז בהשמדת ישראל. מדינה עם 90 מיליון בני אדם, משאבי נפט, יכולת לחיות בשלום – בחרה להפוך את השמדת ישראל לאובססיה חולנית.</p><p style="margin-bottom:10px;">במשך עשרות שנים טוו את טבעת החנק סביב מדינת ישראל. אלפי, ואולי עשרות אלפי יהודים הכינו את עצמם – במסירות נפש, בשנים של עבודה מודיעינית וביטחונית – לרגע הזה.</p><h4 style="font-weight:bold;margin:14px 0 6px;">בפורים תשפ״ו</h4><p style="margin-bottom:10px;">אנחנו נמצאים לעיתים בתחושה שהמציאות מתנהלת בתחינות, במשגיאות, בפוליטיקאים. אבל יש רגעים – ואני חושב שהרגע הזה הוא אחד מהם – שבהם אנחנו רואים באופן גדול כיצד יד ה׳ מנהלת את המציאות.</p><p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">״לַיְּהוּדִים הָיְתָה אוֹרָה וְשִׂמְחָה וְשָׂשֹׂן וִיקָר״ (אסתר ח׳, טז)<br/><br/>השנה, יותר מכל שנה אחרת, נקרא את מגילת אסתר בשמחה ובששון – בימים ההם, בזמן הזה.</p>` },
  { name: "הרב יואב אוריאל", duration: "18:30", videoUrl: "https://drive.google.com/file/d/1BrmZyfiIecgayz2IKQ08qLIXceHYZy4a/view", summary: `<h3 style="font-size:1.1em;margin-bottom:8px;">הרב יואב אוריאל</h3><p style="color:hsl(30 30% 45%);margin-bottom:12px;font-style:italic;">הודאה ותפילה – על קצב הגאולה</p><p style="margin-bottom:10px;">התלבטנו על שם הכנס וקראנו לו ״הודאה ותפילה״. אנחנו על הציר הזה – לפני פורים, במבוא לפסח, ותוך כדי זה עדיין קשיים וצרות. הרגשנו שהכלי הטוב ביותר לעיכול, לצמיחה ולגדילה הוא פשוט להתכנס ביחד לתורה. ״לך כנוס את כל היהודים״ – וגם בתפילה, ולא פחות מזה בהודאה.</p><h4 style="margin:14px 0 6px;">איפה רואים את יד ה׳ במגילה?</h4><p style="margin-bottom:10px;">המהר״ל בפירושו אור חדש שואל: איפה הרגע שבו אתה רואה באופן מובהק את יד ה׳ במגילה? הרי הכל מתרחש בהדרגה.</p><p style="margin-bottom:10px;">ועונה המהר״ל: רואים את יד ה׳ בקפיצות. חז״ל מדמים את אסתר לאיילת השחר – שאמנם הולכת בהדרגה, אבל יש לה קפיצות.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״שלא תחשוב כי לא הייתה הגאולה הזאת בנס כמו שאר הגאולות, שהרי לא תמצא בגאולה הזאת נס נגלי כלל״</p><p style="margin-bottom:10px;">אומר המהר״ל: לפעמים יד ה׳ ״הציץ מבין החרכים״ – בקפיצות. גאולה של קימה-קימה, בלי משה רבנו עם ענני הכבוד. אבל מה יש? יש פתאום התפרצויות שאף מומחה לא היה מאמין להן.</p><p style="margin-bottom:10px;">ומסיים המהר״ל: <strong>״ה׳ יתברך קופץ כאיל... לכן לא נעשה המגילה הזאת בזמן נמשך״</strong> – יש נקודה שבה הנס קורה במהירות ובקפיצה. ״וַיֹּאמֶר הַמֶּלֶךְ מַהֲרוּ אֶת-הָמָן״ – הכל נעשה במהירות גדולה.</p><p style="margin-bottom:10px;">וכמה זמן לקח מגזירת המן עד שהוא תלוי על עץ? <strong>שלושה ימים</strong>. מי״ג ניסן נגזרה הגזירה, עם ישראל כולו התפלל וצם – ומט״ו ניסן הכל נהפך.</p><h4 style="margin:14px 0 6px;">מהר או לאט – סתירה בפסוקים</h4><p style="margin-bottom:10px;">בדברים פרק ט׳ נאמר: ״וְהוֹרַשְׁתָּם וְאִבַּדְתָּם <strong>מַהֵר</strong>״. אבל בפרק ז׳ נאמר: ״מְעַט מְעָט, <strong>לֹא תוּכַל כַּלֹּתָם מַהֵר</strong>״. אז מהר או לאט?</p><p style="margin-bottom:10px;">התשובה: גם וגם. ה׳ מצידו מוביל בשני קצבים. את יד ה׳ רואים בהתפרצויות – בתרחיש הבלתי סביר שפתאום מתממש.</p><p style="margin-bottom:10px;">אבל מדוע יש גם קצב של ״מעט מעט״? מפני שעם ישראל הוא זה שצריך את ההדרגה. אנחנו צריכים לגדול לתוך הגאולה.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">הזוהר: משל לאדם שהיה בחושך זמן רב – כאשר רוצים להאיר לו, מאירים תחילה אור קטן כחור המחט, ואחר כך אור גדול ממנו, וכך עד שהוא רואה את האור המלא.</p><h4 style="margin:14px 0 6px;">הפאזל מסתדר</h4><p style="margin-bottom:10px;">כשאנחנו ראויים – פתאום הפאזל מסתדר. הכוכבים לטובתנו. מי האמין שנעשה דבר כזה והעולם בגדול יאמר: ״בסדר, אתם מובילים״?</p><p style="margin-bottom:10px;">אחרי שהתכוננו, אחרי שגם לצערנו חטפנו וסבלנו – עם ישראל גדל. וכשעם ישראל גדל, אתה עולה לאט לאט לקומה שאתה יכול.</p><h4 style="margin:14px 0 6px;">סיכום</h4><p style="margin-bottom:10px;">לראות את ההתפרצויות. לשים לב לניסים, גם כשהם לא גלויים כמו בימי משה רבנו. יש ניסים גלויים – גלויים בזה שקורה משהו פעם אחר פעם, כשאנחנו מגיעים ומעיזים.</p><p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">זאת הודאה. זאת תפילה. ואפילו תביעה מעצמנו – תוסיפו אומץ, תוסיפו תפילות, תוסיפו מעשים טובים. ה׳ מבחינתו מוכן. הכל תלוי בכמה אנחנו גדלים.<br/><br/>ועם ישראל, מאז תחילת המלחמה הזאת – גדל, התעצם, התאחד. צבא אמיץ. זו יד ה׳, חסד לכולנו ולכל עם ישראל.</p>` },
  { name: "הרב שמואל אליהו", duration: "22:15", videoUrl: "https://drive.google.com/file/d/1aSNrQBTY3CD_2EMPwkVWfmLIR1VPavdS/view", summary: `<h3 style="font-size:1.1em;margin-bottom:8px;">הרב שמואל אליהו</h3><p style="color:hsl(30 30% 45%);margin-bottom:12px;font-style:italic;">נבואת דניאל ומלכויות הרשע</p><p style="margin-bottom:10px;">אחד הדברים שממש אוחז אותי הוא נבואת דניאל המופיעה בחלום המופלא – דניאל פרק ב׳. נבוכדנצר חולם חלום שאפילו אינו זוכר אותו, ודניאל פותר לו את החלום.</p><p style="margin-bottom:10px;">כולנו מכירים את החלום: הצלם המחולק לארבע מלכויות. אבל בסוף החלום מגיעה אבן שמרסקת את הצלם – לא רק את המלכות הרביעית, אלא את כולן. והאבן הזאת – היא עם ישראל – הופכת ל<strong>״טוּר רַב״</strong> וממלאת את כל הארץ.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״בֵּאדַיִן דָּקוּ כַחֲדָה פַּרְזְלָא חֲסַפָּא נְחָשָׁא כַּסְפָּא וְדַהֲבָא, וַהֲווֹ כְּעוּר מִן-אִדְּרֵי קַיִט, וּנְשָׂא הִמּוֹן רוּחָא וְכָל-אֲתַר לָא-הִשְׁתְּכַח לְהוֹן״ (דניאל ב׳, לה)</p><p style="margin-bottom:10px;">הם נהיים כמוץ של תבן, הרוח לוקחת אותם ואי אפשר למצוא אותם בשום מקום. לא מדובר רק על פרס בלבד – מדובר על מלכות בעלת השפעה עולמית.</p><h4 style="margin:14px 0 6px;">ראש הנחש</h4><p style="margin-bottom:10px;">כולם אומרים שפרס היא ראש הנחש. גם עכשיו לאיראן יש השפעה עולמית – החמאס והחזבאללה הם רק שלוחות קטנות של הרשע הגדול.</p><p style="margin-bottom:10px;">שמעתי מהרב רבינוביץ׳ ראש ישיבת מעלה אדומים: מי שהיה בשואה מבין מה זה ״לא יכרע ולא ישתחווה.״ <strong>הדרך של המן להשמיד את היהודים היא קודם כל לשבור את רוחם</strong>. לרסק אותם. ואחרי שהם נשברים – אז הוא יכול לעשות מה שהוא רוצה.</p><p style="margin-bottom:10px;">ומרדכי עמד כצוק איתן. ובסוף – ״רָצוּי לְרֹב אֶחָיו״ (אסתר י׳, ג), רק לרוב אחיו. גם אז היו כאלה.</p><h4 style="margin:14px 0 6px;">בימינו – עם שלם לא יכרע</h4><p style="margin-bottom:10px;">אבל בימינו זה לא רק המנהיג שחזק. <strong>העם כולו לא יכרע ולא ישתחווה</strong>. במשך שנתיים וחצי מאז שמחת תורה, עם ישראל ממש – חוט שדרה של עוצמה.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״וְנִקְהֲלוּ הַיְּהוּדִים... לַעֲמֹד עַל-נַפְשָׁם״ (אסתר ט׳, טז) – מכת חרב ועבדן – חתיכת מכה. לא מכה יוצאת ידי חובה.</p><h4 style="margin:14px 0 6px;">מלכויות שנעלמות</h4><p style="margin-bottom:10px;">כשמסתכלים בעיניים של נבואת דניאל – מלכויות הרשע מתרסקות ולא נשאר מהן זכר. מלכות אשור – מי מכיר אותה? מלכות פרעה – אם לא הפירמידות, אף אחד לא היה זוכר. <strong>ההשפעה היחידה שתישאר תהיה של עם ישראל</strong>.</p><h4 style="margin:14px 0 6px;">היום שאחרי</h4><p style="margin-bottom:10px;">תמיד צריך לחשוב: מה יקרה ביום שאחרי המלחמה? הניצחון הצבאי אמור להחזיר אותנו לתפקידנו העולמי – ״וְנִבְרְכוּ בְךָ כֹּל מִשְׁפְּחֹת הָאֲדָמָה״ (בראשית י״ב, ג).</p><p style="margin-bottom:10px;">לא אימפריה מנצלת, אלא כמו שלמה המלך – אימפריה שמשפיעה ברכה לעולם.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״וְנָתַתִּיךָ לְאוֹר גּוֹיִם לִהְיוֹת יְשׁוּעָתִי עַד-קְצֵה הָאָרֶץ״ (ישעיהו מ״ט, ו)<br/>״לֹא-יִשָּׂא גוֹי אֶל-גּוֹי חֶרֶב וְלֹא-יִלְמְדוּ עוֹד מִלְחָמָה״ (ישעיהו ב׳, ד)</p><h4 style="margin:14px 0 6px;">סיכום</h4><p style="margin-bottom:10px;">מי שלומד תנ״ך יודע שכל הנבואות מתכנסות למקום הזה – עם ישראל הופך להיות מגדלור אורו של עולם.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״אֲשֶׁר יַחֲזִיקוּ עֲשָׂרָה אֲנָשִׁים מִכֹּל לְשֹׁנוֹת הַגּוֹיִם, וְהֶחֱזִיקוּ בִּכְנַף אִישׁ יְהוּדִי לֵאמֹר נֵלְכָה עִמָּכֶם״ (זכריה ח׳, כג)</p><p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">״וְעָלוּ מוֹשִׁיעִים בְּהַר צִיּוֹן לִשְׁפֹּט אֶת-הַר עֵשָׂו, וְהָיְתָה לַה׳ הַמְּלוּכָה״ (עובדיה א׳, כא)<br/><br/>יראו עינינו וישמח ליבנו. אמן ואמן.</p>` },
  { name: "הרב חנני", duration: "15:20", videoUrl: "https://drive.google.com/file/d/1l8By1tJmtQPzvyX76Hh4mipd2p5tMff_/view", summary: `<h3 style="font-size:1.1em;margin-bottom:8px;">הרב חננאל אתרוג</h3><p style="color:hsl(30 30% 45%);margin-bottom:12px;font-style:italic;">מגילת אסתר – מגלה את ההסתר</p><p style="margin-bottom:10px;">אנחנו באמת בימים גדולים ומשמעותיים מאוד. בשבת קראנו פרשת זכור – ובצמרמורת גדולה עברה בלב של כולנו. איך הפסוקים העתיקים האלה הם הדברים הכי חיים, הכי חדים, הכי מדהימים.</p><h4 style="margin:14px 0 6px;">שכבות שאנחנו לא מבינים</h4><p style="margin-bottom:10px;">כשקוראים את המגילה בפעם הראשונה – לא מבינים כלום. כל מיני סיפורים שנראים לא מעניינים. ובסוף מתברר – <strong>איך הכל אלוקי. איך הקדוש ברוך הוא מקדים תרופה למכה.</strong></p><p style="margin-bottom:10px;">שאלו תלמידיו של רשב״י: ״מפני מה נתחייבו שונאיהם של ישראל שבאותו הדור כליה?״ הם – גדולי קדושי התנאים, שכל הגנזים חשופים להם – ובכל זאת לא ידעו מדוע.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״הפסיכולוגיה המודרנית לימדה אותנו שיש מודע ותת-מודע. אבל חז״ל והתורה הקדושה מלמדים אותנו שיש אינסוף שכבות – גבוה מעל גבוה.״</p><p style="margin-bottom:10px;">בכל תהליך שה׳ עושה לנו יש עצה אלוקית שמעבר לתבונתנו. גם דברים כואבים וקשים – גם זה חלק מן התכנון האלוקי.</p><h4 style="margin:14px 0 6px;">מגילת אסתר – פותרת בעיה אחרת לגמרי</h4><p style="margin-bottom:10px;">הגמרא אומרת: ״הדר קיבלוה בימי אחשוורוש״ – מדרגה חדשה של מעמד הר סיני. ימי אסתר הם בעצם <strong>השלמת מתן תורה</strong>. מפגש אחר לגמרי עם הקדוש ברוך הוא.</p><p style="margin-bottom:10px;">המן לא קשור להמן בלבד. המן הוא שכבה מסוכנת מאוד שחייבים לטפל בה – אבל <strong>המדרגה החדשה של מתן תורה, זה הדבר העיקרי שמתחולל במגילה</strong>.</p><h4 style="margin:14px 0 6px;">מגילת אסתר מלמדת: יש בורא ויש מנהיג</h4><p style="margin-bottom:10px;">מגילת אסתר מלמדת אותנו שאנחנו מושגחים כל הזמן, גם כשאנחנו לא מבינים את הפשר. ״מגילת הסתר״ – מגלה את ההסתר. מגלה את הגילוי שבתוך ההסתר.</p><p style="margin-bottom:10px;">ובהבדל אינסופי ממה שהיה לנו בשואה – בימים האלה אנחנו מתכנסים כולנו. ובשמחת תורה התגלה סוד שהחמאס לא ידע – <strong>שאנחנו ביחד</strong>.</p><h4 style="margin:14px 0 6px;">״לך כנוס את כל היהודים״</h4><p style="margin-bottom:10px;">יכלו היהודים לברוח. לא היה מספרי זהות, לא ביומטרי. כל אחד יכל לנוע 100-200 קילומטר ולשנות את זהותו. הגזירה הייתה רק ליום אחד. והם לא הסכימו לוותר על זהותם. ״אֲנַחְנוּ יְהוּדִים. אֲנַחְנוּ עַם יִשְׂרָאֵל.״</p><p style="margin-bottom:10px;">זה הנס הגדול במגילה – שעם ישראל עמד ביחד. לא כי פתאום נהיה מאוחד – <strong>הוא תמיד היה מאוחד, רק לא תמיד רואים את זה</strong>.</p><h4 style="margin:14px 0 6px;">תפקיד החסידים בעת הזאת</h4><p style="margin-bottom:10px;">כותב הרמח״ל: מה תפקידם של חסידים בעת הזאת? ללמד זכות על ישראל, להחזיר אותם לכף זכות, להתפלל עליהם, לחשוב תמיד בטובתם.</p><p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">״וְנַחְנוּ קָמְנוּ וַנִּתְעוֹדָד״ (תהלים כ׳, ט)<br/><br/>חג פורים שמח לכל ישראל – והרבה יותר מיציאת מצרים. נראה נפלאות בעזרת ה׳.</p>` },
  { name: "הרב זרביב", duration: "20:10", videoUrl: "https://drive.google.com/file/d/1ScxYADzN1OEdIJKz5ZziYV8odByW_uzz/view", summary: `<h3 style="font-size:1.1em;margin-bottom:8px;">הרב אברהם זרביב</h3><p style="color:hsl(30 30% 45%);margin-bottom:12px;font-style:italic;">יש ה׳ בקרבנו – גאולה בתוך הטבע</p><p style="margin-bottom:10px;">אנחנו נמצאים בימים גדולים מאוד. מגילת אסתר של העת הזאת נכתבת למול עינינו. רק מי שמתבונן רואה את המציאות – אי אפשר לתאר את מה שמתרחש לנגד עינינו. רק צריך לפקוח עיניים ורואים שיד ה׳ ממש בתוך המציאות, הכל מסתדר.</p><h4 style="margin:14px 0 6px;">״היש ה׳ בקרבנו אם אין״</h4><p style="margin-bottom:10px;">כתוב בפרשת בשלח שעם ישראל נמצא ברפידים, אין להם מים לשתות, הם צועקים אל משה ומתלוננים. משה מכה בסלע ויש מים.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״וַיִּקְרָא שֵׁם הַמָּקוֹם מַסָּה וּמְרִיבָה... עַל אֹמְרָם הֲיֵשׁ ה׳ בְּקִרְבֵּנוּ אִם-אָיִן״ (שמות י״ז, ז)</p><p style="margin-bottom:10px;">שואל הנצי״ב בספרו העמק דבר: איך יכול להיות שעם ישראל שואל האם יש ה׳ בקרבנו? יש עמוד אש, יש עמוד ענן, היה קריעת ים סוף לא מזמן.</p><p style="margin-bottom:10px;">ועונה הנצי״ב: עם ישראל ידע ברור שהקדוש ברוך הוא איתם עכשיו בהנהגה ניסית. <strong>השאלה שלהם הייתה לגבי העתיד</strong> – כשיכנסו לארץ ישראל ותהיה הנהגה טבעית. כשיוצאים לחרוש, לזרוע, לקצור. האם גם אז הקדוש ברוך הוא יהיה איתנו?</p><p style="margin-bottom:10px;">ומתי גילו את התשובה? <strong>בימי פורים</strong>. בפורים ראו שכל הכוכבים מסתדרים בתוך הטבע עצמו. ולכן ״קִיְּמוּ וְקִבְּלוּ הַיְּהוּדִים״ – קבלת התורה מחדש, מתוך אהבה.</p><h4 style="margin:14px 0 6px;">ונהפוכו – הפך אמיתי</h4><p style="margin-bottom:10px;">בפורים ה״ונהפוכו״ שונה מהפך רגיל. הפך רגיל הוא אחד כנגד השני. אבל בפורים ״וְנַהֲפוֹךְ הוּא״ – <strong>אותו הדבר עצמו שהיה רע הוא שנהפך לטוב</strong>. אותו עץ שהיה אמור לתלות את מרדכי – עליו תלו את המן. אותו בית המן, שתכנן איך להרוג יהודים, ממנו הוציאו את הרשימות.</p><p style="margin-bottom:10px;">זה דומה בדיוק למה שקרה אצלנו בעזה: השתלטו על מחשבי החמאס, שאבו את כל המידע, והצליחו לזהות את המחבלים – אחד אחד, כמו שמעבירים כבני מרון. כל הרע עצמו הפך לטוב.</p><h4 style="margin:14px 0 6px;">הדר קיבלוה בימי אחשוורוש</h4><p style="margin-bottom:10px;">אומרת הגמרא במסכת שבת: ״הֲדַר קַבְּלוּהָ בִּימֵי אֲחַשְׁוֵרוֹשׁ״ – עם ישראל קיבל את התורה מחדש. תורה שבכתב – אמרו נעשה ונשמע. אבל תורה שבעל פה – כל כך הרבה פרטים. על זה כפה עליהם הר כגיגית.</p><p style="margin-bottom:10px;">אבל מתי קיבלו מאהבה? <strong>כשראו שהטבע כולו משועבד לריבונו של עולם</strong>. שאין צורך לצאת מחוץ לטבע – אלא הטבע עצמו עושה את רצון ה׳ ופועל לגאולתם של ישראל.</p><h4 style="margin:14px 0 6px;">ניסים לנגד עינינו</h4><p style="margin-bottom:10px;">ישבתי עם אחד מבכירי מערכת הביטחון. הוא סיפר: לא הייתה יכולת תקיפה באיראן. יום אחד, בלי התראה, סוריה נופלת. וצה״ל משמיד בכמה ימים את כל הצבא הסורי – צבא שנבנה ב-50 שנה. ואז נפתח מסדרון אווירי שקיצר את הטיסה ב-700 קילומטר.</p><p style="margin-bottom:10px;">אמרתי לו: ״אתה מצייר לי ציור שאי אפשר לתאר. זה ממש כאילו לא ייתכן.״ לא הייתה יכולת – והקדוש ברוך הוא השמיד זה ואז זה. <strong>כל הכוכבים מסתדרים</strong>.</p><h4 style="margin:14px 0 6px;">התקרבות בתוך המלחמה</h4><p style="margin-bottom:10px;">גם בתוך הקשיים – יש התעוררות עצומה. סיפור ראשון: ראש עיר שרדף גרעין תורני הגיע לנחם את ראש הישיבה. הבן שלו, לוחם בגולני, חזר מעזה עם כיפה וציציות. אמר לאמו: ״שמה גיליתי את הקדוש ברוך הוא. ואם אתם ליברלים אמיתיים – תכבדו אותי.״</p><p style="margin-bottom:10px;">סיפור שני: גיורת מתוכנית נתיב שהתחזקה בצבא וכתבה שהיא עכשיו במדרשה. אמרתי לה: נשמתך יפת תואר. ה׳ ראה בך נשמה יפה ומשך אותך.</p><h4 style="margin:14px 0 6px;">״הדר קיבלוה״ – גם בימינו</h4><p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">״כִּי יִשְׁמַע יִתְרוֹ״ – כולם שמעו, אבל יתרו הקשיב. אנחנו רק צריכים לפתוח עיניים ולהקשיב למציאות.<br/><br/>בעזרת ה׳, ״הדר קיבלוה בימי אחשוורוש״ – ממש גם בימים האלה, כולנו מקבלים את התורה מאהבה. נזכה לתשועת עולמים.</p>` },
  { name: "הרב דני לביא", duration: "16:40", videoUrl: "https://drive.google.com/file/d/18VrmqCEsd5uY_WjV9y9PfsIbezB3mIlT/view", summary: `<h3 style="font-size:1.1em;margin-bottom:8px;">הרב דני לביא</h3><p style="color:hsl(30 30% 45%);margin-bottom:12px;font-style:italic;">ממקלט בטוח לאור לגויים</p><p style="margin-bottom:10px;">כולנו מרגישים את מכנפי ההיסטוריה וחווים שאנחנו נמצאים בתקופה תנ״כית. אבל הדבר הזה נכון לא רק למבצע החדש – אלא בכלל לכל התקופה של השנתיים וחצי האחרונות.</p><h4 style="margin:14px 0 6px;">סיום המלאכה</h4><p style="margin-bottom:10px;">שאול המלך נענש על כך שלא סיים את המלאכה – ואת אגג המלך השאיר. והנה אנחנו זוכים לחיסולו של הרשע הגדול. ״וּבַאֲבֹד רְשָׁעִים רִנָּה״ (משלי י״א, י).</p><h4 style="margin:14px 0 6px;">מבצע עם כלביא מול מבצע ישאג כארי</h4><p style="margin-bottom:10px;">מדינת ישראל עלתה כאן שלב – <strong>ממבצע עם כלביא למבצע ישאג כארי</strong>.</p><p style="margin-bottom:10px;">מה הייתה המטרה של מבצע עם כלביא? חיסול היכולות של הגרעין האיראני. במילים אחרות: יש עם חזק שרוצה להשמידנו, ואנחנו נעשה הכל על מנת להגן על עצמנו. ״לעולם לא עוד״ – כמדיניות ממשית.</p><p style="margin-bottom:10px;">אבל מה מצלצל בסגנון הזה? <strong>מקלט בטוח</strong>. ״האם שוב יצליחו לחסל אותנו? לא, יש לנו צבא.״ וזה הכל. זה מה שיש למדינת ישראל להציע?</p><h4 style="margin:14px 0 6px;">בגידה בייעוד</h4><p style="margin-bottom:10px;">לדבר רק בשפה של מקלט בטוח זה לא פחות מבגידה בייעוד הישראלי.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״וְנִבְרְכוּ בְךָ כֹּל מִשְׁפְּחֹת הָאֲדָמָה״ (בראשית י״ב, ג)<br/>״וְאַתֶּם תִּהְיוּ-לִי מַמְלֶכֶת כֹּהֲנִים וְגוֹי קָדוֹשׁ״ (שמות י״ט, ו)<br/>״וּנְתַתִּיךָ לְאוֹר גּוֹיִם לִהְיוֹת יְשׁוּעָתִי עַד-קְצֵה הָאָרֶץ״ (ישעיהו מ״ט, ו)</p><p style="margin-bottom:10px;">וכותב הרב קוק: <strong>לאומיות ללא חזון אוניברסלי היא אגואיזם מורחב</strong>. אנחנו צריכים את הארץ הזאת בשביל להביא את ברכתנו לעולם כולו.</p><h4 style="margin:14px 0 6px;">שתי קיצוניות – והבשורה הישראלית</h4><p style="margin-bottom:10px;">מצד אחד – האיסלאם הרדיקלי שרוצה לכבוש הכל בחרב. מצד שני – אירופה שהתייאשה מאמת ושקר ונכבשת מבפנים.</p><p style="margin-bottom:10px;"><strong>הבשורה הייחודית של עם ישראל</strong>: אנחנו מאמינים באמת, יש טוב ורע בעולם. אבל אנחנו רוצים רק את נחלת אבותינו – ומחוץ לזה מהווים מודל והשראה.</p><h4 style="margin:14px 0 6px;">מבצע ישאג כארי – שפה חדשה</h4><p style="margin-bottom:10px;">ראש הממשלה אומר: מטרת המבצע היא הפלת משטר האייתולות – כדי שהאומה האיראנית תזכה להשתחרר. <strong>סוף סוף עם ישראל מתחיל לדבר בשפה שיש לנו מסר מוסרי לעולם</strong>.</p><p style="margin-bottom:10px;">גם דגלס מאריי אמר: ״מדינת ישראל נלחמת כאן את מלחמתו של העולם החופשי. אם חלילה היא תפסיד – כולנו נפסיד.״</p><h4 style="margin:14px 0 6px;">המגילה שנכתבת – פסוקים חדשים</h4><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״וַיְהִי בַּחֹדֶשׁ הַשְּׁנֵים-עָשָׂר הוּא חֹדֶשׁ אֲדָר... וַיִּתְנַשֵּׂא יִשְׂרָאֵל כָּאֲרִי לְהַפִּיל אֶת מִשְׁטַר הָרֶשַׁע בְּאִיּרָן וּלְעָקְרוֹ מִן הַשֹּׁרֶשׁ... וַתָּשָׁב מַחֲשַׁבְתּוֹ הָרָעָה שֶׁל חַמֵּינֵאי אֲשֶׁר חָשַׁב עַל יִשְׂרָאֵל עַל רֹאשׁוֹ...״</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״...וּבָעֵת הַהִיא אוֹר חָדָשׁ עַל צִיּוֹן הֵאִיר... כִּי סָרָה תּוֹדַעַת הַהִשָּׁרְדוּת מִלִּבָּם, וַיִּשְׁאַג יִשְׂרָאֵל כָּאֲרִי לְהוֹבִיל דֶּרֶךְ מוּסָר וָצֶדֶק לְכָל יוֹשְׁבֵי תֵבֵל... וְנָתַתִּיךָ לְאוֹר גּוֹיִם לִהְיוֹת יְשׁוּעָתִי עַד-קְצֵה הָאָרֶץ.״</p><h4 style="margin:14px 0 6px;">התופעה המדהימה</h4><p style="margin-bottom:10px;">איראנים ברחבי העולם משבחים את ישראל ומניפים את דגליה. אנחנו משלבים ידיים עם האימפריה החזקה ביותר בעולם – והיא נותנת לנו להוביל.</p><p style="margin-bottom:10px;">ג׳ורדן פיטרסון אמר בדמעות: <strong>״גורל העולם תלוי בעם ישראל. כך אתם הופכים את עצמכם לאור לגויים... אנחנו זקוקים לה, וזה תלוי בכם לעשות את זה.״</strong></p><h4 style="margin:14px 0 6px;">סיכום</h4><p style="padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">אנחנו עוברים: ממבצע עם כלביא שחיסל את יכולות ההשמדה – למבצע ישאג כארי שמרים את קולנו כלפי העולם כולו.<br/><br/>שבעזרת ה׳ העם שקם כארי לשמור על הישרדותו, יתחיל להשמיע את קולו כאריה – להיות אור לגויים ולתקן עולם במלכות שדי.<br/><br/>ובמהרה בימינו – לבניין בית המקדש.</p>` },
  { name: "הרב יהושע שפירא", duration: "14:55", videoUrl: "https://drive.google.com/file/d/1YmbZHCSRy_kwadWHiwNDrnRqt52b4NQo/view", summary: `<h3 style="font-size:1.1em;margin-bottom:8px;">הרב יהושע שפירא</h3><p style="color:hsl(30 30% 45%);margin-bottom:12px;font-style:italic;">מרדכי, אסתר ותיקון חטא שאול – הניצחון המוחלט</p><p style="margin-bottom:10px;">זכינו שפסיחת המלחמה הזאת – גבורת הארי – הייתה בשעה של קריאת פרשת זכור. וקריאת פרשת זכור עוסקת בנייני הימים האלה של ערב חג הפורים.</p><h4 style="margin:14px 0 6px;">״ומי יודע אם לעת כזאת״</h4><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;">״אִם-הַחֲרֵשׁ תַּחֲרִישִׁי בָּעֵת הַזֹּאת, רֶוַח וְהַצָּלָה יַעֲמוֹד לַיְּהוּדִים מִמָּקוֹם אַחֵר, וְאַתְּ וּבֵית-אָבִיךְ תֹּאבֵדוּ, וּמִי יוֹדֵעַ אִם-לְעֵת כָּזֹאת הִגַּעַתְּ לַמַּלְכוּת״ (אסתר ד׳, יד)</p><p style="margin-bottom:10px;">מה הכוונה ב״בית אביך״? הרי אסתר מתה אביה ואמה. מרדכי בן יאיר בן שמעי בן קיש – <strong>זה בית שאול</strong>. ושאול לא סיים את מלאכת מחיית עמלק. והנה אסתר ומרדכי מסיימים את המלאכה – ולכן לאחר פורים אנחנו לא פוגשים עוד את עמלק בהיסטוריה.</p><p style="margin-bottom:10px;"><strong>חג הפורים הוא הניצחון המוחלט על עמלק.</strong></p><h4 style="margin:14px 0 6px;">שתי קומות במלחמת עמלק</h4><p style="margin-bottom:10px;">בפרשת בשלח, יהושע הכה את הלוחמים בלבד – ״וַיַּחֲלֹשׁ יְהוֹשֻׁעַ אֶת-עֲמָלֵק״. לא סיים את המלאכה. ובכל זאת אין תלונות – מפני שלא נצטווה על מחייה.</p><p style="margin-bottom:10px;">מיד אחר כך ה׳ אומר למשה: ״כְּתֹב זֹאת זִכָּרוֹן בַּסֵּפֶר וְשִׂים בְּאָזְנֵי יְהוֹשֻׁעַ, כִּי-מָחֹה אֶמְחֶה אֶת-זֵכֶר עֲמָלֵק״ – <strong>יהיה עוד קומה. מחיית עמלק – לא רק מלחמה בעמלק</strong>.</p><h4 style="margin:14px 0 6px;">חטא שאול ותיקון אסתר</h4><p style="margin-bottom:10px;">שמואל מצווה ניצחון מוחלט. לא מלחמה – מחייה. ובכל זאת שאול משאיר את אגג המלך. וכתם זה רובץ על משפחת שאול לדורות.</p><p style="margin-bottom:10px;">עד שאסתר מבינה: <strong>הבעיה של שאול לא הייתה מלחמה – הבעיה הייתה שהוא לא הגיע לניצחון מוחלט</strong>. ולכן כשמסיימים את כל 127 המדינות – המוקד של עמלק צריך להיעקר מן השורש.</p><h4 style="margin:14px 0 6px;">ט״ו אדר – קומה אחרת</h4><p style="margin-bottom:10px;">ט״ו אדר הוא לא סתם יום שבו היה ניצחון נוסף – זה <strong>סוג ניצחון אחר לגמרי</strong>. יום י״ד דומה ליהושע – מלחמה. אבל המחייה עצמה – דווקא בט״ו. ולכן אסתר מבקשת עוד יום.</p><p style="margin-bottom:10px;">דין שושן אינו של עיר זו בלבד – אלא של כל הערים המוקפות חומה מימות יהושע. ובייחוד ירושלים עיר הקודש – זוכה למעמד מיוחד הכרוך בתיקון הגדול הזה.</p><h4 style="margin:14px 0 6px;">המלחמה שלנו – בעקבות אסתר</h4><p style="margin-bottom:10px;">אנחנו עומדים במאמצים כבירים עם שותפים גדולים. כמו שאסתר לא עשתה את זה לבד אלא עם אחשוורוש – יש לנו היום שותף: ארצות הברית. ביחד אנחנו פועלים <strong>לא רק להילחם, אלא לעקור את שלטון הרשע מן העולם</strong>.</p><h4 style="margin:14px 0 6px;">הנס המופלא</h4><p style="margin-bottom:10px;">בתוך ארבעים דקות – 40 קצינים בכירים. פשוט לא יאומן. הקדוש ברוך הוא נתן סיעתא דשמיא ותושייה מופלאה לחיילינו.</p><p style="margin-bottom:10px;padding:10px;background:hsl(38 40% 90%);border-radius:8px;font-style:italic;font-weight:bold;">כשם שבימים ההם, בעקבות הניצחון, ראינו ניצנים לבניין בית המקדש – כך נזכה גם אנחנו, אחרי מחיית המלך הקשה כמן, לראות במהרה בימינו בניין בית המקדש.<br/><br/>אמן ואמן. פורים שמח.</p><hr style="border:none;border-top:1px solid hsl(38 50% 82%);margin:16px 0;"/><h4 style="margin:14px 0 6px;">סיום הכנס</h4><p style="margin-bottom:10px;">״תודה לרב יהושע שפירא על הדברים המחזקים – להבין איפה אנחנו נמצאים בקומות של הגאולה. אם השלב הבא הוא בית המקדש – בעזרת ה׳ נזכה כולנו.״</p><p style="font-weight:bold;">תודה לכל הרבנים, לכל המשתתפים, לתנועת בני ציון. רק בשורות טובות. פורים שמח לכל ישראל. 🎉</p>` },
];

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const driveId = extractDriveFileId(url);
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
  return null;
}

function RecordingCard({ recording, index }: { recording: Recording; index: number }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const embedUrl = getEmbedUrl(recording.videoUrl);
  const hasVideo = !!embedUrl;

  return (
    <>
      <div className="group rounded-2xl border border-[hsl(38_50%_82%)] bg-[hsl(38_50%_95%)] p-4 md:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-[hsl(85_35%_35%)] text-white font-kedem font-bold text-base md:text-lg shrink-0">
              {index + 1}
            </span>
            <div className="flex flex-col">
              <h3 className="font-kedem font-bold text-base md:text-xl text-[hsl(30_40%_25%)]">
                {recording.name}
              </h3>
              <span className="font-ploni text-xs text-[hsl(30_30%_50%)]">
                {recording.duration} דק׳
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mr-12 sm:mr-0">
            {recording.summary && (
              <button
                onClick={() => setSummaryOpen(!summaryOpen)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(43_70%_47%/0.15)] text-[hsl(30_40%_25%)] text-sm font-ploni font-light hover:bg-[hsl(43_70%_47%/0.3)] transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden xs:inline">סיכום</span>
                {summaryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            <button
              onClick={() => hasVideo && setVideoOpen(true)}
              disabled={!hasVideo}
              className="flex flex-row-reverse items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(85_35%_35%)] text-white font-ploni transition-all duration-300 hover:bg-[hsl(85_35%_28%)] hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              {hasVideo ? "צפייה" : "בקרוב"}
            </button>
          </div>
        </div>
        {recording.summary && summaryOpen && (
          <div
            className="mt-4 pt-4 border-t border-[hsl(38_50%_82%)] font-ploni font-bold text-[hsl(30_30%_30%)] leading-relaxed text-sm [&_h3]:font-kedem [&_h3]:font-bold [&_h4]:font-kedem [&_h4]:font-bold"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(recording.summary ?? "") }}
          />
        )}
      </div>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden bg-[hsl(30_40%_12%)] border-none">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="font-kedem font-bold text-white text-right">
              {recording.name}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            {embedUrl && (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhoneMockup({ children, headerColor, headerText }: { children: React.ReactNode; headerColor: string; headerText: string }) {
  return (
    <div className="mx-auto max-w-[320px] w-full">
      <div className="rounded-[2rem] border-[3px] border-[hsl(0_0%_30%)] bg-[hsl(0_0%_15%)] p-1.5 shadow-2xl">
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-24 h-5 bg-[hsl(0_0%_10%)] rounded-b-xl" />
        </div>
        {/* Header */}
        <div className={`${headerColor} rounded-t-xl px-4 py-3`}>
          <p className="text-white font-kedem font-bold text-sm text-center">{headerText}</p>
        </div>
        {/* Content */}
        <div className="bg-[hsl(38_30%_94%)] rounded-b-xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function KnesPage() {
  useSEO({
    title: "כנס ההודאה והתפילה – בני ציון",
    description: "כנס ההודאה והתפילה השנתי של תנועת בני ציון – הקלטות, סיכומים ותרומות",
  });

  return (
    <Layout>
      <div dir="rtl" className="kenes-theme bg-[hsl(38_50%_93%)]">
        {/* ===== HERO ===== */}
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          <img
            src={kenesHeroBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" />
          <div className="relative z-10 text-center px-4 py-20 max-w-3xl mx-auto">
            <p className="font-kedem font-light text-[hsl(30_40%_20%)] text-lg md:text-xl mb-3 tracking-wide md:mt-16">
              תנועת בני ציון ללימוד תנ״ך:
            </p>
            <h1 className="font-kedem-hollow text-5xl sm:text-5xl md:text-7xl mb-8 leading-tight bg-gradient-to-l from-[hsl(25_50%_25%)] to-[hsl(30_40%_18%)] bg-clip-text text-transparent">
              כנס ההודאה והתפילה
            </h1>
            <div className="flex flex-col sm:flex-row-reverse items-center justify-center gap-4">
              <a
                href="https://chat.whatsapp.com/LghgDJHZngl4QBpji7MwAT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row-reverse items-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(85_35%_35%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(85_35%_28%)] hover:shadow-xl hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                קהילת הווצאפ
              </a>
              <a
                href="#recordings"
                className="flex flex-row-reverse items-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(43_70%_47%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:bg-[hsl(43_70%_40%)] hover:shadow-xl hover:scale-105"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                הקלטות הכנס
              </a>
            </div>
          </div>
        </section>

        {/* ===== DONATION CTA - TOP ===== */}
        <section className="py-10 md:py-14 px-4 bg-gradient-to-b from-[hsl(38_50%_93%)] to-[hsl(38_40%_88%)]">
          <div className="max-w-2xl mx-auto text-center">
            <p className="font-kedem text-[hsl(30_40%_25%)] text-lg md:text-xl leading-relaxed mb-2">
              תודה <strong>למאות מאות המשתתפים</strong> בכנס החשוב!
            </p>
            <p className="font-ploni text-[hsl(30_30%_40%)] text-base md:text-lg leading-relaxed mb-1">
              שנזכה להודאה ותפילה בימי התשועה הגדולים הללו
            </p>
            <p className="font-ploni text-[hsl(30_30%_40%)] text-base md:text-lg leading-relaxed mb-4">
              <strong>לקראת פורים,</strong> תוכלו להצטרף לזכות שלנו בכנס החשוב –
              <br />
              <span className="text-[hsl(30_40%_25%)] font-bold">זכר למחצית השקל – התרומה שלכם בונה קומה נוספת של תנ״ך!</span>
            </p>
            <p className="font-ploni text-[hsl(30_30%_45%)] text-sm mb-5">
              לתרומה מהירה ושותפות לזכר סעדיה הי״ד זכר למחצית השקל:
            </p>
            <a
              href="https://givechak.co.il/Saadia?ref=r3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-l from-[hsl(43_70%_47%)] to-[hsl(38_60%_42%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              <Heart className="w-5 h-5" />
              לתרומה זכר למחצית השקל
            </a>
          </div>
        </section>

        {/* ===== RECORDINGS ===== */}
        <section id="recordings" className="py-16 md:py-24 px-4 md:px-8 max-w-4xl mx-auto">
          <h2 className="font-kedem font-bold text-3xl md:text-4xl text-[hsl(30_40%_25%)] text-center mb-3">
            הקלטות וסיכומי הכנס
          </h2>
          <p className="font-ploni text-[hsl(30_30%_45%)] text-center mb-12 text-lg">
            לחצו על צפייה כדי לצפות בהרצאה
          </p>
          <div className="flex flex-col gap-4">
            {recordings.map((rec, i) => (
              <RecordingCard key={i} recording={rec} index={i} />
            ))}
          </div>
        </section>

        {/* ===== DONATION CTA - BEFORE COMMUNITY ===== */}
        <section className="py-10 md:py-14 px-4 bg-[hsl(38_50%_93%)]">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-[hsl(38_40%_90%)]/60 backdrop-blur-sm border border-[hsl(38_40%_75%)] rounded-2xl p-6 md:p-8">
              <p className="font-kedem font-bold text-[hsl(30_40%_18%)] text-lg md:text-xl leading-relaxed mb-3">
                <strong>זכר למחצית השקל</strong> – התרומה שלכם בונה קומה נוספת של תנ״ך!
              </p>
              <p className="font-ploni font-bold text-[hsl(30_35%_30%)] text-sm mb-5">
                לתרומה מהירה ושותפות לזכר סעדיה הי״ד:
              </p>
              <a
                href="https://givechak.co.il/Saadia?ref=r3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-l from-[hsl(43_70%_47%)] to-[hsl(38_60%_42%)] text-white font-kedem font-bold text-base transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                <Heart className="w-5 h-5" />
                לתרומה זכר למחצית השקל
              </a>
            </div>
          </div>
        </section>

        {/* ===== COMMUNITY ===== */}
        <section className="py-16 md:py-24 px-4 md:px-8 bg-[hsl(38_40%_88%)]">
          <h2 className="font-kedem font-bold text-3xl md:text-4xl text-[hsl(30_40%_25%)] text-center mb-4">
            הצטרפו לקהילה שלנו
          </h2>
          <p className="font-ploni text-[hsl(30_30%_45%)] text-center mb-14 text-lg max-w-2xl mx-auto">
            תוכן יומי שמחזק ומחבר – פסוק יומי וסרטון קצר שיחדד לכם את הכיוון בתנ״ך
          </p>

          <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            {/* Daily Verse Phone */}
            <div className="flex flex-col items-center gap-5">
              <PhoneMockup headerColor="bg-[hsl(142_70%_30%)]" headerText="📜 פסוק יומי – בני ציון">
                <div className="p-3">
                  <img src={watercolorBook} alt="ספר תנ״ך מאויר" className="w-full rounded-lg mb-3" />
                  <div className="bg-white rounded-xl p-3 shadow-sm text-right">
                    <p className="font-kedem font-bold text-sm text-[hsl(30_40%_25%)] mb-2">
                      להפוך את הגזירה, לא למחוק אותה
                    </p>
                    <p className="font-ploni font-bold text-xs text-[hsl(30_30%_25%)] leading-relaxed mb-2">
                      הרב יואב אוריאל
                    </p>
                    <p className="font-kedem font-bold text-xs text-[hsl(30_30%_25%)] leading-relaxed mb-2 italic">
                      "וְאַתֶּם כִּתְבוּ עַל הַיְּהוּדִים כַּטּוֹב בְּעֵינֵיכֶם בְּשֵׁם הַמֶּלֶךְ וְחִתְמוּ בְּטַבַּעַת הַמֶּלֶךְ כִּי כְתָב אֲשֶׁר נִכְתָּב בְּשֵׁם הַמֶּלֶךְ וְנַחְתּוֹם בְּטַבַּעַת הַמֶּלֶךְ אֵין לְהָשִׁיב" (אסתר ח, ח)
                    </p>
                    <p className="font-ploni font-bold text-xs text-[hsl(30_30%_25%)] leading-relaxed mb-2">
                      📜 באופן מפתיע, המלך אחשורוש אינו מבטל את הגזירה הראשונה להשמיד את היהודים. החותם המלכותי אינו יכול להימחק, והסכנה נשארת בעינה. מה כן משתנה? לפי חלק מהמפרשים המלך נותן ליהודים רשות להתגונן ולעמוד על נפשם. <strong>הישועה לא הגיעה על ידי העלמת הקושי או מחיקת העבר, אלא על ידי מתן כוח להתמודד מולו ולנצח אותו</strong>. זהו לימוד גדול בהנהגה: לפעמים הקב"ה אינו מסיר את האיום או את הניסיון, אלא נותן לאדם כלים חדשים וכוחות נפש להתמודד עם המציאות כפי שהיא, ומתוך כך לצמוח.
                    </p>
                    <p className="font-ploni font-bold text-xs text-[hsl(30_30%_25%)] leading-relaxed">
                      🌿 נקודת חיים: לפעמים אנו מתפללים שהבעיות פשוט ייעלמו, או שהעבר שלנו יימחק כאילו לא היה. אולם הדרך האמיתית היא לעיתים אחרת: <strong>במקום לחכות שהמציאות תשתנה, עלינו לבקש את הכוח "לכתוב" את הפרק הבא שלנו, ולמצוא בתוכנו את הכוחות לעמוד ולהתמודד מול מה שאי אפשר לשנות</strong>.
                    </p>
                  </div>
                </div>
              </PhoneMockup>
              <a
                href="https://chat.whatsapp.com/LghgDJHZngl4QBpji7MwAT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(142_70%_30%)] text-white font-kedem font-bold transition-all duration-300 hover:bg-[hsl(142_70%_25%)] hover:shadow-lg hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                הצטרפו לפסוק היומי
              </a>
            </div>

            {/* Kriat Kivun Phone */}
            <div className="flex flex-col items-center gap-5">
              <PhoneMockup headerColor="bg-[hsl(30_40%_25%)]" headerText="🎬 קריאת כיוון – סרטון יומי">
                <div className="relative cursor-pointer" onClick={(e) => {
                  const video = e.currentTarget.querySelector('video') as HTMLVideoElement;
                  const poster = e.currentTarget.querySelector('.poster-overlay') as HTMLElement;
                  const playBtn = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
                  if (video) {
                    if (video.paused) {
                      video.currentTime = 0;
                      video.play();
                      if (poster) poster.style.display = 'none';
                      if (playBtn) playBtn.style.opacity = '0';
                    } else {
                      video.pause();
                      if (playBtn) playBtn.style.opacity = '1';
                    }
                  }
                }}>
                  <video
                    src="/videos/kriat-kivun-sample.mp4"
                    className="w-full"
                    playsInline
                    preload="auto"
                  />
                  <img
                    src={kriatKivunBanner}
                    alt="קריאת כיוון"
                    className="poster-overlay absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="play-overlay absolute inset-0 flex items-center justify-center transition-opacity duration-300">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="w-7 h-7 text-[hsl(30_40%_25%)]" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-kedem font-bold text-sm text-[hsl(30_40%_25%)] mb-1">
                    קריאת כיוון – המצפן היומי שלך בתנ״ך
                  </p>
                  <p className="font-ploni text-xs text-[hsl(30_30%_40%)]">
                    5 דקות תנ״ך ביום עם הרב יואב אוריאל
                  </p>
                </div>
              </PhoneMockup>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href="https://www.youtube.com/playlist?list=PLOx20t5YE1oBmOajK5567uJT1bpHjTqmb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(0_80%_50%)] text-white font-ploni font-light transition-all duration-300 hover:bg-[hsl(0_80%_42%)] hover:shadow-lg hover:scale-105"
                >
                  <ExternalLink className="w-4 h-4" />
                  יוטיוב
                </a>
                <a
                  href="https://open.spotify.com/show/4dulNchco8ghwVgXsKlxYP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(142_70%_38%)] text-white font-ploni font-light transition-all duration-300 hover:bg-[hsl(142_70%_30%)] hover:shadow-lg hover:scale-105"
                >
                  <ExternalLink className="w-4 h-4" />
                  ספוטיפיי
                </a>
                <a
                  href="https://chat.whatsapp.com/LnJJBRXwkf24GTvotWbdOw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(142_70%_30%)] text-white font-ploni font-light transition-all duration-300 hover:bg-[hsl(142_70%_25%)] hover:shadow-lg hover:scale-105"
                >
                  <MessageCircle className="w-4 h-4" />
                  ווצאפ
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
