import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers.mjs';

const KG = await loadApp();
const GM = KG.game;
const correctChoice = (q) => (q.type === 'tf' ? q.a : q.type === 'order' ? q.items.map((i) => i.t) : q.a);
const wrongChoice = (q) => (q.type === 'tf' ? !q.a : q.type === 'order' ? q.items.map((i) => i.t).reverse() : q.w[0]);

test('the bank loaded and every question is playable', () => {
  assert.ok(KG.C.active.length >= 300, 'at least 300 questions');
  for (const q of KG.C.active) {
    assert.deepEqual(KG.schema.checkQuestion(q, { generated: q.generated }), [], q.id);
    if (q.type === 'mc' || q.type === 'whoami') {
      const opts = KG.shuffle([q.a].concat(q.w.slice(0, 3)));
      assert.equal(new Set(opts.map(KG.norm)).size, 4, 'four different answers: ' + q.id);
    }
  }
});

test('free game: an answer counts once (double tap gives nothing)', () => {
  GM.startFree({ cats: ['worldcup'] }, 5, 'בדיקה');
  const s = GM.cur;
  assert.equal(s.ids.length, 5);
  const q = GM.q();
  const r1 = GM.answer(correctChoice(q));
  assert.ok(r1 && r1.correct);
  const xp = KG.P.xp;
  const r2 = GM.answer(correctChoice(q));
  assert.equal(r2, null, 'second tap ignored');
  assert.equal(KG.P.xp, xp);
  assert.equal(s.answers.length, 1);
  assert.equal(KG.P.q[q.id].c, 1);
  assert.ok(KG.P.q[q.id].s > 0, 'marked solved');
});

test('the game is saved after each answer and can be continued after a restart', async () => {
  const s = GM.cur;
  GM.next();
  const q = GM.q();
  GM.answer(wrongChoice(q));
  const saved = JSON.parse(localStorage.getItem('kg.progress.v1'));
  assert.equal(saved.session.id, s.id);
  assert.equal(saved.session.answers.length, 2);
  // simulate closing the app
  GM.cur = null;
  KG.P = KG.normalizeProgress(saved);
  const back = GM.resume();
  assert.ok(back);
  assert.equal(back.i, 1);
  assert.equal(back.phase, 'feedback');
  // finish
  while (GM.cur && GM.cur.phase !== 'done') {
    if (GM.cur.phase === 'feedback') { GM.next(); continue; }
    GM.answer(correctChoice(GM.q()));
  }
  assert.equal(KG.P.session, null);
  assert.ok(KG.P.games >= 1);
});

test('achievements unlock once and stay', () => {
  assert.ok(KG.P.ach.first, 'first correct answer');
  const t = KG.P.ach.first;
  const again = GM.checkAch({});
  assert.ok(!again.some((a) => a.id === 'first'));
  assert.equal(KG.P.ach.first, t);
});

test('journey: 3 of 5 pass the stage and open the next one; stages keep their questions', () => {
  const before = KG.P.journey.unlocked;
  GM.startJourney(1);
  const ids = GM.cur.ids.slice();
  assert.equal(ids.length, 5);
  for (let k = 0; k < 5; k++) {
    const q = GM.q();
    GM.answer(k < 3 ? correctChoice(q) : wrongChoice(q));
    GM.next();
  }
  const st = KG.P.journey.stages[1];
  assert.equal(st.done, true);
  assert.equal(st.best, 1);
  assert.ok(KG.P.journey.unlocked >= Math.max(2, before));
  assert.deepEqual(KG.pick.stageIds(1), ids, 'same questions when replayed');
  const s2 = KG.pick.stageIds(2);
  assert.ok(s2.every((id) => !ids.includes(id)), 'stage 2 has other questions');
});

test('daily challenge: same 7 questions for the same day, reward only once, clock moved back gives no reward', () => {
  const a = KG.pick.daily('2026-11-05'), b = KG.pick.daily('2026-11-05'), c = KG.pick.daily('2026-11-06');
  assert.equal(a.length, 7);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  KG.P.maxDateSeen = '';
  GM.startDaily();
  assert.equal(GM.cur.reward, true);
  while (GM.cur.phase !== 'done') { if (GM.cur.phase === 'feedback') GM.next(); else GM.answer(correctChoice(GM.q())); }
  assert.equal(KG.P.daily[KG.dateKey()].rewarded, true);
  GM.cur = null;
  GM.startDaily();
  assert.equal(GM.cur.reward, false, 'second time today: no reward');
  GM.abandon();
  KG.P.maxDateSeen = '2099-01-01';
  assert.equal(GM.clockBack(), true);
  delete KG.P.daily[KG.dateKey()];
  GM.startDaily();
  assert.equal(GM.cur.reward, false, 'clock moved back: no reward');
  const q = GM.q();
  const r = GM.answer(correctChoice(q));
  assert.equal(r.sc.career, 0);
  GM.abandon();
  KG.P.maxDateSeen = KG.dateKey();
});

test('survival: three wrong answers end the game, the record is kept', () => {
  GM.startSurvival();
  let n = 0;
  while (GM.cur.phase !== 'done' && n < 50) {
    if (GM.cur.phase === 'feedback') { GM.next(); continue; }
    GM.answer(n < 4 ? correctChoice(GM.q()) : wrongChoice(GM.q()));
    n++;
  }
  assert.equal(GM.cur.phase, 'done');
  assert.equal(GM.cur.lives, 0);
  assert.equal(GM.cur.summary.correct, 4);
  assert.ok(KG.P.survival.best >= 4);
});

