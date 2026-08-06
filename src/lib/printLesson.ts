/**
 * printLesson — "ההדפסה המסודרת": חלון הדפסה ממותג לשיעור.
 *
 * הערת נעם (סוקר, 5.8.2026): לחיצה על "הדפסה" בעמוד השיעור הנפרד הדפיסה את
 * העמוד כמו-שהוא — עם ההירו, הסיידבר וכל הגרפיקה — בעוד שבפופאפ השיעור כבר
 * הייתה הדפסה מסודרת (כותרת, מטא, תוכן מיושר לשני הצדדים, הקדשה ופוטר).
 * התבנית חולצה מ-LessonDialog לכאן, ושני המקומות קוראים לאותה פונקציה.
 */
import { sanitizeHtml } from "@/lib/sanitize";

export interface LessonPrintArgs {
  title: string;
  /** HTML של גוף השיעור (content); מסונן כאן עם sanitizeHtml לפני ההזרקה. */
  contentHtml: string;
  /** "מאת: הרב … · 3 באוגוסט 2026 · 12 דקות" — מחרוזת מוכנה, בלי חלקים ריקים. */
  metaParts: string;
  /** שם הסדרה לתג — אופציונלי. */
  seriesTitle?: string | null;
  /** טקסט הקדשה מ-site_settings("print_dedication") — אופציונלי. */
  dedicationText?: string | null;
  /** כתובת השיעור המלאה לפוטר. */
  lessonUrl: string;
}

export function openLessonPrintWindow(args: LessonPrintArgs): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const origin = window.location.origin;
  const logoUrl = `${origin}/assets/logo-horizontal-color.png`;
  const content = sanitizeHtml(args.contentHtml || "");

  printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8" />
        <title>${args.title}</title>
        <style>
          @font-face { font-family: 'Kedem'; src: url('${origin}/fonts/kedem-bold.otf') format('opentype'); font-weight: 700; }
          @font-face { font-family: 'Kedem'; src: url('${origin}/fonts/kedem-black.otf') format('opentype'); font-weight: 900; }
          @font-face { font-family: 'Ploni'; src: url('${origin}/fonts/ploni-regular.otf') format('opentype'); font-weight: 400; }
          @font-face { font-family: 'Ploni'; src: url('${origin}/fonts/ploni-bold.otf') format('opentype'); font-weight: 700; }

          :root {
            --primary: #3D8B7A;
            --gold: #B8860B;
            --bg: #FDF8F0;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Ploni', 'David', serif;
            max-width: 750px;
            margin: 0 auto;
            padding: 0 32px;
            color: #1a1a1a;
            line-height: 1.9;
            background: white;
          }

          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24px 0 20px;
            border-bottom: 3px solid var(--primary);
            margin-bottom: 28px;
          }

          .header img {
            height: 56px;
          }

          .header .site-name {
            font-family: 'Kedem', serif;
            font-weight: 900;
            font-size: 14px;
            color: var(--primary);
            letter-spacing: 0.05em;
          }

          h1 {
            font-family: 'Kedem', serif;
            font-weight: 900;
            font-size: 26px;
            color: var(--primary);
            margin-bottom: 8px;
            line-height: 1.3;
          }

          .meta {
            color: #666;
            font-size: 13px;
            margin-bottom: 6px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e0d8;
          }

          .topics-badge {
            display: inline-block;
            background: var(--primary);
            color: white;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 14px;
            border-radius: 20px;
            margin-bottom: 24px;
          }

          .content {
            font-size: 15px;
            line-height: 2;
          }

          .content h2, .content h3 {
            font-family: 'Kedem', serif;
            font-weight: 700;
            color: var(--primary);
            margin-top: 28px;
            margin-bottom: 8px;
          }

          .content h2 { font-size: 20px; }
          .content h3 { font-size: 17px; }

          .content p { margin-bottom: 12px; text-align: justify; }

          .content ol, .content ul { padding-right: 24px; margin-bottom: 12px; }

          .content strong {
            font-weight: 700;
            color: #111;
          }

          .content blockquote {
            border-right: 4px solid var(--gold);
            padding: 8px 16px;
            margin: 16px 0;
            background: #faf6ee;
            border-radius: 4px;
            font-style: italic;
            color: #444;
          }

          .footer {
            margin-top: 40px;
            padding: 20px 0;
            border-top: 2px solid var(--primary);
            text-align: center;
            color: #999;
            font-size: 11px;
          }

          .footer .dedication {
            font-family: 'Kedem', serif;
            font-size: 13px;
            color: var(--gold);
            margin-bottom: 4px;
          }

          .footer .url {
            color: var(--primary);
            font-size: 10px;
          }

          @media print {
            body { padding: 0 16px; }
            .header { padding-top: 8px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="site-name">בני ציון – אתר התנ״ך של ישראל</div>
          <img src="${logoUrl}" alt="בני ציון" onerror="this.style.display='none'" />
        </div>

        <h1>${args.title}</h1>
        <div class="meta">${args.metaParts}</div>

        ${args.seriesTitle ? `<span class="topics-badge">${args.seriesTitle}</span>` : ""}

        <div class="content">${content}</div>

        <div class="footer">
          <div class="dedication">${args.dedicationText || ""}</div>
          <div>בני ציון – אתר התנ״ך של ישראל</div>
          <div class="url">${args.lessonUrl}</div>
        </div>
      </body>
      </html>
    `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 400);
}
