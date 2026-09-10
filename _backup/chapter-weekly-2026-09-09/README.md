# גיבוי — דף הפרק השבועי, הגרסה שהייתה לפני השדרוג

נשמר 9.9.2026, לפני בניית `/chapter-weekly-v2`.

## מה יש כאן

| קובץ | מקור בריפו |
|------|-------------|
| `ChapterWeekly.tsx` | `src/pages/ChapterWeekly.tsx` |
| `chapter-weekly/` | `src/components/chapter-weekly/` (14 סקשנים + SubscribeButton) |
| `chapter-weekly.css` | `src/styles/chapter-weekly.css` |
| `WeeklyProgramLibrary.tsx` | `src/pages/WeeklyProgramLibrary.tsx` |
| `WeeklyBookDetail.tsx` | `src/pages/WeeklyBookDetail.tsx` |
| `weekly/` | `src/components/weekly/` |

ספריית התכנית (`WeeklyProgramLibrary` / `WeeklyBookDetail`) גובתה גם היא, אף שלא נגענו
בה — היא מקושרת מאותו אזור באתר, וגיבוי אחד עדיף על שניים חלקיים.

## שחזור

הדף החי `/chapter-weekly` **לא שונה** בסבב הזה, ולכן אין מה לשחזר כרגע.
הגיבוי נועד ליום שבו הגרסה החדשה תחליף את הישנה. אז:

```bash
cd ~/Downloads/saar-workspace/bneyzion
cp _backup/chapter-weekly-2026-09-09/ChapterWeekly.tsx src/pages/
cp -R _backup/chapter-weekly-2026-09-09/chapter-weekly/ src/components/chapter-weekly/
cp _backup/chapter-weekly-2026-09-09/chapter-weekly.css src/styles/
```

## הערה

`chapter-weekly/sections/WhyEichah.tsx` היה קוד מת כבר בגרסה המגובה —
הוא לא מיובא ב-`ChapterWeekly.tsx`. נשמר כאן לשלמות התמונה.
