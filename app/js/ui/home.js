/* The home screen: rank and total points, days in a row, continue the last game, the big play button
   and quick ways to everything else. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon, fmt } = KG;

  KG.logo = (cls) => '<img class="' + (cls || 'logo') + '" src="logo.svg" alt="">';

  KG.V.home = () => {
    const P = KG.P, r = KG.CFG.rank(P.xp);
    const solved = Object.values(P.q).filter((x) => x && x.s).length;
    const achN = Object.keys(P.ach).length;
    const streak = KG.game.dayStreakNow();
    const name = P.name ? ', ' + P.name : '';
    let h = '<div class="top"><div class="brandbar grow">' + KG.logo() + '<span class="word">' + esc(KG.BRAND.name) + '</span></div>' +
      '<button type="button" class="round-btn" aria-label="הגדרות" data-action="go" data-view="settings">' + icon('gear') + '</button></div>';

    h += '<section class="hero" aria-label="הדרגה שלך">' +
      '<div class="hello">' + esc(KG.greeting() + name) + ' · ' + esc(KG.todayTitle()) + '</div>' +
      '<div class="rank">' + icon(r.cur.icon, 'sm') + esc(r.cur.name) + '</div>' +
      '<div class="xp"><b class="num">' + fmt(P.xp) + '</b><span>נקודות</span></div>' +
      '<div class="bar"><span style="width:' + Math.round(r.pct * 100) + '%"></span></div>' +
      '<div class="next">' + (r.next ? 'עוד ' + fmt(r.next.min - P.xp) + ' נקודות לדרגת ' + esc(r.next.name) : 'הגעת לדרגה הגבוהה ביותר!') + '</div>' +
      '<div class="stats">' +
      '<div class="stat"><b class="num">' + streak + '</b><span><span class="flame">' + icon('flame', 'sm') + '</span> ' + (streak === 1 ? 'יום ברצף' : 'ימים ברצף') + '</span></div>' +
      '<div class="stat"><b class="num">' + fmt(solved) + '</b><span>חידות נפתרו</span></div>' +
      '<div class="stat"><b class="num">' + achN + '</b><span>הישגים</span></div>' +
      '</div></section>';

    const s = P.session;
    if (s && Array.isArray(s.ids) && s.i < s.ids.length && s.phase !== 'done') {
      h += '<button type="button" class="resume" data-action="resume"><span class="tile gold">' + icon('play') + '</span>' +
        '<span class="grow"><span class="t" style="font-weight:700;display:block">המשך את המשחק האחרון</span><span class="s" style="font-size:13px;color:var(--muted)">' +
        esc(s.title) + ' · שאלה ' + (s.i + 1) + (s.mode === 'survival' ? '' : ' מתוך ' + s.ids.length) + '</span></span>' + icon('chevL', 'sm') + '</button>';
    }

    const stage = Math.min(P.journey.unlocked, KG.pick.journeyTotal());
    h += '<button type="button" class="cta-play" data-action="play-now"><span class="ball">' + icon('ball') + '</span>' +
      '<span class="grow"><b>מתחילים לשחק</b><span>מסע החידות · שלב ' + stage + ' · ' + esc(KG.schema.DIFFS[KG.CFG.stageDiff(stage)].name) + '</span></span>' + icon('chevL') + '</button>';

    const today = P.daily[KG.dateKey()];
    const tile = (action, ic, color, title, sub, extra, badge) => '<button type="button" class="qtile" data-action="' + action + '"' + (extra || '') + '>' +
      (badge || '') + '<span class="tile ' + color + '">' + icon(ic) + '</span><span><b>' + esc(title) + '</b><br><span>' + esc(sub) + '</span></span></button>';
    h += '<div class="tiles6">' +
      tile('tab', 'grid', 'green', 'בחר קטגוריה', KG.schema.CATS.length - 1 + ' נושאים', ' data-tab="cats"') +
      tile('mode', 'calendar', 'gold', 'אתגר יומי', today ? 'הושלם · ' + today.correct + '/' + today.total : '7 שאלות חדשות', ' data-mode="daily"', today ? '<span class="badge tag green">' + icon('check', 'sm') + '</span>' : '<span class="badge tag gold">חדש</span>') +
      tile('go', 'shield', 'blue', 'הקבוצות שלי', myTeamsSub(), ' data-view="teams"') +
      tile('tab', 'trophy', 'orange', 'ההישגים שלי', achN + ' מתוך ' + KG.CFG.ACH.length, ' data-tab="ach"') +
      tile('go', 'book', 'purple', 'ספריית הכדורגל', 'שחקנים, קבוצות ואצטדיונים', ' data-view="library"') +
      tile('go', 'gear', 'gray', 'הגדרות', 'מראה, צלילים ומאגר', ' data-view="settings"') +
      '</div>';

    const m = KG.C.meta;
    h += '<button type="button" class="notice" data-action="go" data-view="data">' + icon('database', 'sm') +
      '<span class="grow">' + fmt(m.questions) + ' שאלות במאגר · גרסה ' + m.contentVersion + (KG.online() ? '' : ' · בלי אינטרנט, הכל עובד') + '</span>' + icon('chevL', 'sm') + '</button>';
    if (KG.installNotice) h += KG.installNotice();
    return h;
  };

  function myTeamsSub() {
    const fav = KG.P.settings.favTeams.map((id) => KG.C.team(id)).filter(Boolean);
    if (!fav.length) return 'בחירת קבוצות אהובות';
    return fav.slice(0, 2).map((t) => t.he).join(', ') + (fav.length > 2 ? ' ועוד' : '');
  }

  KG.A['play-now'] = () => {
    const total = KG.pick.journeyTotal();
    const n = Math.min(KG.P.journey.unlocked, total);
    KG.startGame(() => KG.game.startJourney(n));
  };
  KG.A['resume'] = () => {
    if (KG.game.resume()) KG.go('quiz');
    else { KG.toast('המשחק הקודם כבר לא זמין'); KG.render(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
