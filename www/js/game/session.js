/* One game from start to finish, for every mode. The screens only call these functions.
   - An answer is accepted once per question (a double tap can't give points twice).
   - The game is saved after every answer, so closing the app in the middle loses nothing ("continue").
   - Head to head (2–4 players on one phone) doesn't change the phone owner's stats or total. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const GM = (KG.game = { cur: null });
  const P = () => KG.P;

  // ---- Days played in a row, and a guard against moving the phone's clock back ----
  GM.clockBack = () => { const t = KG.dateKey(); return !!(P().maxDateSeen && t < P().maxDateSeen); };
  GM.dayPlayed = () => {
    const p = P(), today = KG.dateKey();
    if (p.maxDateSeen && today < p.maxDateSeen) return false;
    p.maxDateSeen = today;
    const ds = p.dayStreak;
    if (ds.last === today) return true;
    ds.count = ds.last && KG.dayDiff(ds.last, today) === 1 ? ds.count + 1 : 1;
    ds.last = today;
    ds.best = Math.max(ds.best, ds.count);
    return true;
  };
  GM.dayStreakNow = () => { const ds = P().dayStreak, t = KG.dateKey(); return ds.last && (ds.last === t || KG.dayDiff(ds.last, t) === 1) ? ds.count : 0; };

  // ---- Creating games ----
  function make(mode, ids, extra) {
    const now = Date.now();
    return Object.assign({
      id: KG.uid(), mode, ids: ids.slice(), i: 0, answers: [], score: 0, career: 0, streak: 0, best: 0,
      startedAt: now, qStart: now, phase: 'question', hints: {}, clues: {}, timed: false, seconds: KG.CFG.SECONDS,
      lives: null, title: (KG.CFG.MODE[mode] || {}).title || '', reward: true, skip: false
    }, extra || {});
  }
  GM.begin = (sess) => {
    if (!sess.ids.length) return null;
    GM.cur = sess;
    if (sess.mode !== 'h2h') { P().session = sess; P().lastMode = sess.mode; GM.dayPlayed(); }
    KG.saveProgress();
    return sess;
  };

  GM.startFree = (filters, count, title) => GM.begin(make('free', KG.pick.forGame(filters, count), { title: title || 'משחק חופשי', filters, skip: true }));
  GM.makeFree = (ids, title) => make('free', KG.shuffle(ids).slice(0, 15).sort((a, b) => ((KG.C.q(a) || {}).diff || 0) - ((KG.C.q(b) || {}).diff || 0)), { title: title || 'משחק חופשי', skip: true });
  GM.startTeam = (teamId, count) => {
    const t = KG.C.team(teamId);
    return GM.begin(make('team', KG.pick.forGame({ teams: [teamId] }, count || 10), { title: 'אתגר ' + (t ? t.he : ''), team: teamId, skip: true }));
  };
  GM.startJourney = (n) => GM.begin(make('journey', KG.pick.stageIds(n), { title: 'מסע החידות · שלב ' + n, stage: n, skip: true }));
  GM.startDaily = () => {
    const day = KG.dateKey();
    const done = P().daily[day];
    const reward = !GM.clockBack() && !(done && done.rewarded);
    return GM.begin(make('daily', KG.pick.daily(day), { title: 'האתגר היומי', date: day, reward }));
  };
  GM.startSurvival = () => {
    const first = KG.pick.survivalNext(0, []);
    return GM.begin(make('survival', first ? [first] : [], { title: 'הישרדות', lives: KG.CFG.LIVES, timed: P().settings.timer }));
  };
  GM.startImages = (sub, fx) => {
    const filters = sub === 'crest' ? { images: 'only', sub: 'crest' } : { images: 'only' };
    let ids = KG.pick.forGame(filters, 10);
    if (sub !== 'crest') ids = ids.filter((id) => (KG.C.q(id) || {}).sub !== 'crest').concat(ids.filter((id) => (KG.C.q(id) || {}).sub === 'crest')).slice(0, 10);
    return GM.begin(make(sub === 'crest' ? 'crest' : 'image', ids, { title: sub === 'crest' ? 'חצי סמל' : 'זיהוי תמונה', fx: fx || null, skip: true }));
  };
  // Head to head: every round gives each player a question of the same level.
  GM.startH2H = (names, perPlayer, filters) => {
    const n = names.length;
    const list = KG.pick.pool(filters || {});
    const byDiff = {};
    KG.pick.choose(list, list.length).forEach((q) => (byDiff[q.diff] = byDiff[q.diff] || []).push(q));
    const ids = [];
    const plan = [];
    for (let r = 0; r < perPlayer; r++) plan.push(Math.min(6, 1 + Math.floor((r / Math.max(1, perPlayer)) * 5)));
    for (const d of plan) {
      let pool = byDiff[d] && byDiff[d].length >= n ? byDiff[d] : null;
      if (!pool) { const ds = Object.keys(byDiff).map(Number).filter((x) => byDiff[x].length >= n).sort((a, b) => Math.abs(a - d) - Math.abs(b - d)); pool = ds.length ? byDiff[ds[0]] : null; }
      if (!pool) break;
      for (let k = 0; k < n; k++) ids.push(pool.shift().id);
    }
    const players = names.map((name) => ({ name, score: 0, correct: 0, streak: 0 }));
    return GM.begin(make('h2h', ids, { title: 'ראש בראש', players, timed: P().settings.timer, phase: 'handoff', reward: false }));
  };

  // ---- Playing ----
  GM.q = () => { const s = GM.cur; return s ? KG.C.q(s.ids[s.i]) : null; };
  GM.player = () => { const s = GM.cur; return s && s.players ? s.players[s.i % s.players.length] : null; };
  GM.options = (q) => {
    if (!q || !Array.isArray(q.w)) return [];
    const wrong = q.w.slice(0, 3);
    return KG.shuffle([q.a].concat(wrong), KG.rng(GM.cur.id + ':' + q.id));
  };
  GM.orderItems = (q) => KG.shuffle(q.items.map((it) => it.t), KG.rng(GM.cur.id + ':o:' + q.id));
  GM.hintsLeft = (q) => (q && q.hints ? q.hints.length - (GM.cur.hints[q.id] || 0) : 0);
  GM.useHint = () => {
    const s = GM.cur, q = GM.q();
    if (!s || s.phase !== 'question' || GM.hintsLeft(q) <= 0) return false;
    s.hints[q.id] = (s.hints[q.id] || 0) + 1;
    KG.saveProgress();
    return true;
  };
  GM.cluesShown = (q) => Math.min(q.clues ? q.clues.length : 0, 1 + (GM.cur.clues[q.id] || 0));
  GM.moreClue = () => {
    const s = GM.cur, q = GM.q();
    if (!s || s.phase !== 'question' || !q.clues || GM.cluesShown(q) >= q.clues.length) return false;
    s.clues[q.id] = (s.clues[q.id] || 0) + 1;
    KG.saveProgress();
    return true;
  };

  GM.isCorrect = (q, choice) => {
    if (choice == null) return false;
    if (q.type === 'tf') return choice === q.a;
    if (q.type === 'order') return Array.isArray(choice) && choice.length === q.items.length && choice.every((t, i) => t === q.items[i].t);
    return KG.norm(choice) === KG.norm(q.a);
  };

  // choice: option text / true|false / ordered list; null = time ran out or skipped.
  GM.answer = (choice, opts) => {
    const s = GM.cur, q = GM.q();
    if (!s || !q || s.phase !== 'question') return null;
    const p = P(), now = Date.now();
    const skipped = !!(opts && opts.skip);
    const correct = !skipped && GM.isCorrect(q, choice);
    const ms = Math.max(0, now - s.qStart);
    const hints = (s.hints[q.id] || 0) + (s.clues[q.id] || 0);
    const pl = GM.player();
    const streak = correct ? (pl ? pl.streak : s.streak) + 1 : 0;
    const firstSolve = correct && !(p.q[q.id] && p.q[q.id].s);
    const sc = KG.score({ correct, diff: q.diff, hints, timed: s.timed, timeLeftFrac: s.timed ? 1 - ms / (s.seconds * 1000) : NaN, streak, firstSolve, mode: s.mode, dailyReward: s.reward, noReward: s.mode === 'daily' && !s.reward });
    s.phase = 'feedback';
    s.score += sc.pts;
    s.career += sc.career;
    s.answers.push({ qid: q.id, ok: correct, skip: skipped, pts: sc.pts, career: sc.career, hints, ms, choice: choice == null ? null : choice, p: pl ? s.i % s.players.length : undefined });
    if (pl) { pl.streak = streak; if (correct) { pl.correct++; pl.score += sc.pts; } }
    else { s.streak = streak; s.best = Math.max(s.best, streak); }
    if (s.lives != null && !correct) s.lives = Math.max(0, s.lives - 1);

    let unlocked = [];
    if (s.mode !== 'h2h') {
      if (!skipped) {
        const st = p.q[q.id] || { a: 0, c: 0, s: 0, l: 0 };
        st.a++; st.l = now;
        if (correct) { st.c++; if (!st.s) st.s = now; }
        p.q[q.id] = st;
        const ct = p.cat[q.cat] || { a: 0, c: 0 };
        ct.a++; if (correct) ct.c++;
        p.cat[q.cat] = ct;
        p.answered++;
      }
      if (correct) {
        p.correct++;
        if (!hints) p.noHintCorrect++;
        if (q.diff === 6) p.hardCorrect++;
        if (q.sub === 'crest' && q.teams && q.teams[0]) p.seen.crests[q.teams[0]] = 1;
        (q.teams || []).forEach((t) => { p.seen.teams[t] = 1; });
        (q.players || []).forEach((x) => { p.seen.players[x] = 1; });
      }
      p.bestStreak = Math.max(p.bestStreak, s.streak);
      p.xp += sc.career;
      unlocked = GM.checkAch({ correct, diff: q.diff, timed: s.timed, ms });
      p.session = s;
    }
    KG.saveProgress();
    return { correct, sc, unlocked, q, skipped };
  };
  GM.skip = () => GM.answer(null, { skip: true });

  GM.next = () => {
    const s = GM.cur;
    if (!s || s.phase !== 'feedback') return null;
    s.i++;
    if (s.mode === 'survival') {
      if (s.lives <= 0) return GM.finish();
      if (s.i >= s.ids.length) {
        const nx = KG.pick.survivalNext(s.i, s.ids);
        if (!nx) return GM.finish();
        s.ids.push(nx);
      }
    }
    if (s.i >= s.ids.length) return GM.finish();
    if (!GM.q()) { s.phase = 'feedback'; return GM.next(); }   // a question removed by an update
    s.phase = s.mode === 'h2h' ? 'handoff' : 'question';
    s.qStart = Date.now();
    KG.saveProgress();
    return s;
  };
  GM.ready = () => { const s = GM.cur; if (s && s.phase === 'handoff') { s.phase = 'question'; s.qStart = Date.now(); } };

  GM.finish = () => {
    const s = GM.cur;
    if (!s) return null;
    const p = P();
    const real = s.answers.filter((a) => !a.skip);
    const correct = s.answers.filter((a) => a.ok).length;
    const sum = { mode: s.mode, title: s.title, total: s.answers.length, correct, score: s.score, career: s.career, best: s.best, unlocked: [], records: [] };
    s.phase = 'done';
    if (s.mode === 'h2h') {
      p.h2h.games++;
      const top = Math.max.apply(null, s.players.map((x) => x.score));
      sum.players = s.players.map((x) => Object.assign({}, x, { win: x.score === top }));
      sum.unlocked = GM.checkAch({});
    } else {
      p.games++;
      if (s.score > p.bestScore) { p.bestScore = s.score; sum.records.push('שיא ניקוד אישי'); }
      if (s.mode === 'journey') {
        const st = p.journey.stages[s.stage] || { ids: s.ids, best: 0, done: false };
        const stars = correct >= 5 ? 3 : correct === 4 ? 2 : correct >= KG.CFG.STAGE_PASS ? 1 : 0;
        sum.stars = stars;
        sum.passed = stars > 0;
        st.best = Math.max(st.best || 0, stars);
        if (stars > 0) { st.done = true; p.journey.unlocked = Math.max(p.journey.unlocked, s.stage + 1); }
        p.journey.stages[s.stage] = st;
        sum.stage = s.stage;
      }
      if (s.mode === 'daily') {
        const prev = p.daily[s.date];
        p.daily[s.date] = { score: Math.max(s.score, prev ? prev.score : 0), correct: Math.max(correct, prev ? prev.correct : 0), total: s.answers.length, rewarded: !!(s.reward || (prev && prev.rewarded)), xp: (prev ? prev.xp || 0 : 0) + s.career };
        sum.reward = s.reward;
      }
      if (s.mode === 'survival') {
        p.survival.games++;
        if (correct > p.survival.best) { p.survival.best = correct; sum.records.push('שיא הישרדות: ' + correct); }
        p.survival.bestScore = Math.max(p.survival.bestScore, s.score);
      }
      const perfect = real.length >= 10 && real.every((a) => a.ok);
      sum.unlocked = GM.checkAch({ perfect });
      p.session = null;
    }
    s.summary = sum;
    KG.saveProgress(true);
    return sum;
  };

  GM.resume = () => {
    const s = P().session;
    if (!s || !Array.isArray(s.ids) || s.i >= s.ids.length || s.phase === 'done') { P().session = null; return null; }
    if (!KG.C.q(s.ids[s.i])) { s.phase = 'feedback'; GM.cur = s; return GM.next() ? s : null; }
    s.qStart = Date.now();
    if (s.phase === 'question' && s.timed) s.qStart = Date.now();
    GM.cur = s;
    return s;
  };
  GM.abandon = () => { if (GM.cur && GM.cur.mode !== 'h2h') P().session = null; GM.cur = null; KG.saveProgress(); };

  // ---- Achievements ----
  GM.checkAch = (ev) => {
    const p = P(), out = [];
    for (const a of KG.CFG.ACH) {
      if (p.ach[a.id]) continue;
      let ok = false;
      try { ok = !!a.test(p, ev || {}); } catch (e) { ok = false; }
      if (ok) { p.ach[a.id] = Date.now(); out.push(a); }
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