test('head to head: same number of questions for every player, owner stats untouched', () => {
  const xp = KG.P.xp, answered = KG.P.answered;
  GM.startH2H(['א', 'ב', 'ג'], 4, {});
  const s = GM.cur;
  assert.equal(s.ids.length, 12);
  for (let r = 0; r < 4; r++) {
    const diffs = s.ids.slice(r * 3, r * 3 + 3).map((id) => KG.C.q(id).diff);
    assert.equal(new Set(diffs).size, 1, 'same level in a round');
  }
  while (s.phase !== 'done') {
    if (s.phase === 'handoff') GM.ready();
    else if (s.phase === 'feedback') GM.next();
    else GM.answer(correctChoice(GM.q()));
  }
  assert.equal(KG.P.xp, xp);
  assert.equal(KG.P.answered, answered);
  assert.equal(s.summary.players.length, 3);
  assert.ok(KG.P.ach.h2h);
});

test('team challenge: only questions about the team', () => {
  GM.startTeam('barcelona', 10);
  assert.equal(GM.cur.ids.length, 10);
  assert.ok(GM.cur.ids.every((id) => (KG.C.q(id).teams || []).includes('barcelona')));
  GM.abandon();
});

test('progress survives garbage and keeps its shape', () => {
  const p = KG.normalizeProgress({ xp: 'lots', settings: { theme: 'neon', favTeams: [1, 'barcelona'] }, q: 5 });
  assert.equal(p.xp, 0);
  assert.equal(p.settings.theme, 'dark');
  assert.deepEqual(p.settings.favTeams, ['barcelona']);
  assert.deepEqual(p.q, {});
  const text = KG.progressBackup();
  const back = KG.readProgressBackup(text);
  assert.equal(back.xp, KG.P.xp);
  assert.throws(() => KG.readProgressBackup('{"x":1}'));
});

// ---- One 50:50 hint and one skip in every game ----
const find = (pred) => KG.C.active.find(pred);
const play = (ids) => { GM.cur = null; const s = GM.makeFree(ids, 'בדיקה'); s.ids = ids.slice(); GM.begin(s); return s; };

test('hint 50:50: two wrong answers go, the question is worth half, once per game', () => {
  const mcs = KG.C.active.filter((q) => q.type === 'mc' && q.w.length >= 3).slice(0, 3).map((q) => q.id);
  const s = play(mcs);
  const q = GM.q();
  assert.equal(GM.hintsLeft(), 1);
  assert.ok(GM.canHint(q));
  assert.ok(GM.useHint());
  const gone = GM.removed(q);
  assert.equal(gone.length, 2);
  assert.ok(!gone.map(KG.norm).includes(KG.norm(q.a)), 'the right answer stays');
  assert.equal(GM.useHint(), false, 'not twice');
  const r = GM.answer(q.a);
  assert.equal(r.sc.pts, Math.round(KG.CFG.BASE[q.diff] / 2));
  GM.next();
  assert.equal(GM.hintsLeft(), 0);
  assert.equal(GM.canHint(GM.q()), false, 'used up for this game');
  assert.equal(GM.useHint(), false);
  assert.equal(s.answers[0].hints, 1);
});

test('skip: once per game, no points, keeps the streak', () => {
  const mcs = KG.C.active.filter((q) => q.type === 'mc').slice(10, 14).map((q) => q.id);
  const s = play(mcs);
  GM.answer(GM.q().a); GM.next();
  GM.answer(GM.q().a); GM.next();
  assert.equal(s.streak, 2);
  const r = GM.skip();
  assert.ok(r && r.skipped && !r.correct);
  assert.equal(r.sc.pts, 0);
  assert.equal(s.streak, 2, 'a skip does not break the streak');
  GM.next();
  assert.equal(GM.skipsLeft(), 0);
  assert.equal(GM.skip(), null, 'only one skip per game');
  assert.equal(s.answers.length, 3);
});

test('skip in survival does not cost a life', () => {
  GM.cur = null;
  GM.startSurvival();
  const s = GM.cur;
  assert.equal(s.lives, 3);
  GM.skip();
  assert.equal(s.lives, 3);
  GM.next();
  GM.answer(wrongChoice(GM.q()));
  assert.equal(s.lives, 2);
  GM.abandon();
});

test('no hint on true/false, the earliest item on "order by year", all clues in "who am I"', () => {
  const tf = find((q) => q.type === 'tf'), ord = find((q) => q.type === 'order'), who = find((q) => q.type === 'whoami');
  play([tf.id, ord.id]);
  assert.equal(GM.canHint(GM.q()), false);
  assert.equal(GM.useHint(), false);
  assert.equal(GM.hintsLeft(), 1, 'nothing was used');
  GM.answer(true); GM.next();
  assert.ok(GM.useHint());
  assert.ok(GM.hintUsed(ord));
  assert.deepEqual(GM.removed(ord), []);
  assert.ok(GM.answer(ord.items.map((i) => i.t)).correct);
  play([who.id]);
  assert.equal(GM.cluesShown(who), who.clues.length);
  assert.ok(GM.useHint());
  assert.equal(GM.removed(who).length, 2);
});

test('head to head: every player has their own hint and skip', () => {
  GM.cur = null;
  GM.startH2H(['א', 'ב'], 3, {});
  const s = GM.cur;
  GM.ready();
  const p1 = GM.player();
  if (GM.canHint(GM.q())) assert.ok(GM.useHint()); else p1.hintsLeft = 0;
  GM.skip();
  assert.equal(p1.hintsLeft, 0);
  assert.equal(p1.skipsLeft, 0);
  GM.next(); GM.ready();
  const p2 = GM.player();
  assert.notEqual(p1, p2);
  assert.equal(GM.hintsLeft(), 1);
  assert.equal(GM.skipsLeft(), 1);
  assert.ok(GM.skip());
  GM.abandon();
  assert.ok(s);
});
