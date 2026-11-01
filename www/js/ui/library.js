/* The football library: search players, teams, national teams, competitions and stadiums without
   internet, filter by country and era, open a card with the facts, and play the questions about it.
   Only what has a record in the bank is shown. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon, fmt } = KG;
  const ui = KG.ui;
  ui.lib = { q: '', kind: 'all', country: '', era: '' };
  const KINDS = [
    { v: 'all', label: 'הכל' }, { v: 'players', label: 'שחקנים' }, { v: 'teams', label: 'קבוצות' },
    { v: 'nations', label: 'נבחרות' }, { v: 'comps', label: 'תחרויות' }, { v: 'stadiums', label: 'אצטדיונים' }
  ];
  const KIND_ICON = { players: 'user', teams: 'shield', nations: 'flag', comps: 'trophy', stadiums: 'stadium' };
  const KIND_COLOR = { players: 'orange', teams: 'blue', nations: 'purple', comps: 'gold', stadiums: 'green' };
  const KIND_ORDER = ['teams', 'players', 'nations', 'comps', 'stadiums'];
  const ERAS = { '2000s': 'שנות ה-2000', '2010s': 'שנות ה-2010', '2020s': 'שנות ה-2020' };

  function all() {
    const out = [];
    KG.schema.ENTITY_KINDS.forEach((k) => (KG.C.ent[k] || new Map()).forEach((x) => out.push({ kind: k, x })));
    return out;
  }
  const qCount = (kind, id) => {
    const ids = kind === 'stadiums' ? ((KG.C.ent.stadiums.get(id) || {}).teams || []) : [id];
    return KG.C.active.filter((q) => (kind === 'players' ? (q.players || []) : (q.teams || [])).some((t) => ids.includes(t))).length;
  };

  KG.V.library = () => {
    const L = ui.lib;
    const items = all();
    const countries = [...new Set(items.map((i) => i.x.country).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));
    const nq = KG.norm(L.q);
    const list = items.filter((i) => (L.kind === 'all' || i.kind === L.kind) && (!L.country || i.x.country === L.country) &&
      (!L.era || (i.x.era || []).includes(L.era)) &&
      (!nq || KG.norm(i.x.he).includes(nq) || KG.norm(i.x.en).includes(nq) || (i.x.nick && KG.norm(i.x.nick).includes(nq)) || (i.x.aka || []).some((a) => KG.norm(a).includes(nq))))
      .sort((a, b) => (a.x.tier || 3) - (b.x.tier || 3) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.x.he.localeCompare(b.x.he, 'he'));
    let h = KG.backBar('ספריית הכדורגל', fmt(items.length) + ' רשומות · עובד בלי אינטרנט');
    h += '<div class="search">' + icon('search') + '<input class="input" type="search" placeholder="חיפוש בעברית או באנגלית" data-scope="lib" data-bind="q" value="' + esc(L.q) + '" aria-label="חיפוש"></div>';
    h += '<div class="chips scroll">' + KINDS.map((k) => '<button type="button" class="chip" data-action="lib-kind" data-v="' + k.v + '" aria-pressed="' + (L.kind === k.v) + '">' + esc(k.label) + '</button>').join('') + '</div>';
    h += '<div class="btn-row"><select class="input" data-scope="lib" data-bind="country" aria-label="מדינה"><option value="">כל המדינות</option>' +
      countries.map((c) => '<option' + (c === L.country ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
      '<select class="input" data-scope="lib" data-bind="era" aria-label="תקופה"><option value="">כל התקופות</option>' +
      Object.entries(ERAS).map(([v, l]) => '<option value="' + v + '"' + (v === L.era ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></div>';
    h += '<div id="lib-list">' + listHtml(list) + '</div>';
    return h;
  };
  function listHtml(list) {
    if (!list.length) return '<div class="empty"><span class="tile gray">' + icon('search', 'lg') + '</span>לא נמצא כלום. נסו מילה אחרת או הסירו סינון.</div>';
    return '<div class="card tight">' + list.slice(0, 120).map((i) => {
      const x = i.x;
      const sub = [x.en, x.country, x.city, x.pos].filter(Boolean).join(' · ');
      return '<button type="button" class="row lib-row" data-action="entity" data-kind="' + i.kind + '" data-id="' + x.id + '"><span class="tile ' + KIND_COLOR[i.kind] + '">' + icon(KIND_ICON[i.kind]) + '</span>' +
        '<span class="grow"><span class="t">' + esc(x.he) + '</span><span class="s">' + esc(sub) + '</span></span>' + icon('chevL', 'sm') + '</button>';
    }).join('') + '</div>' + (list.length > 120 ? '<p class="fine center">מוצגות 120 תוצאות ראשונות. אפשר לצמצם בחיפוש.</p>' : '');
  }
  const refresh = KG.debounce(() => { if (ui.view === 'library') KG.render(true); }, 220);
  KG.onInput.lib = (el) => {
    ui.lib[el.dataset.bind] = el.value;
    if (el.tagName === 'SELECT') KG.render(true);
    else if (document.getElementById('lib-list')) refreshList(); // keep the keyboard open: update only the list
    else refresh();
  };
  function refreshList() {
    const L = ui.lib, nq = KG.norm(L.q);
    const list = all().filter((i) => (L.kind === 'all' || i.kind === L.kind) && (!L.country || i.x.country === L.country) && (!L.era || (i.x.era || []).includes(L.era)) &&
      (!nq || KG.norm(i.x.he).includes(nq) || KG.norm(i.x.en).includes(nq) || (i.x.nick && KG.norm(i.x.nick).includes(nq)) || (i.x.aka || []).some((a) => KG.norm(a).includes(nq))))
      .sort((a, b) => (a.x.tier || 3) - (b.x.tier || 3) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.x.he.localeCompare(b.x.he, 'he'));
    document.getElementById('lib-list').innerHTML = listHtml(list);
  }
  KG.A['lib-kind'] = (el) => { ui.lib.kind = el.dataset.v; KG.render(true); };

  // ---- A record's card ----
  const LABEL = { en: 'באנגלית', country: 'מדינה', city: 'עיר', founded: 'שנת הקמה', opened: 'נפתח', league: 'ליגה', nick: 'כינוי', colors: 'צבעים', pos: 'עמדה', conf: 'קונפדרציה', kind: 'סוג', host: 'מארחת' };
  KG.SHEETS.entity = {
    full: true,
    title: (d) => { const x = KG.C.ent[d.kind] && KG.C.ent[d.kind].get(d.id); return x ? x.he : ''; },
    render: (d) => {
      const x = KG.C.ent[d.kind].get(d.id);
      if (!x) return '';
      const C = KG.C;
      const rows = [];
      Object.keys(LABEL).forEach((k) => {
        let v = x[k];
        if (v == null || v === '') return;
        if (k === 'league') v = C.entityName(v);
        rows.push([LABEL[k], String(v)]);
      });
      if (x.stadium) rows.push(['אצטדיון', C.entityName(x.stadium)]);
      if (x.clubs && x.clubs.length) rows.push(['קבוצות בולטות', x.clubs.map((c) => C.entityName(c)).join(', ')]);
      if (x.teams && x.teams.length) rows.push(['הקבוצות שמשחקות בו', x.teams.map((c) => C.entityName(c)).join(', ')]);
      if (x.era && x.era.length) rows.push(['תקופה', x.era.map((e) => ERAS[e] || e).join(', ')]);
      if (x.facts) x.facts.forEach((f) => rows.push(['', f]));
      const img = [...C.images.values()].find((m) => m.for === x.id && ['crest', 'player', 'stadium'].includes(m.kind));
      let h = img ? '<div class="pic' + (img.kind === 'crest' ? ' crest' : '') + '" style="aspect-ratio:16/10"><img data-img="' + esc(img.id) + '" alt=""></div>' : '';
      h += '<div class="card"><div class="facts">' + rows.map((r) => '<div class="f">' + (r[0] ? '<span class="k">' + esc(r[0]) + '</span>' : '') + '<span>' + esc(r[1]) + '</span></div>').join('') + '</div></div>';
      if (img && img.credit) h += '<p class="fine">תמונה: ' + esc(img.credit) + (img.license ? ' · ' + esc(img.license) : '') + '</p>';
      const n = qCount(d.kind, x.id);
      if (n >= 3) h += '<button type="button" class="btn" data-action="entity-play" data-kind="' + d.kind + '" data-id="' + x.id + '">' + icon('play') + n + ' שאלות על ' + esc(x.he) + '</button>';
      else h += '<p class="fine center">' + (n ? 'יש ' + n + ' שאלות על ' + esc(x.he) + ' במאגר.' : 'עוד אין שאלות על ' + esc(x.he) + '.') + '</p>';
      return h;
    }
  };
  KG.A['entity'] = (el) => { KG.openSheet('entity', { kind: el.dataset.kind, id: el.dataset.id }); setTimeout(() => KG.afterRender('library'), 30); };
  KG.A['entity-play'] = (el) => {
    const kind = el.dataset.kind, id = el.dataset.id, x = KG.C.ent[kind].get(id);
    KG.closeSheet(true);
    if (kind === 'teams' && qCount(kind, id) >= 5) { KG.startGame(() => KG.game.startTeam(id, 10)); return; }
    const keys = kind === 'stadiums' ? ((KG.C.ent.stadiums.get(id) || {}).teams || []) : [id];
    const ids = KG.C.active.filter((q) => (kind === 'players' ? (q.players || []) : (q.teams || [])).some((t) => keys.includes(t))).map((q) => q.id);
    KG.startGame(() => KG.game.begin(Object.assign(KG.game.makeFree(ids, x.he))));
  };
})(typeof window !== 'undefined' ? window : globalThis);
