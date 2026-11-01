/* The profile tab (rank, personal stats, strong and weak categories) and the settings screen. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon, fmt } = KG;

  function catStats() {
    const rows = KG.schema.CATS.map((c) => ({ c, s: KG.P.cat[c.id] })).filter((x) => x.s && x.s.a >= 3)
      .map((x) => Object.assign(x, { p: x.s.c / x.s.a }));
    rows.sort((a, b) => b.p - a.p || b.s.a - a.s.a);
    return { best: rows[0] || null, worst: rows.length > 1 ? rows[rows.length - 1] : null };
  }

  KG.V.profile = () => {
    const P = KG.P, r = KG.CFG.rank(P.xp);
    const solved = Object.values(P.q).filter((x) => x && x.s).length;
    const cs = catStats();
    let h = '<div class="top"><div class="titles"><span class="kicker">הפרופיל שלי</span><h1 class="h1">' + esc(P.name || 'שחקן') + '</h1></div>' +
      '<button type="button" class="round-btn" aria-label="עריכת שם" data-action="open-sheet" data-sheet="name">' + icon('edit') + '</button>' +
      '<button type="button" class="round-btn" aria-label="הגדרות" data-action="go" data-view="settings">' + icon('gear') + '</button></div>';
    h += '<div class="hero"><div class="rank">' + icon(r.cur.icon, 'sm') + esc(r.cur.name) + '</div><div class="xp"><b class="num">' + fmt(P.xp) + '</b><span>נקודות</span></div>' +
      '<div class="bar"><span style="width:' + Math.round(r.pct * 100) + '%"></span></div><div class="next">' + (r.next ? 'הדרגה הבאה: ' + esc(r.next.name) + ' (' + fmt(r.next.min) + ')' : 'היכל התהילה!') + '</div></div>';
    const box = (v, l) => '<div class="statbox"><b class="num">' + v + '</b><span>' + esc(l) + '</span></div>';
    h += '<span class="section-label">סטטיסטיקות</span><div class="statgrid">' +
      box(fmt(P.games), 'משחקים') + box(fmt(solved), 'חידות שנפתרו') +
      box(KG.pct(P.correct, P.answered) + '%', 'אחוז הצלחה') + box(fmt(P.bestStreak), 'הכי הרבה ברצף') +
      box(fmt(P.bestScore), 'שיא ניקוד במשחק') + box(fmt(P.survival.best), 'שיא הישרדות') +
      box(fmt(Object.keys(P.seen.teams).length), 'קבוצות שזיהית') + box(fmt(Object.keys(P.seen.players).length), 'שחקנים שזיהית') +
      box(fmt(P.dayStreak.best), 'ימים ברצף (שיא)') + box(fmt(Object.keys(P.ach).length), 'הישגים') +
      '</div>';
    if (cs.best) {
      h += '<div class="card tight">' +
        '<div class="row"><span class="tile green">' + icon(cs.best.c.icon) + '</span><span class="grow"><span class="t">הכי חזק: ' + esc(cs.best.c.name) + '</span><span class="s">' + Math.round(cs.best.p * 100) + '% הצלחה</span></span></div>' +
        (cs.worst ? '<div class="row"><span class="tile red">' + icon(cs.worst.c.icon) + '</span><span class="grow"><span class="t">כדאי לחזק: ' + esc(cs.worst.c.name) + '</span><span class="s">' + Math.round(cs.worst.p * 100) + '% הצלחה</span></span>' +
          '<button type="button" class="btn small secondary" data-action="cat" data-cat="' + cs.worst.c.id + '">תרגול</button></div>' : '') + '</div>';
    } else h += '<p class="fine center">אחרי כמה משחקים יופיעו כאן הקטגוריה החזקה שלך וזו שכדאי לחזק.</p>';
    h += '<div class="card tight">' +
      KG.row('go', 'database', 'blue', 'ניהול ועדכון מאגר', fmt(KG.C.meta.questions) + ' שאלות · גרסה ' + KG.C.meta.contentVersion, ' data-view="data"') +
      KG.row('open-sheet', 'download', 'green', 'גיבוי ושחזור ההתקדמות', 'הנקודות, ההישגים והשיאים שלך', ' data-sheet="progress"') +
      KG.row('go', 'key', 'purple', 'מצב עורך', 'הוספת שאלות ותמונות (עם קוד)', ' data-view="editor"') +
      KG.row('share-app', 'share', 'orange', 'שיתוף האפליקציה עם חברים', 'קישור לאתר או קובץ ההתקנה') +
      KG.row('open-sheet', 'message', 'gold', 'פנייה / הצעת ייעול', 'מגיע ישירות למפתח', ' data-sheet="feedback"') +
      KG.row('open-sheet', 'info', 'gray', 'אודות', 'גרסה ' + KG.VERSION.version, ' data-sheet="about"') + '</div>';
    h += '<div class="made-by">Developed by <b>' + esc(KG.BRAND.maker) + '</b></div>';
    return h;
  };

  KG.SHEETS.name = {
    title: () => 'איך לקרוא לך?',
    init: (d) => { d.v = KG.P.name; },
    render: (d) => '<div class="field"><label for="nm">השם שיופיע בברכה</label><input id="nm" class="input" maxlength="20" data-scope="name" data-bind="v" value="' + esc(d.v) + '"></div>' +
      '<button type="button" class="btn" data-action="name-save">' + icon('check') + 'שמירה</button>'
  };
  KG.onInput.name = (el) => { KG.ui.sheet.data.v = el.value; };
  KG.A['name-save'] = () => { KG.P.name = String(KG.ui.sheet.data.v || '').trim().slice(0, 20); KG.saveProgress(); KG.closeSheet(true); KG.render(true); };

  // ---- Settings ----
  KG.V.settings = () => {
    const s = KG.P.settings;
    let h = KG.backBar('הגדרות');
    h += '<span class="section-label">מראה</span>' + KG.seg('set-theme', [{ v: 'dark', label: 'כהה', icon: 'moon' }, { v: 'light', label: 'בהיר', icon: 'sun' }, { v: 'system', label: 'לפי המכשיר', icon: 'phone' }], s.theme);
    h += '<span class="section-label">משחק</span><div class="card tight">' +
      '<div class="row"><span class="tile blue">' + icon(s.sound ? 'volume' : 'mute') + '</span><span class="grow"><span class="t">צלילים</span><span class="s">צליל לתשובה נכונה, שגויה והישגים</span></span>' + KG.sw('set-toggle', s.sound, 'צלילים', ' data-k="sound"') + '</div>' +
      '<div class="row"><span class="tile purple">' + icon('vibrate') + '</span><span class="grow"><span class="t">רטט</span><span class="s">רטט קצר בכל תשובה</span></span>' + KG.sw('set-toggle', s.vibrate, 'רטט', ' data-k="vibrate"') + '</div>' +
      '<div class="row"><span class="tile red">' + icon('timer') + '</span><span class="grow"><span class="t">שעון בהישרדות ובראש בראש</span><span class="s">' + KG.CFG.SECONDS + ' שניות לשאלה, ותשובה מהירה מקבלת בונוס</span></span>' + KG.sw('set-toggle', s.timer, 'שעון', ' data-k="timer"') + '</div>' +
      KG.row('go', 'shield', 'gold', 'הקבוצות שלי', s.favTeams.map((id) => (KG.C.team(id) || {}).he).filter(Boolean).join(', ') || 'בחירת קבוצות אהובות', ' data-view="teams"') + '</div>';
    h += '<span class="section-label">נתונים</span><div class="card tight">' +
      KG.row('go', 'database', 'blue', 'ניהול ועדכון מאגר', 'גרסה ' + KG.C.meta.contentVersion + ' · ייבוא עדכונים, גיבוי ושחזור', ' data-view="data"') +
      KG.row('open-sheet', 'download', 'green', 'גיבוי ושחזור ההתקדמות', 'שמירת הנקודות וההישגים לקובץ', ' data-sheet="progress"') +
      KG.row('go', 'key', 'purple', 'מצב עורך', 'הוספה ועריכה של שאלות ותמונות', ' data-view="editor"') + '</div>';
    h += '<span class="section-label">כללי</span><div class="card tight">' +
      KG.row('share-app', 'share', 'orange', 'שיתוף האפליקציה עם חברים', 'תמיד הגרסה האחרונה') +
      (KG.isNative() ? KG.row('save-apk', 'folder', 'green', 'שמירת קובץ ההתקנה בטלפון', 'גיבוי של הגרסה האחרונה בתיקיית Documents') : '') +
      KG.row('check-update', 'refresh', 'blue', 'בדיקת עדכונים', 'גרסה ' + KG.VERSION.version + (KG.VERSION.build !== 'dev' ? ' (בנייה ' + KG.VERSION.build + ')' : '')) +
      KG.row('open-sheet', 'message', 'gold', 'פנייה / הצעת ייעול', 'רעיון או תקלה, ישירות למפתח', ' data-sheet="feedback"') +
      KG.row('open-sheet', 'info', 'gray', 'אודות', KG.BRAND.name + ' · ' + KG.BRAND.en, ' data-sheet="about"') + '</div>';
    h += '<div class="made-by">Developed by <b>' + esc(KG.BRAND.maker) + '</b></div>';
    return h;
  };
  KG.A['set-theme'] = (el) => { KG.P.settings.theme = el.dataset.v; KG.saveProgress(); KG.applyTheme(); KG.render(true); };
  KG.A['set-toggle'] = (el) => { const k = el.dataset.k; KG.P.settings[k] = !KG.P.settings[k]; KG.saveProgress(); KG.render(true); if (k === 'sound' && KG.P.settings.sound) KG.sound.play('correct'); };
})(typeof window !== 'undefined' ? window : globalThis);
