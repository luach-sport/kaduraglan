// Helpers for writing questions compactly. scripts/build-content.mjs turns these files into
// www/data/content/*.json and checks every record with the same rules the app uses.
//
//   mc(id, cat, diff, question, answer, [3+ wrong answers], explanation, extra)
//   tf(id, cat, diff, statement, true|false, explanation, extra)
//   order(id, cat, diff, prompt, [[text, year], …] in the right order, explanation, extra)
//   who(id, cat, diff, [clues…], answer, [wrong answers], explanation, extra)
//
// extra: { h: [hints], t: [team / nation ids], p: [player ids], grp, il: true, asOf: 'YYYY-MM', tags, src, rev }
// The id never changes once published (progress is kept by id). To change a published question,
// raise its rev (in an update package: "update" with a higher rev).

export const VERIFIED = '2026-11-01';

export const SRC = {
  wc: 'FIFA; ויקיפדיה – גביע העולם בכדורגל',
  wc26: 'FIFA; סיכומי טורניר גביע העולם 2026 (יולי 2026)',
  euro: 'UEFA; ויקיפדיה – אליפות אירופה בכדורגל',
  copa: 'CONMEBOL; ויקיפדיה – קופה אמריקה',
  ucl: 'UEFA; ויקיפדיה – ליגת האלופות ורשימת הגמרים',
  ucl26: 'UEFA; דיווחים על גמר ליגת האלופות בבודפשט (30.5.2026)',
  uel: 'UEFA; ויקיפדיה – הליגה האירופית',
  bdo: 'France Football; ויקיפדיה – כדור הזהב',
  bdo26: 'France Football; טקס כדור הזהב 2026 (26.10.2026, לונדון)',
  laliga: 'LaLiga; ויקיפדיה – רשימת אלופות ספרד',
  pl: 'Premier League; ויקיפדיה – רשימת אלופות אנגליה',
  seriea: 'Lega Serie A; ויקיפדיה – רשימת אלופות איטליה',
  buli: 'DFL; ויקיפדיה – רשימת אלופות גרמניה',
  ligue1: 'LFP; ויקיפדיה – רשימת אלופות צרפת',
  europe26: 'סיכומי עונת 2025/26 בליגות אירופה (מאי 2026)',
  ilchamps: 'ההתאחדות לכדורגל בישראל; ויקיפדיה – רשימת עונות ליגת העל',
  il26: 'ויקיפדיה – ליגת העל 2025/26; ג׳רוזלם פוסט (מאי 2026)',
  ilcup: 'ההתאחדות לכדורגל בישראל; ויקיפדיה – רשימת זוכות גביע המדינה',
  ilteam: 'ההתאחדות לכדורגל בישראל; ויקיפדיה – נבחרת ישראל בכדורגל',
  ileurope: 'UEFA; ויקיפדיה – קבוצות ישראליות במפעלים האירופיים',
  ilstadium: 'ויקיפדיה – אצטדיוני הכדורגל בישראל',
  club: 'האתר הרשמי של המועדון; ויקיפדיה',
  player: 'ויקיפדיה; Transfermarkt',
  coach: 'ויקיפדיה; האתרים הרשמיים של המועדונים',
  barca27: 'FC Barcelona – מספרי החולצות לעונת 2026/27 (פורסם 2.9.2026)',
  real27: 'Real Madrid – מספרי החולצות לעונת 2026/27 (פורסם 10.8.2026)',
  mta27: 'UEFA – סגל מכבי תל אביב לליגת הקונפרנס 2026/27',
  pl27: 'סגלי הקבוצות לעונת 2026/27 בפרמייר ליג (ספטמבר 2026)',
  general: 'ויקיפדיה; מקורות רשמיים של ההתאחדויות'
};

function extra(x) {
  x = x || {};
  const o = {};
  if (x.h && x.h.length) o.hints = x.h;
  if (x.t && x.t.length) o.teams = x.t;
  if (x.p && x.p.length) o.players = x.p;
  if (x.grp) o.grp = x.grp;
  if (x.il) o.il = true;
  if (x.asOf) { o.asOf = x.asOf; o.tags = (x.tags || []).concat(['current']); }
  else if (x.tags) o.tags = x.tags;
  if (x.sub) o.sub = x.sub;
  o.src = SRC[x.src] || x.src || SRC.general;
  o.ver = x.ver || VERIFIED;
  return o;
}
const head = (id, type, cat, diff, q, x) => ({ id, rev: (x && x.rev) || 1, type, cat, diff, q });

export const mc = (id, cat, diff, q, a, w, explain, x) => Object.assign(head(id, 'mc', cat, diff, q, x), { a, w, explain }, extra(x));
export const tf = (id, cat, diff, q, a, explain, x) => Object.assign(head(id, 'tf', cat, diff, q, x), { a, explain }, extra(x));
export const order = (id, cat, diff, q, items, explain, x) => Object.assign(head(id, 'order', cat, diff, q, x), { items: items.map(([t, k]) => ({ t, k })), explain }, extra(x));
export const who = (id, cat, diff, clues, a, w, explain, x) => Object.assign(head(id, 'whoami', cat, diff, 'מי אני?', x), { clues, a, w, explain }, extra(x));
// Shirt-number questions: always tied to a season and a date.
export const num = (id, diff, q, a, w, explain, x) => mc(id, 'numbers', diff, q, a, w, explain, Object.assign({ asOf: '2026-11', grp: 'num-' + ((x && x.t && x.t[0]) || 'x') }, x));
