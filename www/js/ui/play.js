/* The "game" tab (all game modes), the journey map, free play and head-to-head setup, "my teams". */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon, fmt } = KG;
  const ui = KG.ui;

  // Starts a game; if an unfinished game exists, asks first.
  KG.startGame = (fn) => {
    const s = KG.P.session;
    const run = () => {
      KG.game.abandon();
      const sess = fn();
      if (!sess) { KG.toast('אין מספיק שאלות למשחק הזה כרגע'); return; }
      KG.sound.play('tap');
      KG.go('quiz');
    };
    if (s && s.phase !== 'done' && s.answers && s.answers.length) {
      KG.confirm({ title: 'משחק חדש?', text: 'יש משחק שלא הסתיים (' + s.title + '). אם מתחילים משחק חדש, הוא לא יישמר.', yes: 'להתחיל משחק חדש', run });
    } else run();
  };

  // A small yes/no sheet.
  KG.SHEETS.confirm = {
    title: (d) => d.title || 'לאשר?',
    render: (d) => '<p style="margin:0;font-size:15px;color:var(--ink-2)">' + esc(d.text || '') + '</p>' +
      '<button type="button" class="btn' + (d.danger ? ' danger' : '') + '" data-action="confirm-yes">' + esc(d.yes || 'כן') + '</button>' +
      '<button type="button" class="btn secondary" data-action="close-sheet">' + esc(d.no || 'ביטול') + '</button>'
  };
  let pending = null;
  KG.confirm = (d) => { pending = d.run; KG.openSheet('confirm', d); };
  KG.A['confirm-yes'] = () => { const f = pending; pending = null; KG.closeSheet(true); if (f) f(); };

  const modeOpen = (m) => {
    if (m.needs === 'images') return KG.pick.pool({ images: 'only' }).filter((q) => q.sub !== 'crest').length >= 4;
    if (m.needs === 'crests') return KG.pick.pool({ images: 'only', sub: 'crest' }).length >= 4;
    return true;
  };

  KG.V.play = () => {
    let h = '<div class="top"><div class="titles"><span class="kicker">בוחרים איך לשחק</span><h1 class="h1">משחק</h1></div></div>';
    KG.CFG.MODES.forEach((m) => {
      const open = modeOpen(m);
      let sub = m.sub;
      if (m.id === 'journey') sub = 'שלב ' + Math.min(KG.P.journey.unlocked, KG.pick.journeyTotal()) + ' מתוך ' + KG.pick.journeyTotal();
      if (m.id === 'daily') { const d = KG.P.daily[KG.dateKey()]; sub = d ? 'שיחקת היום: ' + d.correct + '/' + d.total + ' · אפשר לשחק שוב בלי ניקוד' : m.sub; }
      if (m.id === 'survival' && KG.P.survival.best) sub = m.sub + ' · השיא שלך: ' + KG.P.survival.best;
      if (!open) sub = m.needs === 'crests' ? 'נפתח כשיהיו 4 סמלים. מוסיפים במצב עורך' : 'נפתח כשיהיו 4 תמונות. מוסיפים במצב עורך';
      h += '<button type="button" class="mode' + (open ? '' : ' locked') + '" data-action="mode" data-mode="' + m.id + '">' +
        '<span class="tile ' + m.color + '">' + icon(m.icon) + '</span><span class="grow"><b>' + esc(m.title) + '</b><span class="s">' + esc(sub) + '</span></span>' +
        (open ? icon('chevL', 'sm') : '<span class="lock">' + icon('lock', 'sm') + '</span>') + '</button>';
    });
    return h;
  };

  KG.A['mode'] = (el) => {
    const id = el.dataset.mode, m = KG.CFG.MODE[id];
    if (!m) return;
    if (!modeOpen(m)) { KG.openSheet('lockedMode', { id }); return; }
    if (id === 'journey') KG.go('journey');
    else if (id === 'daily') KG.startGame(() => KG.game.startDaily());
    else if (id === 'survival') KG.startGame(() => KG.game.startSurvival());
    else if (id === 'h2h') KG.openSheet('h2h');
    else if (id === 'team') KG.go('teams');
    else if (id === 'free') KG.openSheet('free', {});
    else if (id === 'image') KG.startGame(() => KG.game.startImages('image'));
    else if (id === 'crest') KG.openSheet('crest');
  };

  KG.SHEETS.lockedMode = {
    title: (d) => (KG.CFG.MODE[d.id] || {}).title || '',
    render: (d) => {
      const c = KG.img.counts();
      return '<div class="notice blue">' + icon('image', 'sm') + '<span class="grow">המצב הזה משתמש בתמונות אמיתיות ששמורות בטלפון. ' +
        (d.id === 'crest' ? 'כרגע יש ' + c.crest + ' סמלים, וצריך לפחות 4.' : 'כרגע יש ' + (c.player + c.stadium + c.shirt) + ' תמונות, וצריך לפחות 4.') + '</span></div>' +
        '<p class="fine">מוסיפים תמונות במצב עורך (הגדרות ← מצב עורך ← תמונות חסרות): בוחרים תמונה מהגלריה, והאפליקציה מכווצת ושומרת אותה. אפשר גם לקבל תמונות בחבילת עדכון.</p>' +
        '<button type="button" class="btn" data-action="go" data-view="editor">' + icon('key') + 'למצב עורך</button>';
    }
  };

  // ---- Journey map ----
  KG.V.journey = () => {
    const P = KG.P, total = KG.pick.journeyTotal();
    const cur = Math.min(P.journey.unlocked, total);
    const done = Object.values(P.journey.stages).filter((s) => s.done).length;
    let h = KG.backBar('מסע החידות', done + ' שלבים הושלמו מתוך ' + total);
    h += '<div class="notice">' + icon('info', 'sm') + '<span class="grow">בכל שלב 5 שאלות. 3 תשובות נכונות פותחות את השלב הבא, ו-5 מתוך 5 נותנות 3 כוכבים. ככל שמתקדמים, השאלות נעשות קשות יותר.</span></div>';
    h += '<div class="stages">';
    for (let n = 1; n <= total; n++) {
      const st = P.journey.stages[n];
      const locked = n > cur;
      const stars = st ? st.best || 0 : 0;
      const cls = locked ? ' locked' : n === cur && !(st && st.done) ? ' cur' : '';
      h += '<button type="button" class="stage' + cls + '" data-action="stage" data-n="' + n + '"' + (locked ? ' aria-disabled="true"' : '') + ' aria-label="שלב ' + n + '">' +
        (locked ? icon('lock', 'sm') : '<span class="num">' + n + '</span>') +
        '<span class="stars">' + [1, 2, 3].map((k) => icon('star', k <= stars ? '' : 'off')).join('') + '</span>' +
        '<span class="d">' + esc(KG.schema.DIFFS[KG.CFG.stageDiff(n)].short) + '</span></button>';
    }
    h += '</div>';
    if (total < 60) h += '<p class="fine center">שלבים נוספים נפתחים לבד כשנוספות שאלות למאגר.</p>';
    return h;
  };
  KG.A['stage'] = (el) => { const n = +el.dataset.n; KG.startGame(() => KG.game.startJourney(n)); };

  // ---- Free play ----
  KG.SHEETS.free = {
    full: true,
    title: () => 'משחק חופשי',
    init: (d) => {
      ui.form = { cats: d.cat ? [d.cat] : [], diffs: [], count: 10, types: [], teams: [] };
    },
    render: () => {
      const f = ui.form;
      const chip = (key, v, label) => '<button type="button" class="chip" data-action="free-toggle" data-k="' + key + '" data-v="' + esc(v) + '" aria-pressed="' + (f[key].includes(isNaN(v) ? v : +v) ? 'true' : 'false') + '">' + esc(label) + '</button>';
      const n = KG.pick.pool({ cats: f.cats, diffs: f.diffs, types: f.types, teams: f.teams }).length;
      let h = '<span class="section-label">קטגוריות (בלי בחירה = הכל)</span><div class="chips">' +
        KG.schema.CATS.filter((c) => !c.generated).map((c) => chip('cats', c.id, c.name)).join('') + '</div>';
      h += '<span class="section-label">רמת קושי</span><div class="chips">' + [1, 2, 3, 4, 5, 6].map((d) => chip('diffs', String(d), KG.schema.DIFFS[d].name)).join('') + '</div>';
      h += '<span class="section-label">סוג חידה</span><div class="chips">' + ['mc', 'tf', 'whoami', 'order'].map((t) => chip('types', t, KG.schema.TYPES[t].name)).join('') + '</div>';
      const teams = KG.C.teamsForChallenge(3).slice(0, 14);
      if (teams.length) h += '<span class="section-label">קבוצות (לא חובה)</span><div class="chips">' + teams.map((t) => chip('teams', t.id, t.team.he)).join('') + '</div>';
      h += '<span class="section-label">מספר שאלות</span>' + KG.seg('free-count', [5, 10, 15, 20].map((x) => ({ v: x, label: String(x) })), f.count);
      h += '<div class="notice ' + (n ? 'green' : 'orange') + '">' + icon(n ? 'check' : 'alert', 'sm') + '<span class="grow">' + (n ? fmt(n) + ' שאלות מתאימות לבחירה שלך' : 'אין שאלות שמתאימות לכל הבחירות. נסה להוריד חלק מהן.') + '</span></div>';
      h += '<button type="button" class="btn" data-action="free-go"' + (n ? '' : ' aria-disabled="true"') + '>' + icon('play') + 'מתחילים</button>';
      return h;
    }
  };
  KG.A['free-toggle'] = (el) => {
    const f = ui.form, k = el.dataset.k, v = k === 'diffs' ? +el.dataset.v : el.dataset.v;
    const i = f[k].indexOf(v);
    if (i >= 0) f[k].splice(i, 1); else f[k].push(v);
    KG.renderSheet();
  };
  KG.A['free-count'] = (el) => { ui.form.count = +el.dataset.v; KG.renderSheet(); };
  KG.A['free-go'] = () => {
    const f = ui.form;
    const cat = f.cats.length === 1 ? KG.schema.CAT[f.cats[0]] : null;
    KG.closeSheet(true);
    KG.startGame(() => KG.game.startFree({ cats: f.cats, diffs: f.diffs, types: f.types, teams: f.teams }, f.count, cat ? cat.name : 'משחק חופשי'));
  };

  // ---- Crest mode: how much of the crest to show ----
  KG.SHEETS.crest = {
    title: () => 'חצי סמל',
    render: () => {
      const n = KG.pick.pool({ images: 'only', sub: 'crest' }).length;
      const opt = (fx, ic, t, s) => KG.row('crest-go', ic, 'orange', t, s, ' data-fx="' + fx + '"');
      return '<p class="fine">' + n + ' סמלים במאגר. בוחרים כמה מהסמל רואים:</p><div class="card tight">' +
        opt('half', 'shield', 'חצי סמל', 'רואים רק את הצד הימני') + opt('quarter', 'grid', 'רבע סמל', 'רק הפינה העליונה') +
        opt('zoom', 'search', 'אזור קטן', 'זום חזק על חלק מהסמל') + opt('gray', 'eye', 'חצי באפור', 'בלי הצבעים של הקבוצה') + '</div>';
    }
  };
  KG.A['crest-go'] = (el) => { const fx = el.dataset.fx; KG.closeSheet(true); KG.startGame(() => KG.game.startImages('crest', fx)); };

  // ---- Head to head ----
  KG.SHEETS.h2h = {
    full: true,
    title: () => 'ראש בראש',
    init: () => { ui.form = { names: ['שחקן 1', 'שחקן 2'], per: 5, cats: [] }; },
    render: () => {
      const f = ui.form;
      let h = '<p class="fine">משחקים על אותו טלפון ומעבירים בתורות. כל שחקן מקבל אותו מספר שאלות, וכל סיבוב באותה רמת קושי לכולם.</p>';
      f.names.forEach((nm, i) => {
        h += '<div class="field"><label for="h2h' + i + '">שחקן ' + (i + 1) + '</label><div style="display:flex;gap:8px"><input id="h2h' + i + '" class="input" data-scope="h2h" data-bind="' + i + '" value="' + esc(nm) + '" maxlength="18">' +
          (f.names.length > 2 ? '<button type="button" class="round-btn" aria-label="הסרת שחקן" data-action="h2h-del" data-i="' + i + '">' + icon('close', 'sm') + '</button>' : '') + '</div></div>';
      });
      if (f.names.length < 4) h += '<button type="button" class="btn secondary small" style="align-self:flex-start" data-action="h2h-add">' + icon('plus', 'sm') + 'הוספת שחקן</button>';
      h += '<span class="section-label">שאלות לכל שחקן</span>' + KG.seg('h2h-per', [3, 5, 7, 10].map((x) => ({ v: x, label: String(x) })), f.per);
      h += '<span class="section-label">נושא (לא חובה)</span><div class="chips">' + KG.schema.CATS.filter((c) => !c.generated).map((c) =>
        '<button type="button" class="chip" data-action="h2h-cat" data-v="' + c.id + '" aria-pressed="' + (f.cats.includes(c.id) ? 'true' : 'false') + '">' + esc(c.name) + '</button>').join('') + '</div>';
      h += '<button type="button" class="btn" data-action="h2h-go">' + icon('swords') + 'מתחילים</button>';
      if (KG.P.settings.timer) h += '<p class="fine center">יש שעון של ' + KG.CFG.SECONDS + ' שניות לכל שאלה (אפשר לכבות בהגדרות).</p>';
      return h;
    }
  };
  KG.onInput.h2h = (el) => { ui.form.names[+el.dataset.bind] = el.value; };
  KG.A['h2h-add'] = () => { ui.form.names.push('שחקן ' + (ui.form.names.length + 1)); KG.renderSheet(); };
  KG.A['h2h-del'] = (el) => { ui.form.names.splice(+el.dataset.i, 1); KG.renderSheet(); };
  KG.A['h2h-per'] = (el) => { ui.form.per = +el.dataset.v; KG.renderSheet(); };
  KG.A['h2h-cat'] = (el) => { const c = ui.form.cats, v = el.dataset.v, i = c.indexOf(v); if (i >= 0) c.splice(i, 1); else c.push(v); KG.renderSheet(); };
  KG.A['h2h-go'] = () => {
    const f = ui.form;
    const names = f.names.map((n, i) => String(n || '').trim() || 'שחקן ' + (i + 1));
    KG.closeSheet(true);
    KG.startGame(() => KG.game.startH2H(names, f.per, f.cats.length ? { cats: f.cats } : {}));
  };

  // ---- My teams / challenge by team ----
  KG.V.teams = () => {
    const fav = KG.P.settings.favTeams;
    const list = KG.C.teamsForChallenge(5);
    let h = KG.backBar('הקבוצות שלי', 'אתגר לפי קבוצה');
    h += '<p class="fine">לוחצים על כוכב כדי לסמן קבוצה אהובה. קבוצות אהובות מופיעות ראשונות. לחיצה על קבוצה מתחילה אתגר של 10 שאלות עליה בלבד.</p>';
    if (!list.length) h += '<div class="empty"><span class="tile gray">' + icon('shield', 'lg') + '</span>עוד אין קבוצה עם מספיק שאלות.</div>';
    h += '<div class="card tight">';
    list.forEach((t) => {
      const solved = (KG.C.byTeam[t.id] || []).filter((q) => KG.P.q[q.id] && KG.P.q[q.id].s).length;
      h += '<div class="row"><button type="button" class="tile ' + (fav.includes(t.id) ? 'gold' : 'gray') + '" aria-label="קבוצה אהובה" data-action="fav-team" data-id="' + t.id + '">' + icon('star') + '</button>' +
        '<button type="button" class="grow" style="text-align:right" data-action="team-go" data-id="' + t.id + '"><span class="t">' + esc(t.team.he) + '</span><span class="s">' + t.count + ' שאלות · פתרת ' + solved + '</span></button>' +
        '<button type="button" class="btn small" data-action="team-go" data-id="' + t.id + '">' + icon('play', 'sm') + 'שחק</button></div>';
    });
    h += '</div>';
    return h;
  };
  KG.A['fav-team'] = (el) => {
    const f = KG.P.settings.favTeams, id = el.dataset.id, i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    KG.saveProgress(); KG.render(true);
  };
  KG.A['team-go'] = (el) => { const id = el.dataset.id; KG.startGame(() => KG.game.startTeam(id, 10)); };
})(typeof window !== 'undefined' ? window : globalThis);
