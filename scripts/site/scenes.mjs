// The screenshots on כדורגלן's site, taken by the Itzko site kit (kit/lib/shots.mjs in luach-sport/itzko).
// prepare() gives the app an example player (points, solved questions, stages, achievements), built from
// the real question bank so every number on screen adds up; every scene's `set` then runs inside the app page.
const SEED = () => {
  const KG = window.KG, now = Date.now(), day = 864e5;
  const P = KG.defaultProgress();
  const skip = new Set(['cl-lamasia', 'cl-barca-founded', 'co-pep-barca', 'wc26-final-scorer', 'ucl-barca-titles', 'co-pep-sextuple']);
  const pool = KG.C.active.filter((q) => !skip.has(q.id) && q.diff <= 4).sort((a, b) => a.diff - b.diff || (a.id < b.id ? -1 : 1));
  let solved = 0;
  pool.forEach((q, i) => {
    if (i % 5 === 4) return;                              // not every question was played
    const ok = i % 7 !== 3;                               // a few wrong answers, for a real success rate
    const t = now - (i % 30) * day;
    P.q[q.id] = { a: 1, c: ok ? 1 : 0, s: ok ? t : 0, l: t };
    const c = (P.cat[q.cat] = P.cat[q.cat] || { a: 0, c: 0 });
    c.a++; if (ok) { c.c++; solved++; }
    (q.teams || []).forEach((id) => { if (ok) P.seen.teams[id] = t; });
    (q.players || []).forEach((id) => { if (ok) P.seen.players[id] = t; });
  });
  const answered = Object.keys(P.q).length;
  Object.assign(P, {
    createdAt: now - 34 * day, savedAt: now, name: 'דני', xp: 9650, games: 41, answered, correct: solved,
    bestStreak: 14, bestScore: 1240, noHintCorrect: Math.round(solved * 0.7), hardCorrect: 0,
    dayStreak: { count: 6, last: KG.dateKey(), best: 9 }, maxDateSeen: KG.dateKey(),
    journey: { stages: { 1: { ids: [], best: 3, done: true }, 2: { ids: [], best: 3, done: true }, 3: { ids: [], best: 2, done: true }, 4: { ids: [], best: 3, done: true }, 5: { ids: [], best: 2, done: true }, 6: { ids: [], best: 3, done: true } }, unlocked: 7 },
    survival: { best: 12, bestScore: 2380, games: 5 }, h2h: { games: 2 },
    profile: { name: 'דני כהן', email: 'dani@example.com' }, updateSeen: 999999
  });
  for (let d = 1; d <= 8; d++) P.daily[KG.dateKey(now - d * day)] = { score: 900, correct: 5, total: 7, rewarded: true, xp: 900 };
  ['first', 'streak10', 'solved100', 'nohint50', 'daily7', 'days7', 'h2h', 'barca'].forEach((id, i) => { P.ach[id] = now - (20 - i * 2) * day; });
  return P;
};

const waitApp = (page) => page.waitForFunction(() => window.KG && KG.C && KG.C.active && KG.C.active.length > 100 && document.querySelector('#screen .hero, #screen .top'), null, { timeout: 20000 });

export async function prepare(page, { info }) {
  await waitApp(page);
  await page.evaluate((seed) => {
    const P = (0, eval)('(' + seed + ')')();
    window.KG.saveProgress = () => {};   // the page saves when it closes: don't let it overwrite the example
    localStorage.setItem('kg.theme', 'dark');
    localStorage.setItem('kg.progress.v1', JSON.stringify(P));
    localStorage.removeItem('kg.progress.prev');
  }, SEED.toString());
  await page.reload();
  await waitApp(page);
  await page.waitForTimeout(1200);
  return { info };
}

export const reset = () => { const KG = window.KG; KG.closeSheet(true); const t = document.getElementById('toast-root'); if (t) t.innerHTML = ''; window.scrollTo(0, 0); };

const tab = (t) => "const KG = window.KG; KG.game.cur = null; KG.setTab('" + t + "');";
const scene = (name, body, extra) => Object.assign({ name, set: new Function('arg', body) }, extra || {});

// One finished game, answered right: the screen after an answer, or the results at the end.
const play = (ids, title, journey, upTo) => `const KG = window.KG, GM = KG.game;
  const s = GM.makeFree(${JSON.stringify(ids)}, '${title}');
  s.ids = ${JSON.stringify(ids)};
  ${journey ? "s.mode = 'journey'; s.stage = " + journey + ';' : ''}
  GM.begin(s); KG.ui.view = 'quiz'; KG.ui.history = []; KG.render();
  for (let k = 0; k < ${upTo}; k++) {
    if (k) GM.next();
    const q = GM.q(); s.qStart = Date.now() - 6000; GM.answer(q.type === 'tf' ? q.a : q.a);
  }
  ${upTo === ids.length ? "GM.next(); KG.ui.view = 'result'; KG.render();" : 'KG.render(true);'}`;

export const SCENES = [
  scene('home', tab('home')),
  scene('play', tab('play')),
  scene('answer', play(['cl-lamasia', 'cl-elclasico', 'wc26-teams', 'cl-montjuic', 'co-lucho'], 'משחק חופשי', 0, 1), { scroll: '.feedback' }),
  scene('result', play(['cl-barca-founded', 'co-pep-barca', 'ucl-barca-titles', 'co-pep-sextuple', 'wc26-final-scorer'], 'מסע החידות · שלב 7', 7, 5)),
  scene('cats', tab('cats')),
  scene('ach', tab('ach')),
  scene('library', tab('home') + " Object.assign(KG.ui.lib, { q: '', kind: 'players', country: '', era: '2020s' }); KG.go('library');"),
  scene('data', tab('profile') + " KG.go('data');", { wait: 900 }),
  scene('editor', tab('profile') + " KG.ui.editorOpen = true; KG.go('editor');", { wait: 900 }),
  // As on an Android phone (the site describes both buttons; on iPhone only the link is offered).
  scene('share-app', tab('profile') + " const n = KG.isNative; KG.isNative = () => true; KG.openSheet('shareApp'); KG.isNative = n;", { wait: 700 }),
  scene('update', tab('profile') + `
    const b = parseInt(arg.info.build, 10) || 2;
    KG.VERSION.build = String(b - 1 > 0 ? b - 1 : b);
    KG.update.info = { version: arg.info.version || '1.02', build: b, notes: (arg.info.notes || []).slice(0, 4), size: 0 };
    KG.update.state = 'idle';
    KG.openSheet('update');`, { wait: 700 }),
  scene('feedback', tab('profile') + " KG.openSheet('feedback');", { fill: ['#fbm', 'הייתי רוצה קטגוריה על הליגה הפורטוגלית'], wait: 600 })
];
