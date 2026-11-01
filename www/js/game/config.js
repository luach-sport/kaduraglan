/* Game settings in one place: points per level, ranks, achievements and game modes.
   Changing a threshold or a name here changes it everywhere. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const CFG = (KG.CFG = {});

  // Points for a correct answer by difficulty (1 מתחיל … 6 בלתי אפשרי).
  CFG.BASE = [0, 100, 150, 200, 300, 400, 600];
  CFG.HINT_COST = 0.25;          // each hint (or extra "who am I" clue) takes 25% of the question's points
  CFG.MIN_FACTOR = 0.25;         // never less than a quarter
  CFG.REPEAT_FACTOR = 0.1;       // a question solved before gives 10% to the total (no endless farming)
  CFG.DAILY_FACTOR = 1.5;        // the daily challenge counts ×1.5, once per day
  CFG.SPEED_MAX = 0.5;           // timed modes: up to +50% for a fast answer
  CFG.STREAK_STEP = 0.1;         // +10% per answer in a row from the 3rd, up to +50%
  CFG.STREAK_MAX = 0.5;
  CFG.SECONDS = 20;              // timer in survival and head to head
  CFG.LIVES = 3;                 // survival
  CFG.STAGE_SIZE = 5;            // questions in a journey stage
  CFG.STAGE_PASS = 3;            // correct answers needed to pass a stage
  CFG.DAILY_SIZE = 7;

  CFG.RANKS = [
    { min: 0, name: 'אוהד מתחיל', icon: 'ball' },
    { min: 1500, name: 'אוהד ותיק', icon: 'flag' },
    { min: 5000, name: 'פרשן', icon: 'message' },
    { min: 12000, name: 'סקאוט', icon: 'eye' },
    { min: 25000, name: 'מומחה', icon: 'target' },
    { min: 45000, name: 'אגדת כדורגל', icon: 'star' },
    { min: 75000, name: 'גאון כדורגל', icon: 'crown' },
    { min: 120000, name: 'היכל התהילה', icon: 'trophy' }
  ];
  CFG.rank = (xp) => {
    let i = 0;
    CFG.RANKS.forEach((r, n) => { if (xp >= r.min) i = n; });
    const cur = CFG.RANKS[i], next = CFG.RANKS[i + 1] || null;
    return { i, cur, next, pct: next ? KG.clamp((xp - cur.min) / (next.min - cur.min), 0, 1) : 1 };
  };

  // Journey: the stage's level grows as you go.
  CFG.stageDiff = (n) => (n <= 8 ? 1 : n <= 18 ? 2 : n <= 30 ? 3 : n <= 44 ? 4 : n <= 58 ? 5 : 6);

  const solved = (P) => Object.values(P.q).filter((x) => x && x.s).length;
  const catC = (P, c) => (P.cat[c] ? P.cat[c].c : 0);
  const dailyDone = (P) => Object.values(P.daily).filter((d) => d && d.total).length;
  const stagesDone = (P, stars) => Object.values(P.journey.stages).filter((s) => s && s.done && (!stars || s.best >= stars)).length;
  const teamSolved = (P, team) => (KG.C.byTeam[team] || []).filter((q) => P.q[q.id] && P.q[q.id].s).length;
  const catAllSolved = (P, cat) => { const list = KG.C.byCat[cat] || []; return list.length > 0 && list.every((q) => P.q[q.id] && P.q[q.id].s); };

  // Achievements: each one unlocks once and stays.
  CFG.ACH = [
    { id: 'first', title: 'שער ראשון', desc: 'תשובה נכונה ראשונה', icon: 'ball', test: (P) => P.correct >= 1 },
    { id: 'streak10', title: '10 ברצף', desc: '10 תשובות נכונות ברצף', icon: 'flame', test: (P) => P.bestStreak >= 10 },
    { id: 'streak25', title: 'בלתי עציר', desc: '25 תשובות נכונות ברצף', icon: 'bolt', test: (P) => P.bestStreak >= 25 },
    { id: 'solved100', title: '100 חידות', desc: 'פתרת 100 חידות שונות', icon: 'medal', test: (P) => solved(P) >= 100 },
    { id: 'solved250', title: 'אנציקלופדיה מהלכת', desc: 'פתרת 250 חידות שונות', icon: 'book', test: (P) => solved(P) >= 250 },
    { id: 'israel', title: 'כחול-לבן', desc: 'פתרת את כל השאלות בכדורגל הישראלי', icon: 'flag', test: (P) => catAllSolved(P, 'israel') },
    { id: 'impossible', title: 'בלתי אפשרי? אפשרי', desc: 'פתרת חידה ברמה "בלתי אפשרי"', icon: 'crown', test: (P, ev) => (ev && ev.correct && ev.diff === 6) || P.hardCorrect >= 1 },
    { id: 'legend10', title: 'רמת אגדה', desc: '10 תשובות נכונות ברמות אגדה ומעלה', icon: 'star', test: (P) => Object.entries(P.q).filter(([id, x]) => x.s && (KG.C.q(id) || {}).diff >= 5).length >= 10 },
    { id: 'nohint50', title: 'בלי עזרה', desc: '50 תשובות נכונות בלי אף רמז', icon: 'hint', test: (P) => P.noHintCorrect >= 50 },
    { id: 'crests50', title: 'סקאוט סמלים', desc: 'זיהית 50 סמלים של קבוצות', icon: 'shield', test: (P) => Object.keys(P.seen.crests).length >= 50 },
    { id: 'daily7', title: 'שבוע של אתגרים', desc: 'השלמת 7 אתגרים יומיים', icon: 'calendar', test: (P) => dailyDone(P) >= 7 },
    { id: 'days7', title: 'שבוע ברצף', desc: 'שיחקת 7 ימים ברצף', icon: 'flame', test: (P) => P.dayStreak.best >= 7 },
    { id: 'h2h', title: 'ראש בראש', desc: 'סיימת משחק ראש בראש', icon: 'swords', test: (P) => P.h2h.games >= 1 },
    { id: 'survive20', title: 'שורד', desc: '20 תשובות נכונות במשחק הישרדות אחד', icon: 'heart', test: (P) => P.survival.best >= 20 },
    { id: 'journey10', title: 'במסע', desc: 'עברת 10 שלבים במסע החידות', icon: 'map', test: (P) => stagesDone(P) >= 10 },
    { id: 'stars10', title: 'שלושה כוכבים', desc: '3 כוכבים ב-10 שלבים', icon: 'star', test: (P) => stagesDone(P, 3) >= 10 },
    { id: 'perfect', title: 'משחק מושלם', desc: 'כל התשובות נכונות במשחק של 10 שאלות לפחות', icon: 'check', test: (P, ev) => !!(ev && ev.perfect) },
    { id: 'barca', title: 'יותר ממועדון', desc: 'פתרת 20 שאלות על ברצלונה', icon: 'shield', test: (P) => teamSolved(P, 'barcelona') >= 20 },
    { id: 'numbers', title: 'יודע את המספרים', desc: '15 תשובות נכונות במספרי חולצות', icon: 'shirt', test: (P) => catC(P, 'numbers') >= 15 },
    { id: 'worldcup', title: 'מונדיאליסט', desc: '25 תשובות נכונות בגביע העולם', icon: 'globe', test: (P) => catC(P, 'worldcup') >= 25 },
    { id: 'speed', title: 'ברק', desc: 'תשובה נכונה תוך 3 שניות במשחק עם שעון', icon: 'bolt', test: (P, ev) => !!(ev && ev.correct && ev.timed && ev.ms <= 3000) }
  ];

  // Game modes. `needs` = what must exist for the mode to open (otherwise the card explains what's missing).
  CFG.MODES = [
    { id: 'journey', title: 'מסע החידות', sub: 'שלב אחרי שלב, מקל לקשה', icon: 'map', color: 'green' },
    { id: 'daily', title: 'אתגר יומי', sub: '7 שאלות חדשות כל יום', icon: 'calendar', color: 'gold' },
    { id: 'survival', title: 'הישרדות', sub: '3 חיים ושעון. כמה תשרוד?', icon: 'heart', color: 'red' },
    { id: 'h2h', title: 'ראש בראש', sub: '2 עד 4 שחקנים על טלפון אחד', icon: 'swords', color: 'purple' },
    { id: 'team', title: 'אתגר לפי קבוצה', sub: 'שאלות רק על הקבוצה שבחרת', icon: 'shield', color: 'blue' },
    { id: 'free', title: 'משחק חופשי', sub: 'בוחרים קטגוריה, רמה ומספר שאלות', icon: 'sliders', color: 'green' },
    { id: 'image', title: 'זיהוי תמונה', sub: 'שחקנים, אצטדיונים וחולצות', icon: 'image', color: 'blue', needs: 'images' },
    { id: 'crest', title: 'חצי סמל', sub: 'מזהים קבוצה מחלק מהסמל', icon: 'shield', color: 'orange', needs: 'crests' }
  ];
  CFG.MODE = Object.fromEntries(CFG.MODES.map((m) => [m.id, m]));
})(typeof window !== 'undefined' ? window : globalThis);
