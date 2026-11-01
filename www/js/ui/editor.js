/* Editor mode (behind an access code): add and fix questions, add real pictures from the phone's gallery
   (shrunk before saving), see reported mistakes, and export everything as an update package. Changes are
   saved in the phone's bank with stable ids, exactly like an update package, so nothing is overwritten. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon, fmt } = KG;
  const ui = KG.ui;
  const DEFAULT_CODE = '2026';
  ui.editorOpen = false;
  ui.code = '';

  const hashCode = async (c) => (await KG.pkg.sha256(new TextEncoder().encode('kaduraglan:' + c)));
  const codeOk = async (c) => (await hashCode(c)) === (KG.P.editorHash || (await hashCode(DEFAULT_CODE)));

  KG.V.editor = () => {
    if (!ui.editorOpen) return lockScreen();
    const ov = KG.C.overlay;
    const myQ = Object.values(ov.questions).filter((q) => q.origin === 'editor').length;
    const myI = Object.values(ov.images).filter((m) => m.origin === 'editor').length;
    const miss = KG.img.missing().length;
    const reps = KG.P.reports.length;
    let h = KG.backBar('מצב עורך', 'שינויים שלך: ' + myQ + ' שאלות · ' + myI + ' תמונות');
    h += '<div class="notice blue">' + icon('info', 'sm') + '<span class="grow">כל שינוי נשמר בטלפון עם מזהה קבוע ומספר גרסה, כמו חבילת עדכון. שאלה ששינית מקבלת גרסה חדשה, ושום דבר לא נמחק. כדי להעביר את השינויים לטלפון אחר (או למפתח), מייצאים אותם כחבילה.</span></div>';
    h += '<div class="card tight">' +
      KG.row('qform-new', 'plus', 'green', 'הוספת שאלה', 'שאלה אמריקאית או נכון / לא נכון') +
      KG.row('go', 'edit', 'blue', 'עריכת שאלה קיימת', fmt(KG.C.questions.filter((q) => !q.generated).length) + ' שאלות במאגר', ' data-view="edit-list"') +
      KG.row('go', 'image', 'gold', 'תמונות חסרות', miss ? miss + ' תמונות חסרות' : 'אין תמונות חסרות', ' data-view="img-missing"') +
      KG.row('go', 'flag', 'red', 'שאלות שדווחו', reps ? reps + ' דיווחים' : 'אין דיווחים', ' data-view="reports"') +
      KG.row('editor-export', 'share', 'purple', 'ייצוא השינויים שלי כחבילה', 'קובץ ZIP שאפשר לייבא בכל טלפון') +
      KG.row('open-sheet', 'key', 'gray', 'שינוי קוד הגישה', 'הקוד שפותח את מצב העורך', ' data-sheet="newCode"') +
      KG.row('editor-lock', 'lock', 'gray', 'יציאה ממצב עורך', '') + '</div>';
    return h;
  };

  function lockScreen() {
    let h = KG.backBar('מצב עורך', 'כניסה עם קוד גישה');
    h += '<div class="card" style="display:flex;flex-direction:column;gap:14px;align-items:center"><span class="tile purple" style="width:60px;height:60px;border-radius:18px">' + icon('key', 'lg') + '</span>' +
      '<b>הקלידו את קוד הגישה</b><div class="code-dots">' + [0, 1, 2, 3].map((i) => '<i class="' + (i < ui.code.length ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<div class="code-pad" style="width:100%;max-width:300px">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 'x', 0, '<'].map((k) => k === 'x' ? '<span></span>' :
        '<button type="button" data-action="code-key" data-k="' + k + '" aria-label="' + (k === '<' ? 'מחיקה' : k) + '">' + (k === '<' ? '⌫' : k) + '</button>').join('') + '</div></div>';
    h += '<p class="fine center">הקוד ההתחלתי הוא ' + DEFAULT_CODE + '. אחרי הכניסה אפשר לשנות אותו.</p>';
    return h;
  }
  KG.A['code-key'] = async (el) => {
    const k = el.dataset.k;
    if (k === '<') ui.code = ui.code.slice(0, -1); else if (ui.code.length < 4) ui.code += k;
    KG.sound.play('tap');
    if (ui.code.length === 4) {
      if (await codeOk(ui.code)) { ui.editorOpen = true; ui.code = ''; KG.haptic('success'); }
      else { ui.code = ''; KG.haptic('error'); KG.toast('קוד שגוי'); }
    }
    KG.render(true);
  };
  KG.A['editor-lock'] = () => { ui.editorOpen = false; KG.back(); };
  KG.SHEETS.newCode = {
    title: () => 'קוד גישה חדש',
    init: (d) => { d.v = ''; },
    render: (d) => '<div class="field"><label for="nc">4 ספרות</label><input id="nc" class="input ltr num" inputmode="numeric" maxlength="4" data-scope="code" data-bind="v" value="' + esc(d.v) + '"></div>' +
      '<button type="button" class="btn" data-action="code-save">' + icon('check') + 'שמירה</button>'
  };
  KG.onInput.code = (el) => { KG.ui.sheet.data.v = el.value.replace(/\D/g, '').slice(0, 4); };
  KG.A['code-save'] = async () => {
    const v = KG.ui.sheet.data.v;
    if (!/^\d{4}$/.test(v)) { KG.toast('צריך בדיוק 4 ספרות'); return; }
    KG.P.editorHash = await hashCode(v);
    KG.saveProgress(true);
    KG.closeSheet(true);
    KG.toast('הקוד עודכן');
  };

  KG.A['editor-export'] = async () => {
    try {
      const r = await KG.pkg.exportEditor();
      await KG.saveFile(r.id + '.zip', r.bytes, 'application/zip', 'חבילת עדכון: ' + r.questions + ' שאלות, ' + r.images + ' תמונות');
    } catch (e) { KG.toast(e.user ? e.message : 'הייצוא לא הצליח'); }
  };

  // ---- Question list for editing ----
  ui.edq = '';
  KG.V['edit-list'] = () => {
    const nq = KG.norm(ui.edq);
    const list = KG.C.questions.filter((q) => !q.generated && (!nq || KG.norm(q.q).includes(nq) || KG.norm(q.a).includes(nq) || q.id.includes(ui.edq)));
    let h = KG.backBar('עריכת שאלה', fmt(list.length) + ' שאלות');
    h += '<div class="search">' + icon('search') + '<input class="input" type="search" placeholder="חיפוש לפי מילה מהשאלה או מהתשובה" data-scope="edq" data-bind="q" value="' + esc(ui.edq) + '"></div>';
    h += '<div id="edq-list">' + edList(list) + '</div>';
    return h;
  };
  function edList(list) {
    return '<div class="card tight">' + list.slice(0, 80).map((q) => '<button type="button" class="row" data-action="qform-edit" data-id="' + esc(q.id) + '"><span class="tile ' + (q.status === 'review' ? 'orange' : q.origin === 'editor' ? 'purple' : 'gray') + '">' + icon(q.status === 'review' ? 'alert' : 'edit', 'sm') + '</span>' +
      '<span class="grow"><span class="t" style="font-size:14.5px">' + esc(q.q) + '</span><span class="s">' + esc((KG.schema.CAT[q.cat] || {}).name || '') + ' · ' + esc(KG.schema.DIFFS[q.diff].name) + ' · rev ' + q.rev + '</span></span></button>').join('') + '</div>';
  }
  KG.onInput.edq = (el) => {
    ui.edq = el.value;
    const nq = KG.norm(ui.edq);
    const box = document.getElementById('edq-list');
    if (box) box.innerHTML = edList(KG.C.questions.filter((q) => !q.generated && (!nq || KG.norm(q.q).includes(nq) || KG.norm(q.a).includes(nq) || q.id.includes(ui.edq))));
  };

  // ---- Question form ----
  KG.A['qform-new'] = () => { ui.qf = { isNew: true, type: 'mc', cat: 'israel', diff: 2, q: '', a: '', w: ['', '', ''], tfA: true, explain: '', h1: '', h2: '', teams: [], il: true, src: '', err: [] }; KG.go('qform'); };
  KG.A['qform-edit'] = (el) => {
    const q = KG.C.q(el.dataset.id);
    if (!q) return;
    ui.qf = { isNew: false, id: q.id, base: q, type: q.type === 'tf' ? 'tf' : 'mc', locked: !['mc', 'tf'].includes(q.type), cat: q.cat, diff: q.diff, q: q.q, a: q.type === 'tf' ? '' : q.a || '', w: (q.w || ['', '', '']).slice(0, 3).concat(['', '', '']).slice(0, 3),
      tfA: q.type === 'tf' ? q.a : true, explain: q.explain || '', h1: (q.hints || [])[0] || '', h2: (q.hints || [])[1] || '', teams: (q.teams || []).slice(), il: !!q.il || q.cat === 'israel', src: q.src || '', status: q.status || '', err: [] };
    KG.go('qform');
  };
  KG.V.qform = () => {
    const f = ui.qf;
    if (!f) return KG.errorBox('אין טופס פתוח');
    const fld = (k, label, val, opts) => '<div class="field"><label for="qf-' + k + '">' + esc(label) + '</label>' + (opts && opts.area ? '<textarea id="qf-' + k + '" class="input" data-scope="qf" data-bind="' + k + '">' + esc(val) + '</textarea>' :
      '<input id="qf-' + k + '" class="input" data-scope="qf" data-bind="' + k + '" value="' + esc(val) + '"' + (opts && opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + '>') + '</div>';
    let h = KG.backBar(f.isNew ? 'שאלה חדשה' : 'עריכת שאלה', f.isNew ? 'נשמרת עם מזהה קבוע' : f.id + ' · rev ' + f.base.rev + ' ← ' + (f.base.rev + 1));
    if (f.locked) h += '<div class="notice orange">' + icon('info', 'sm') + '<span class="grow">את סוג השאלה הזה (' + esc(KG.schema.TYPES[f.base.type].name) + ') עורכים בחבילת עדכון. כאן אפשר להשבית אותה או לשנות קושי, הסבר ומקור.</span></div>';
    else h += '<span class="section-label">סוג</span>' + KG.seg('qf-type', [{ v: 'mc', label: 'אמריקאית' }, { v: 'tf', label: 'נכון / לא נכון' }], f.type);
    h += '<div class="field"><label for="qf-cat">קטגוריה</label><select id="qf-cat" class="input" data-scope="qf" data-bind="cat">' + KG.schema.CATS.filter((c) => !c.generated).map((c) => '<option value="' + c.id + '"' + (c.id === f.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></div>';
    h += '<span class="section-label">רמת קושי</span>' + KG.seg('qf-diff', [1, 2, 3, 4, 5, 6].map((d) => ({ v: d, label: KG.schema.DIFFS[d].short })), f.diff);
    if (!f.locked) {
      h += fld('q', f.type === 'tf' ? 'הטענה (נכון או לא נכון?)' : 'השאלה', f.q, { area: true });
      if (f.type === 'tf') h += '<span class="section-label">התשובה</span>' + KG.seg('qf-tf', [{ v: 'true', label: 'נכון' }, { v: 'false', label: 'לא נכון' }], String(f.tfA));
      else h += fld('a', 'התשובה הנכונה', f.a) + [0, 1, 2].map((i) => fld('w' + i, 'תשובה שגויה ' + (i + 1), f.w[i])).join('');
    }
    h += fld('explain', 'הסבר קצר (מופיע אחרי התשובה)', f.explain, { area: true }) + fld('h1', 'רמז ראשון (לא חובה)', f.h1) + fld('h2', 'רמז שני (לא חובה)', f.h2);
    const teams = [...KG.C.ent.teams.values()].sort((a, b) => (a.tier || 3) - (b.tier || 3)).slice(0, 40);
    h += '<span class="section-label">קבוצות קשורות (לאתגר לפי קבוצה)</span><div class="chips">' + teams.map((t) => '<button type="button" class="chip sm" data-action="qf-team" data-v="' + t.id + '" aria-pressed="' + f.teams.includes(t.id) + '">' + esc(t.he) + '</button>').join('') + '</div>';
    h += '<div class="card tight"><div class="row"><span class="tile blue">' + icon('flag') + '</span><span class="grow"><span class="t">כדורגל ישראלי</span><span class="s">נספר בחלק הישראלי של המאגר</span></span>' + KG.sw('qf-il', f.il, 'כדורגל ישראלי') + '</div>' +
      (!f.isNew ? '<div class="row"><span class="tile orange">' + icon('eye') + '</span><span class="grow"><span class="t">השבתה</span><span class="s">השאלה לא תופיע במשחק עד שתחזירו אותה</span></span>' + KG.sw('qf-status', f.status === 'review', 'השבתה') + '</div>' : '') + '</div>';
    h += fld('src', 'מקור המידע (חובה)', f.src, { ph: 'למשל: אתר ההתאחדות לכדורגל, ויקיפדיה' });
    if (f.err.length) h += '<div class="notice red">' + icon('alert', 'sm') + '<span class="grow">' + f.err.map(esc).join('<br>') + '</span></div>';
    h += '<button type="button" class="btn" data-action="qf-save">' + icon('check') + 'שמירה</button>';
    return h;
  };
  KG.onInput.qf = (el) => {
    const f = ui.qf, k = el.dataset.bind;
    if (/^w\d$/.test(k)) f.w[+k.slice(1)] = el.value; else f[k] = el.value;
  };
  KG.A['qf-type'] = (el) => { ui.qf.type = el.dataset.v; KG.render(true); };
  KG.A['qf-diff'] = (el) => { ui.qf.diff = +el.dataset.v; KG.render(true); };
  KG.A['qf-tf'] = (el) => { ui.qf.tfA = el.dataset.v === 'true'; KG.render(true); };
  KG.A['qf-il'] = () => { ui.qf.il = !ui.qf.il; KG.render(true); };
  KG.A['qf-status'] = () => { ui.qf.status = ui.qf.status === 'review' ? '' : 'review'; KG.render(true); };
  KG.A['qf-team'] = (el) => { const t = ui.qf.teams, v = el.dataset.v, i = t.indexOf(v); if (i >= 0) t.splice(i, 1); else t.push(v); KG.render(true); };
  KG.A['qf-save'] = async () => {
    const f = ui.qf;
    const base = f.base || {};
    const q = f.locked ? Object.assign({}, base) : { id: f.id, type: f.type, q: f.q.trim() };
    if (!f.locked) {
      if (f.type === 'tf') q.a = f.tfA; else { q.a = f.a.trim(); q.w = f.w.map((x) => x.trim()).filter(Boolean); }
    }
    Object.assign(q, { cat: f.cat, diff: f.diff, explain: f.explain.trim(), hints: [f.h1, f.h2].map((x) => x.trim()).filter(Boolean), teams: f.teams.slice(), src: f.src.trim(), ver: KG.dateKey(), origin: 'editor' });
    if (f.il || f.cat === 'israel') q.il = true; else delete q.il;
    if (f.status === 'review') q.status = 'review'; else delete q.status;
    ['players', 'tags', 'grp', 'asOf', 'img', 'clues', 'items', 'sub'].forEach((k) => { if (base[k] != null && q[k] == null) q[k] = base[k]; });
    if (f.isNew) { q.id = 'u-' + KG.dateKey().replace(/-/g, '') + '-' + KG.uid().slice(-6); q.rev = 1; } else q.rev = (base.rev || 1) + 1;
    delete q.pkg; delete q.generated;
    f.err = KG.schema.checkQuestion(q);
    if (f.err.length) { KG.render(true); return; }
    const ov = KG.copy(KG.C.overlay);
    ov.questions[q.id] = q;
    ov.updatedAt = Date.now();
    ov.log.unshift({ ts: Date.now(), id: q.id, title: (f.isNew ? 'שאלה חדשה: ' : 'עריכה: ') + q.q.slice(0, 50), source: 'editor', added: f.isNew ? 1 : 0, updated: f.isNew ? 0 : 1, ok: true });
    await KG.C.commit(ov);
    KG.toast(f.isNew ? 'השאלה נוספה למאגר' : 'השאלה עודכנה (rev ' + q.rev + ')');
    ui.qf = null;
    KG.back();
  };

  // ---- Missing pictures ----
  ui.imgKind = 'crest';
  const KINDS = [{ v: 'crest', label: 'סמלים' }, { v: 'player', label: 'שחקנים' }, { v: 'stadium', label: 'אצטדיונים' }, { v: 'shirt-home', label: 'חולצות בית' }];
  KG.V['img-missing'] = () => {
    const k = ui.imgKind;
    let list;
    if (k === 'shirt-home') list = [...KG.C.ent.teams.values()].filter((t) => !KG.C.hasImage('shirt-home', t.id)).map((t) => ({ kind: 'shirt-home', for: t.id, label: t.he, file: 'shirt-home-' + t.id + '.webp' }));
    else list = KG.img.missing().filter((m) => m.kind === k);
    const have = [...KG.C.images.values()].filter((m) => m.kind === k);
    let h = KG.backBar('תמונות', have.length + ' קיימות · ' + list.length + ' חסרות');
    h += '<div class="chips scroll">' + KINDS.map((x) => '<button type="button" class="chip" data-action="img-kind" data-v="' + x.v + '" aria-pressed="' + (x.v === k) + '">' + esc(x.label) + '</button>').join('') + '</div>';
    h += '<div class="notice">' + icon('info', 'sm') + '<span class="grow">לוחצים על שם, בוחרים תמונה אמיתית מהגלריה, והאפליקציה מכווצת אותה (בערך 30–120KB לתמונה) ושומרת בטלפון. כל תמונה יוצרת לבד שאלת זיהוי. חשוב להשתמש רק בתמונות שמותר לכם להשתמש בהן.</span></div>';
    if (have.length) h += '<span class="section-label">קיימות</span><div class="card tight">' + have.slice(0, 60).map((m) => '<div class="row"><img data-img="' + esc(m.id) + '" alt="" style="width:42px;height:42px;object-fit:contain;border-radius:10px;background:var(--surface-2)"><span class="grow"><span class="t">' + esc(KG.C.entityName(m.for)) + '</span><span class="s">' + esc(m.credit || m.source || '') + '</span></span>' +
      '<button type="button" class="btn small secondary" data-action="img-add" data-kind="' + m.kind + '" data-for="' + esc(m.for) + '">החלפה</button></div>').join('') + '</div>';
    h += '<span class="section-label">חסרות</span><div class="card tight">' + (list.length ? list.slice(0, 150).map((m) => KG.row('img-add', 'plus', 'gold', m.label, m.file, ' data-kind="' + m.kind + '" data-for="' + esc(m.for) + '"')).join('') : '<p class="fine" style="padding:12px">אין תמונות חסרות כאן.</p>') + '</div>';
    return h;
  };
  KG.A['img-kind'] = (el) => { ui.imgKind = el.dataset.v; KG.render(true); };
  KG.A['img-add'] = async (el) => {
    const kind = el.dataset.kind, forId = el.dataset.for;
    const f = await KG.pickFile('image/*');
    if (!f) return;
    try {
      KG.toast('מכווץ את התמונה…');
      const c = await KG.img.compress(f, kind);
      KG.openSheet('imgSave', { kind, for: forId, c, url: URL.createObjectURL(c.blob), source: 'נוספה במכשיר', license: 'לשימוש אישי בלבד', credit: '' });
    } catch (e) { KG.toast(e.message || 'לא הצלחתי לפתוח את התמונה'); }
  };
  KG.SHEETS.imgSave = {
    title: (d) => (KG.schema.IMAGE_KINDS[d.kind] || {}).name + ': ' + KG.C.entityName(d.for),
    onClose: (d) => { try { URL.revokeObjectURL(d.url); } catch (e) { /* ignore */ } },
    render: (d) => '<img class="thumb" src="' + d.url + '" alt="">' +
      '<div class="notice green">' + icon('check', 'sm') + '<span class="grow">כווץ מ-' + fmt(Math.round(d.c.before / 1024)) + 'KB ל-' + fmt(Math.round(d.c.size / 1024)) + 'KB · ' + d.c.w + '×' + d.c.h + '</span></div>' +
      '<div class="field"><label for="is-src">מקור התמונה</label><input id="is-src" class="input" data-scope="imgs" data-bind="source" value="' + esc(d.source) + '"></div>' +
      '<div class="field"><label for="is-lic">זכויות שימוש / רישיון</label><input id="is-lic" class="input" data-scope="imgs" data-bind="license" value="' + esc(d.license) + '"></div>' +
      '<div class="field"><label for="is-cr">קרדיט (לא חובה)</label><input id="is-cr" class="input" data-scope="imgs" data-bind="credit" value="' + esc(d.credit) + '"></div>' +
      '<button type="button" class="btn" data-action="img-save">' + icon('check') + 'שמירה</button>'
  };
  KG.onInput.imgs = (el) => { KG.ui.sheet.data[el.dataset.bind] = el.value; };
  KG.A['img-save'] = async () => {
    const d = KG.ui.sheet.data;
    const id = d.kind + '-' + d.for;
    const cur = KG.C.images.get(id);
    const meta = { id, kind: d.kind, for: d.for, source: d.source.trim() || 'נוספה במכשיר', license: d.license.trim() || 'לשימוש אישי בלבד', credit: d.credit.trim(), v: cur ? (cur.v || 1) + 1 : 1, type: d.c.type, w: d.c.w, h: d.c.h, size: d.c.size, stored: true, origin: 'editor', added: Date.now() };
    const errs = KG.schema.checkImage(meta);
    if (errs.length) { KG.toast(errs[0]); return; }
    const ov = KG.copy(KG.C.overlay);
    ov.images[id] = meta;
    ov.updatedAt = Date.now();
    ov.log.unshift({ ts: Date.now(), id, title: 'תמונה: ' + KG.C.entityName(d.for), source: 'editor', images: 1, ok: true });
    await KG.C.commit(ov, [{ store: 'images', op: 'put', key: id, val: d.c.blob }]);
    KG.closeSheet(true);
    KG.toast('התמונה נשמרה');
    KG.render(true);
  };

  // ---- Reported mistakes ----
  KG.V.reports = () => {
    const list = KG.P.reports.slice().reverse();
    let h = KG.backBar('שאלות שדווחו', list.length + ' דיווחים');
    if (!list.length) return h + '<div class="empty"><span class="tile green">' + icon('check', 'lg') + '</span>אין דיווחים על טעויות.</div>';
    h += '<div class="card">' + list.map((r) => '<div class="list-item"><span class="tile red">' + icon('flag', 'sm') + '</span><span class="grow"><span class="t">' + esc(r.q || r.qid) + '</span><span class="s">' + esc(KG.dateFull(r.ts) + ' · ' + r.note) + '</span></span>' +
      (KG.C.q(r.qid) ? '<button type="button" class="btn small secondary" data-action="qform-edit" data-id="' + esc(r.qid) + '">תיקון</button>' : '') +
      '<button type="button" class="round-btn" aria-label="מחיקת הדיווח" data-action="report-del" data-id="' + esc(r.id) + '">' + icon('trash', 'sm') + '</button></div>').join('') + '</div>';
    return h;
  };
  KG.A['report-del'] = (el) => { KG.P.reports = KG.P.reports.filter((r) => r.id !== el.dataset.id); KG.saveProgress(); KG.render(true); };
})(typeof window !== 'undefined' ? window : globalThis);
