/* "ניהול ועדכון מאגר": what's in the bank, new questions from the internet or from a package file,
   backups of the bank and restoring them, the update log, and how many questions each category has. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon, fmt } = KG;
  const ui = KG.ui;

  KG.V.data = () => {
    const C = KG.C, m = C.meta, ov = C.overlay;
    const il = m.il, world = m.questions - il;
    let h = KG.backBar('ניהול ועדכון מאגר', 'הכל שמור בטלפון ועובד בלי אינטרנט');
    const r = (ic, color, t, v) => '<div class="row"><span class="tile ' + color + '">' + icon(ic) + '</span><span class="grow"><span class="t">' + esc(t) + '</span></span><span class="v">' + v + '</span></div>';
    h += '<div class="card tight">' +
      r('database', 'blue', 'גרסת המאגר', '<span class="num">' + m.contentVersion + '</span>') +
      r('calendar', 'gold', 'עדכון אחרון', esc(m.updatedAt ? KG.dateFull(m.updatedAt) : m.baseDate ? KG.dateFull(KG.keyToTime(m.baseDate)) : '–')) +
      r('question', 'green', 'שאלות', '<span class="num">' + fmt(m.questions) + '</span>') +
      r('flag', 'blue', 'מתוכן כדורגל ישראלי', '<span class="num">' + fmt(il) + ' (' + KG.pct(il, m.questions) + '%)</span>') +
      r('globe', 'purple', 'כדורגל עולמי', '<span class="num">' + fmt(world) + '</span>') +
      r('user', 'orange', 'שחקנים', '<span class="num">' + fmt(m.players) + '</span>') +
      r('shield', 'blue', 'קבוצות', '<span class="num">' + fmt(m.teams) + '</span>') +
      r('stadium', 'green', 'אצטדיונים', '<span class="num">' + fmt(m.stadiums) + '</span>') +
      r('image', 'gold', 'תמונות', '<span class="num">' + fmt(m.images) + '</span>') +
      (m.review ? r('alert', 'orange', 'ממתינות לבדיקה (לא במשחק)', '<span class="num">' + m.review + '</span>') : '') + '</div>';

    if (ui.lastImport) h += reportCard(ui.lastImport);
    const O = KG.online2;
    h += '<button type="button" class="btn" data-action="content-check"' + (O.state === 'checking' ? ' aria-disabled="true"' : '') + '>' + icon('refresh') + (O.state === 'checking' ? 'בודק…' : 'בדיקת עדכוני שאלות עכשיו') + '</button>';
    h += '<p class="fine center">' + (KG.online() ? 'כשיש אינטרנט האפליקציה בודקת לבד פעם בכמה שעות, ומוסיפה שאלות חדשות בלי למחוק כלום.' : 'אין חיבור כרגע. אפשר לייבא חבילה מקובץ.') + '</p>';
    h += '<div class="card tight">' +
      KG.row('import-pkg', 'upload', 'green', 'ייבוא חבילת עדכון', 'קובץ ZIP או JSON מהטלפון, בלי אינטרנט') +
      KG.row('export-content', 'download', 'blue', 'גיבוי המאגר', 'כל התוספות והתמונות לקובץ אחד') +
      KG.row('open-sheet', 'refresh', 'orange', 'שחזור מגיבוי', 'גיבוי אוטומטי או קובץ שמרת', ' data-sheet="restore"') + '</div>';

    const miss = KG.img.missing();
    const ic = KG.img.counts();
    h += '<button type="button" class="notice' + (miss.length ? ' gold' : ' green') + '" data-action="go" data-view="editor">' + icon('image', 'sm') + '<span class="grow">' +
      'תמונות: ' + ic.crest + ' סמלים, ' + ic.player + ' שחקנים, ' + ic.stadium + ' אצטדיונים, ' + ic.shirt + ' חולצות. ' + (miss.length ? 'חסרות ' + miss.length + ' (רשימה מלאה במצב עורך).' : '') + '</span>' + icon('chevL', 'sm') + '</button>';

    h += '<span class="section-label">שאלות לפי קטגוריה</span><div class="card"><table class="table"><tr><th>קטגוריה</th><th style="text-align:left">שאלות</th></tr>' +
      KG.schema.CATS.map((c) => '<tr><td>' + esc(c.name) + '</td><td class="n num">' + fmt((C.byCat[c.id] || []).length) + '</td></tr>').join('') + '</table></div>';
    const byD = [1, 2, 3, 4, 5, 6].map((d) => C.active.filter((q) => q.diff === d && q.cat !== 'images').length);
    h += '<span class="section-label">לפי רמת קושי</span><div class="card"><table class="table">' + byD.map((n, i) => '<tr><td>' + KG.diffTag(i + 1) + '</td><td class="n num">' + fmt(n) + '</td></tr>').join('') + '</table></div>';

    h += '<span class="section-label">יומן עדכונים</span><div class="card">';
    const log = (ov.log || []).slice(0, 20);
    if (!log.length) h += '<p class="fine">עוד לא היו עדכונים. המאגר הוא זה שהגיע עם האפליקציה (גרסה ' + m.baseVersion + ').</p>';
    log.forEach((e) => {
      const parts = [];
      if (e.added) parts.push(e.added + ' נוספו');
      if (e.updated) parts.push(e.updated + ' עודכנו');
      if (e.removed) parts.push(e.removed + ' הוסרו');
      if (e.images) parts.push(e.images + ' תמונות');
      if (e.rejected) parts.push(e.rejected + ' נדחו');
      h += '<div class="list-item"><span class="tile ' + (e.ok ? 'green' : 'orange') + '">' + icon(e.ok ? 'check' : 'alert') + '</span><span class="grow"><span class="t">' + esc(e.title || e.id) + '</span><span class="s">' +
        esc(KG.dateFull(e.ts) + ' ' + KG.time(e.ts) + ' · ' + ({ online: 'מהאינטרנט', file: 'מקובץ', editor: 'מהעורך', backup: 'שחזור' }[e.source] || e.source) + (parts.length ? ' · ' + parts.join(', ') : ' · לא נוסף כלום')) + '</span></span></div>';
    });
    h += '</div>';
    h += '<p class="fine">איך מכינים חבילת עדכון במחשב: ההסבר המלא נמצא בקובץ docs/updates.md בפרויקט. שאלה קיימת מתעדכנת רק כשהחבילה אומרת זאת במפורש (update עם rev גבוה יותר), ושום דבר לא נמחק בעדכון רגיל.</p>';
    return h;
  };

  function reportCard(r) {
    if (r.error) return '<div class="notice red">' + icon('alert', 'sm') + '<span class="grow"><b>הייבוא לא בוצע.</b> ' + esc(r.error) + '</span></div>';
    if (r.already) return '<div class="notice blue">' + icon('info', 'sm') + '<span class="grow">החבילה "' + esc(r.title || r.id) + '" כבר הותקנה קודם. לא השתנה כלום, ואין כפילויות.</span></div>';
    let h = '<div class="notice ' + (r.changed ? 'green' : 'gold') + '">' + icon(r.changed ? 'check' : 'info', 'sm') + '<span class="grow"><b>' + esc(r.title || r.id) + '</b><br>' +
      r.added + ' שאלות חדשות נוספו · ' + r.updated + ' שאלות קיימות עודכנו · ' + r.rejected.length + ' רשומות נדחו' + (r.images ? ' · ' + r.images + ' תמונות' : '') + (r.removed ? ' · ' + r.removed + ' הוסרו' : '') + (r.skipped ? ' · ' + r.skipped + ' כבר היו (דילגנו)' : '') + '</span></div>';
    if (r.rejected.length) {
      h += '<div class="card"><span class="section-label" style="margin:0 0 6px">מה נדחה ולמה</span>' + r.rejected.slice(0, 30).map((x) =>
        '<div class="list-item"><span class="tile red">' + icon('close', 'sm') + '</span><span class="grow"><span class="t ltr" style="text-align:right">' + esc(x.id) + '</span><span class="s">' + esc(x.reason) + '</span></span></div>').join('') + '</div>';
    }
    return h;
  }

  KG.A['content-check'] = async () => {
    if (!KG.online()) { KG.toast('אין חיבור לאינטרנט. אפשר לייבא חבילה מקובץ'); return; }
    const p = KG.online2.check(true);
    KG.render(true);
    const sum = await p;
    if (KG.online2.error) KG.toast(KG.online2.error);
    else if (sum && sum.packages.length) { KG.toast('נוספו ' + sum.added + ' שאלות חדשות' + (sum.updated ? ' ועודכנו ' + sum.updated : '')); ui.lastImport = null; }
    else KG.toast('המאגר כבר מעודכן');
    KG.render(true);
  };

  KG.A['import-pkg'] = async () => {
    const f = await KG.pickFile('');
    if (!f) return;
    KG.toast('בודק את החבילה…', 15000);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      ui.lastImport = await KG.pkg.importBytes(bytes, 'file');
      KG.toast(ui.lastImport.already ? 'החבילה כבר הותקנה' : 'הייבוא הסתיים');
    } catch (e) {
      console.warn('import', e);
      ui.lastImport = { error: e && e.user ? e.message : 'הקובץ לא תקין. המאגר לא השתנה.' };
      KG.toast('הייבוא לא בוצע');
    }
    if (ui.view !== 'data') KG.go('data'); else KG.render(true);
  };

  KG.A['export-content'] = async () => {
    KG.toast('מכין גיבוי…');
    const bytes = await KG.pkg.exportContent();
    await KG.saveFile(KG.BRAND.file + '-מאגר-' + KG.dateKey() + '.zip', bytes, 'application/zip', 'גיבוי המאגר של ' + KG.BRAND.name);
  };

  KG.SHEETS.restore = {
    full: true,
    title: () => 'שחזור מגיבוי',
    init: async (d) => { d.list = null; KG.pkg.listBackups().then((l) => { d.list = l; if (KG.ui.sheet && KG.ui.sheet.name === 'restore') KG.renderSheet(); }); },
    render: (d) => {
      let h = '<p class="fine">לפני כל ייבוא האפליקציה שומרת לבד גיבוי של המאגר. אפשר לחזור לאחד מהם, או לשחזר מקובץ גיבוי ששמרת. השחזור לא נוגע בהתקדמות, בנקודות ובהישגים שלך.</p>';
      if (!d.list) h += '<p class="fine center">טוען…</p>';
      else if (!d.list.length) h += '<div class="notice">' + icon('info', 'sm') + '<span class="grow">עוד אין גיבויים אוטומטיים (הם נוצרים לפני ייבוא).</span></div>';
      else h += '<div class="card tight">' + d.list.map((b) => KG.row('restore-auto', 'clock', 'blue', KG.dateFull(b.ts) + ' ' + KG.time(b.ts), (b.reason || '') + ' · ' + fmt(b.questions || 0) + ' שאלות', ' data-key="' + esc(b.key) + '"')).join('') + '</div>';
      h += '<button type="button" class="btn secondary" data-action="restore-file">' + icon('folder') + 'שחזור מקובץ גיבוי</button>';
      return h;
    }
  };
  KG.A['restore-auto'] = (el) => {
    const key = el.dataset.key;
    KG.confirm({ title: 'לשחזר את המאגר?', text: 'המאגר יחזור למצב שהיה בגיבוי. לפני כן נשמר גיבוי של המצב הנוכחי, כך שאפשר לחזור.', yes: 'כן, לשחזר', run: async () => {
      try { await KG.pkg.restoreBackup(key); KG.toast('המאגר שוחזר'); } catch (e) { KG.toast(e.user ? e.message : 'השחזור לא הצליח'); }
      KG.render(true);
    } });
  };
  KG.A['restore-file'] = async () => {
    KG.closeSheet(true);
    const f = await KG.pickFile('');
    if (!f) return;
    try {
      const bk = await KG.pkg.readContentBackup(new Uint8Array(await f.arrayBuffer()));
      KG.confirm({ title: 'לשחזר מהקובץ?', text: 'התוספות למאגר יוחלפו במה שבקובץ (' + Object.keys(bk.overlay.questions).length + ' שאלות, ' + Object.keys(bk.images).length + ' תמונות). השאלות שמגיעות עם האפליקציה נשארות תמיד.', yes: 'כן, לשחזר', run: async () => {
        try { await KG.pkg.restoreContent(bk); KG.toast('המאגר שוחזר'); } catch (e) { KG.toast('השחזור לא הצליח'); }
        KG.render(true);
      } });
    } catch (e) { KG.toast(e.user ? e.message : 'הקובץ לא תקין'); }
  };

  // ---- The player's own progress backup ----
  KG.SHEETS.progress = {
    title: () => 'גיבוי ושחזור ההתקדמות',
    render: () => '<p class="fine">הנקודות, ההישגים, השיאים וההגדרות שלך נשמרים רק בטלפון. כדאי לשמור גיבוי מדי פעם (בדרייב או בוואטסאפ לעצמך). הגיבוי הזה נפרד מהמאגר: עדכון שאלות אף פעם לא מוחק אותו.</p>' +
      '<div class="notice">' + icon('info', 'sm') + '<span class="grow">' + fmt(KG.P.xp) + ' נקודות · ' + Object.keys(KG.P.ach).length + ' הישגים · ' + fmt(KG.P.games) + ' משחקים</span></div>' +
      '<button type="button" class="btn" data-action="progress-export">' + icon('download') + 'שמירת גיבוי</button>' +
      '<button type="button" class="btn secondary" data-action="progress-import">' + icon('upload') + 'שחזור מגיבוי</button>'
  };
  KG.A['progress-export'] = () => KG.saveFile(KG.BRAND.file + '-התקדמות-' + KG.dateKey() + '.json', KG.progressBackup(), 'application/json', 'גיבוי ההתקדמות ב' + KG.BRAND.name);
  KG.A['progress-import'] = async () => {
    KG.closeSheet(true);
    const f = await KG.pickFile('');
    if (!f) return;
    try {
      const p = KG.readProgressBackup(await f.text());
      KG.confirm({ title: 'לשחזר את ההתקדמות?', text: 'ההתקדמות שבטלפון תוחלף בזו שבגיבוי (' + fmt(p.xp) + ' נקודות, ' + Object.keys(p.ach).length + ' הישגים).', yes: 'כן, לשחזר', run: () => {
        KG.P = p; KG.P.session = null; KG.saveProgress(true); KG.applyTheme(); KG.toast('ההתקדמות שוחזרה'); KG.setTab('home');
      } });
    } catch (e) { KG.toast(e.message || 'הקובץ לא תקין'); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
