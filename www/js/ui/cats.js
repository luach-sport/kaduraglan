/* The categories tab and the achievements tab. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon, fmt } = KG;

  KG.V.cats = () => {
    const P = KG.P;
    let h = '<div class="top"><div class="titles"><span class="kicker">' + fmt(KG.C.meta.questions) + ' שאלות במאגר</span><h1 class="h1">קטגוריות</h1></div>' +
      '<button type="button" class="round-btn" aria-label="ספריית הכדורגל" data-action="go" data-view="library">' + icon('search') + '</button></div>';
    KG.schema.CATS.forEach((c) => {
      const list = c.id === 'israel' ? KG.C.active.filter((q) => KG.C.isIsraeli(q) && q.cat !== 'images') : (KG.C.byCat[c.id] || []);
      const n = list.length;
      if (c.generated && !n) return;
      const solved = list.filter((q) => P.q[q.id] && P.q[q.id].s).length;
      const st = P.cat[c.id] || { a: 0, c: 0 };
      h += '<button type="button" class="cat" data-action="cat" data-cat="' + c.id + '"' + (n ? '' : ' aria-disabled="true"') + '>' +
        '<span class="head"><span class="tile ' + c.color + '">' + icon(c.icon) + '</span><span class="grow"><b>' + esc(c.name) + '</b><span class="s">' + esc(c.sub) + '</span></span>' + icon('chevL', 'sm') + '</span>' +
        '<span class="bar"><span style="width:' + KG.pct(solved, n) + '%"></span></span>' +
        '<span class="meta"><span>' + solved + ' מתוך ' + n + ' נפתרו</span><span>' + (st.a ? 'הצלחה ' + KG.pct(st.c, st.a) + '%' : 'עוד לא שיחקת') + '</span></span></button>';
    });
    return h;
  };
  KG.A['cat'] = (el) => {
    const c = el.dataset.cat;
    if (c === 'images') { KG.startGame(() => KG.game.startImages('image')); return; }
    KG.openSheet('free', { cat: c });
  };

  KG.V.ach = () => {
    const P = KG.P, all = KG.CFG.ACH;
    const on = all.filter((a) => P.ach[a.id]);
    let h = '<div class="top"><div class="titles"><span class="kicker">' + on.length + ' מתוך ' + all.length + ' נפתחו</span><h1 class="h1">הישגים</h1></div></div>';
    h += '<div class="bar gold"><span style="width:' + KG.pct(on.length, all.length) + '%"></span></div>';
    h += '<div class="achs">' + all.slice().sort((a, b) => (P.ach[b.id] ? 1 : 0) - (P.ach[a.id] ? 1 : 0)).map((a) => {
      const t = P.ach[a.id];
      return '<div class="ach ' + (t ? 'on' : 'off') + '"><span class="tile ' + (t ? 'gold' : 'gray') + '">' + icon(t ? a.icon : 'lock') + '</span><b>' + esc(a.title) + '</b><span>' + esc(a.desc) + '</span>' +
        (t ? '<span class="tag gold" style="align-self:flex-start">' + esc(KG.dateFull(t)) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
    return h;
  };
})(typeof window !== 'undefined' ? window : globalThis);
