# חבילות עדכון למאגר השאלות

חבילה מוסיפה ומתקנת שאלות, רשומות ותמונות בלי להתקין את האפליקציה מחדש. האפליקציה מקבלת אותה בשתי דרכים:
1. **לבד מהאתר**: כשיש אינטרנט (פעם ב-6 שעות, או "בדיקת עדכוני שאלות עכשיו") היא קוראת את
   `https://luach-sport.github.io/kaduraglan/content/index.json` ומורידה כל חבילה שעוד לא הותקנה.
2. **מקובץ**: פרופיל ← ניהול ועדכון מאגר ← ייבוא חבילת עדכון (ZIP או JSON).

## יצירת חבילה
```bash
mkdir -p updates/src/football-update-002
# כותבים שם את הקבצים שלמטה, ואז:
node scripts/make-package.mjs updates/src/football-update-002
git add updates && git commit -m "שאלות חדשות" && git push     # האתר מתעדכן, והחבילה יורדת לכל האפליקציות
```
הסקריפט בודק כל רשומה עם אותם כללים של האפליקציה, מכווץ תמונות ל-WebP, כותב `updates/<id>.zip`
עם `manifest.json` (SHA-256 לכל קובץ), ומעדכן את `updates/index.json`.

## מבנה התיקייה
- `package.json`: `{ "id": "football-update-002", "title": "שאלות על העונה", "contentVersion": 2, "notes": "…" }`
  (`"maintenance": true` רק לחבילת תחזוקה שמותר לה להסיר שאלות)
- `questions.json`: `{ "add": [...], "update": [...], "remove": ["id", ...] }`
- `entities.json`: `{ "teams": { "add": [...], "update": [...] }, "players": {…}, "nations": {…}, "comps": {…}, "stadiums": {…} }`
- `images.json`: `{ "add": [{ "id": "crest-barcelona", "kind": "crest", "for": "barcelona", "file": "images/barca.png", "source": "…", "license": "…", "credit": "…" }] }`
- `images/`: קבצי התמונות.

## שאלה
```json
{ "id": "cl-example-1", "rev": 1, "cat": "clubs", "diff": 2, "type": "mc",
  "q": "באיזו שנה נוסדה ברצלונה?", "a": "1899", "w": ["1902", "1888", "1910"],
  "explain": "ברצלונה נוסדה ב-1899 על ידי חואן גמפר.", "hints": ["סוף המאה ה-19"],
  "teams": ["barcelona"], "src": "האתר הרשמי של המועדון", "ver": "2026-11-01" }
```
- `type`: `mc` (אמריקאית: `a` + 3 ב-`w`), `tf` (`a`: true/false), `order` (`items: [{ "t": "…", "k": 2008 }]` בסדר עולה, 3 עד 5 פריטים), `whoami` (`clues` + `a` + `w`).
- `cat`: israel, worldcup, nations, europe, leagues, players, clubs, coaches, records, numbers.
- `diff`: 1 מתחיל, 2 אוהד, 3 מתקדם, 4 מומחה, 5 אגדה, 6 בלתי אפשרי.
- נתון שמשתנה: `"asOf": "2026-11"`.

## הכללים שהאפליקציה שומרת
- `id` לא משתנה לעולם. שאלה קיימת מתעדכנת רק כשה-`rev` בחבילה גבוה יותר.
- ייבוא חוזר של אותה חבילה לא יוצר כפילויות ולא משנה כלום.
- חבילה עם קובץ פגום (סכום ביקורת לא תואם) נדחית בשלמותה. רשומה לא תקינה נדחית לבד, והשאר נכנס, עם דוח למה.
- לפני כל ייבוא נשמר גיבוי של המאגר, והייבוא נכתב בפעולה אחת: אם משהו נכשל באמצע, שום דבר לא משתנה.
- ההתקדמות של השחקן (נקודות, הישגים, שאלות שנפתרו) לא נוגעת בחבילות בכלל.
