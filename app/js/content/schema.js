/* The shape of every record in the question bank, and the checks every record must pass — in the app
   (before an import) and in the build (scripts/build-content.mjs). A record that fails is never played. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const S = (KG.schema = {});

  // Main categories. il = counted as Israeli football.
  S.CATS = [
    { id: 'israel', name: 'כדורגל ישראלי', icon: 'flag', color: 'blue', il: true, sub: 'ליגת העל, הגביע, הנבחרת ואירופה' },
    { id: 'worldcup', name: 'גביע העולם', icon: 'globe', color: 'gold', sub: 'מונדיאלים, גמרים ומלכי שערים' },
    { id: 'nations', name: 'נבחרות ואליפויות', icon: 'shield', color: 'purple', sub: 'יורו, קופה אמריקה, אפריקה ועוד' },
    { id: 'europe', name: 'ליגת האלופות ואירופה', icon: 'star', color: 'blue', sub: 'גמרים, אלופות ולילות גדולים' },
    { id: 'leagues', name: 'הליגות הגדולות', icon: 'layers', color: 'green', sub: 'ספרד, אנגליה, איטליה, גרמניה וצרפת' },
    { id: 'players', name: 'שחקנים', icon: 'user', color: 'orange', sub: 'כוכבים, קריירות ותארים' },
    { id: 'clubs', name: 'קבוצות ואצטדיונים', icon: 'stadium', color: 'green', sub: 'מועדונים, כינויים ובתים' },
    { id: 'coaches', name: 'מאמנים', icon: 'whistle', color: 'purple', sub: 'מי אימן את מי ומתי' },
    { id: 'records', name: 'שיאים וסטטיסטיקות', icon: 'trophy', color: 'gold', sub: 'הכי הרבה, הכי מהר, הכי צעיר' },
    { id: 'numbers', name: 'מספרי חולצות', icon: 'shirt', color: 'red', sub: 'מי לובש איזה מספר העונה' },
    { id: 'images', name: 'זיהוי תמונות', icon: 'image', color: 'blue', sub: 'סמלים, שחקנים, אצטדיונים וחולצות', generated: true }
  ];
  S.CAT = Object.fromEntries(S.CATS.map((c) => [c.id, c]));

  S.DIFFS = [
    null,
    { n: 1, name: 'מתחיל', short: 'מתחיל', color: 'green' },
    { n: 2, name: 'אוהד', short: 'אוהד', color: 'green' },
    { n: 3, name: 'מתקדם', short: 'מתקדם', color: 'blue' },
    { n: 4, name: 'מומחה', short: 'מומחה', color: 'purple' },
    { n: 5, name: 'אגדה', short: 'אגדה', color: 'orange' },
    { n: 6, name: 'בלתי אפשרי', short: 'בלתי אפשרי', color: 'red' }
  ];

  // Question types. New types are added here and in the quiz screen (KG.qtypes), nothing else changes.
  S.TYPES = {
    mc: { name: 'שאלה אמריקאית' },
    tf: { name: 'נכון או לא נכון' },
    order: { name: 'סדר לפי הזמן' },
    whoami: { name: 'מי אני?' },
    img: { name: 'זיהוי תמונה' }
  };
  S.IMAGE_KINDS = {
    crest: { name: 'סמל קבוצה', of: 'teams' },
    player: { name: 'תמונת שחקן', of: 'players' },
    'shirt-home': { name: 'חולצת בית', of: 'teams' },
    'shirt-away': { name: 'חולצת חוץ', of: 'teams' },
    stadium: { name: 'אצטדיון', of: 'stadiums' },
    trophy: { name: 'גביע', of: 'comps' },
    photo: { name: 'תמונה לשאלה', of: null }
  };
  S.ENTITY_KINDS = ['teams', 'players', 'nations', 'comps', 'stadiums'];

  const isStr = (s, max) => typeof s === 'string' && s.trim().length > 0 && (!max || s.length <= max);
  const ID = /^[a-z0-9][a-z0-9-]{1,60}$/;
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const same = (a, b) => KG.norm(a) === KG.norm(b);

  S.checkQuestion = (q, opts) => {
    const e = [];
    opts = opts || {};
    if (!q || typeof q !== 'object') return ['לא רשומה'];
    if (!ID.test(String(q.id || ''))) e.push('מזהה לא תקין');
    if (!Number.isInteger(q.rev) || q.rev < 1) e.push('rev חייב להיות מספר שלם מ-1');
    if (!S.TYPES[q.type]) e.push('סוג שאלה לא מוכר: ' + q.type);
    if (!S.CAT[q.cat]) e.push('קטגוריה לא מוכרת: ' + q.cat);
    if (!Number.isInteger(q.diff) || q.diff < 1 || q.diff > 6) e.push('רמת קושי חייבת להיות 1 עד 6');
    if (!isStr(q.q, 320)) e.push('חסר נוסח שאלה (עד 320 תווים)');
    if (q.type === 'mc' || q.type === 'whoami' || q.type === 'img') {
      if (!isStr(q.a, 80)) e.push('חסרה תשובה נכונה');
      if (!Array.isArray(q.w) || q.w.length < 3) e.push('צריך לפחות 3 תשובות שגויות');
      else {
        if (q.w.some((x) => !isStr(x, 80))) e.push('תשובה שגויה ריקה');
        if (q.w.some((x) => same(x, q.a))) e.push('התשובה הנכונה מופיעה גם כשגויה');
        if (new Set(q.w.map(KG.norm)).size !== q.w.length) e.push('תשובות שגויות כפולות');
      }
    }
    if (q.type === 'tf' && typeof q.a !== 'boolean') e.push('בשאלת נכון/לא נכון התשובה היא true או false');
    if (q.type === 'order') {
      if (!Array.isArray(q.items) || q.items.length < 3 || q.items.length > 5) e.push('בשאלת סידור צריך 3 עד 5 פריטים');
      else {
        if (q.items.some((it) => !it || !isStr(it.t, 80) || typeof it.k !== 'number')) e.push('פריט בלי טקסט או בלי שנה');
        for (let i = 1; i < q.items.length; i++) if (!(q.items[i].k > q.items[i - 1].k)) { e.push('הפריטים חייבים להיות בסדר עולה, בלי שנים זהות'); break; }
      }
    }
    if (q.type === 'whoami' && (!Array.isArray(q.clues) || q.clues.length < 2 || q.clues.some((c) => !isStr(c, 200)))) e.push('ב"מי אני" צריך 2 רמזים לפחות');
    if (q.type === 'img' && !opts.generated && !isStr(q.img)) e.push('בשאלת תמונה חסר מזהה תמונה');
    if (q.hints != null && (!Array.isArray(q.hints) || q.hints.length > 3 || q.hints.some((h) => !isStr(h, 160)))) e.push('עד 3 רמזים, כל אחד עד 160 תווים');
    if (q.explain != null && typeof q.explain !== 'string') e.push('הסבר לא תקין');
    if (!opts.generated) {
      if (!isStr(q.src)) e.push('חסר מקור המידע');
      if (!DATE.test(String(q.ver || ''))) e.push('חסר תאריך אימות (YYYY-MM-DD)');
    }
    if ((q.tags || []).includes('current') && !DATE.test(String(q.asOf || '') + (String(q.asOf || '').length === 7 ? '-01' : ''))) e.push('שאלה על נתון עכשווי צריכה asOf (מועד הנתון)');
    ['teams', 'players', 'tags'].forEach((k) => { if (q[k] != null && (!Array.isArray(q[k]) || q[k].some((x) => typeof x !== 'string'))) e.push(k + ' חייב להיות רשימה'); });
    return e;
  };

  S.checkEntity = (kind, x) => {
    const e = [];
    if (!x || typeof x !== 'object') return ['לא רשומה'];
    if (!ID.test(String(x.id || ''))) e.push('מזהה לא תקין');
    if (!isStr(x.he, 80)) e.push('חסר שם בעברית');
    if (x.en != null && !isStr(x.en, 80)) e.push('שם באנגלית לא תקין');
    if (x.rev != null && (!Number.isInteger(x.rev) || x.rev < 1)) e.push('rev לא תקין');
    if (kind === 'players' && x.clubs != null && !Array.isArray(x.clubs)) e.push('clubs חייב להיות רשימה');
    if (x.founded != null && !(Number.isInteger(x.founded) && x.founded > 1850 && x.founded <= 2030)) e.push('שנת הקמה לא תקינה');
    if (x.opened != null && !(Number.isInteger(x.opened) && x.opened > 1850 && x.opened <= 2030)) e.push('שנת פתיחה לא תקינה');
    return e;
  };

  S.checkImage = (m) => {
    const e = [];
    if (!m || typeof m !== 'object') return ['לא רשומה'];
    if (!ID.test(String(m.id || ''))) e.push('מזהה תמונה לא תקין');
    if (!S.IMAGE_KINDS[m.kind]) e.push('סוג תמונה לא מוכר');
    if (S.IMAGE_KINDS[m.kind] && S.IMAGE_KINDS[m.kind].of && !isStr(m.for)) e.push('לא צוין למי שייכת התמונה');
    if (!isStr(m.source)) e.push('חסר מקור התמונה');
    if (!isStr(m.license)) e.push('חסר רישיון / זכויות שימוש');
    return e;
  };
})(typeof window !== 'undefined' ? window : globalThis);
