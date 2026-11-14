/* Choosing questions for a game: questions you haven't met come first, no two questions of the same
   "group" (for example two "who won the Champions League in year X") in one game when it can be avoided,
   the daily challenge is the same on every phone on the same day, and a journey stage never repeats its last try. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const PK = (KG.pick = {});

  // f: { cats, diffs, teams, types, images: 'only' | 'include' | undefined, ids }
  PK.pool = (f) => {
    f = f || {};
    let list = KG.C.active;
    if (f.images === 'only') list = list.filter((q) => q.type === 'img' || q.img);
    else if (f.images !== 'include' && !(f.cats && f.cats.includes('images'))) list = list.filter((q) => q.cat !== 'images');
    if (f.cats && f.cats.length) list = list.filter((q) => f.cats.includes(q.cat) || (f.cats.includes('israel') && q.il));
    if (f.diffs && f.diffs.length) list = list.filter((q) => f.diffs.includes(q.diff));
    if (f.teams && f.teams.length) list = list.filter((q) => (q.teams || []).some((t) => f.teams.includes(t)));
    if (f.types && f.types.length) list = list.filter((q) => f.types.includes(q.type));
    if (f.sub) list = list.filter((q) => q.sub === f.sub);
    return list;
  };

  const weight = (q) => {
    const s = KG.P && KG.P.q[q.id];
    if (!s || !s.a) return 3;      // never answered
    if (!s.s) return 2;            // answered, not solved yet
    return 1;                      // solved before
  };

  // count questions from list, fresh first, avoiding repeated groups; rand for reproducible order.
  PK.choose = (list, count, rand, exclude) => {
    const ex = new Set(exclude || []);
    const r = rand || Math.random;
    const cand = KG.shuffle(list.filter((q) => !ex.has(q.id)), r);
    const tiers = [3, 2, 1].map((w) => cand.filter((q) => weight(q) === w));
    const out = [], groups = new Set();
    for (const pass of [true, false]) {
      for (const tier of tiers) {
        for (const q of tier) {
          if (out.length >= count) break;
          if (out.includes(q)) continue;
          if (pass && q.grp && groups.has(q.grp)) continue;
          out.push(q);
          if (q.grp) groups.add(q.grp);
        }
      }
      if (out.length >= count) break;
    }
    return out.slice(0, count);
  };

  // Free play / categories / team challenge.
  PK.forGame = (filters, count) => {
    const list = PK.pool(filters);
    return PK.choose(list, Math.min(count, list.length)).sort((a, b) => a.diff - b.diff).map((q) => q.id);
  };

  // The daily challenge: only questions that ship with the app (the same on every phone), 2 easy, 3 medium, 2 hard.
  PK.daily = (dateKey) => {
    const rand = KG.rng('kaduraglan-daily-' + dateKey);
    const base = KG.C.base.questions;
    const all = KG.C.active.filter((q) => base[q.id] && q.cat !== 'images' && q.type !== 'order').sort((a, b) => (a.id < b.id ? -1 : 1));
    const plan = [[[1, 2], 2], [[3, 4], 3], [[5, 6], 2]];
    const out = [], groups = new Set();
    for (const [diffs, n] of plan) {
      const bucket = KG.shuffle(all.filter((q) => diffs.includes(q.diff)), rand);
      let got = 0;
      for (const q of bucket) {
        if (got >= n) break;
        if (q.grp && groups.has(q.grp)) continue;
        out.push(q.id); got++;
        if (q.grp) groups.add(q.grp);
      }
    }
    if (out.length < KG.CFG.DAILY_SIZE) {
      KG.shuffle(all, rand).forEach((q) => { if (out.length < KG.CFG.DAILY_SIZE && !out.includes(q.id)) out.push(q.id); });
    }
    return out;
  };

  // Survival: the level rises every 4 questions.
  PK.survivalNext = (n, used) => {
    const target = Math.min(6, 1 + Math.floor(n / 4));
    const all = PK.pool({});
    for (const d of [target, target - 1, target + 1, target - 2, target + 2, 1, 2, 3, 4, 5, 6]) {
      const got = PK.choose(all.filter((q) => q.diff === d), 1, null, used);
      if (got.length) return got[0].id;
    }
    return null;
  };

  // Journey: every try of a stage gets 5 questions you haven't seen, of the stage's level.
  // After a try the answers were shown, so playing the same 5 again would mean nothing: the next try
  // (to pass a failed stage, or for more stars) never repeats the previous try's questions, and prefers
  // questions you never met, then ones you got wrong, then ones you solved, before a nearby level.
  PK.journeyTotal = () => Math.max(1, Math.floor(PK.pool({}).length / KG.CFG.STAGE_SIZE));
  PK.stageIds = (n) => {
    const J = KG.P.journey;
    const st = J.stages[n] || {};
    const SIZE = KG.CFG.STAGE_SIZE;
    const last = new Set([].concat(st.ids || [], st.prev || []));
    const other = new Set();
    Object.keys(J.stages).forEach((k) => { if (+k !== n) (J.stages[k].ids || []).forEach((id) => other.add(id)); });
    const all = PK.pool({});
    const target = KG.CFG.stageDiff(n);
    const order = [target, target - 1, target + 1, target - 2, target + 2, 1, 2, 3, 4, 5, 6].filter((d, i, a) => d >= 1 && d <= 6 && a.indexOf(d) === i);
    const rand = KG.rng('journey-' + n + '-' + (st.tries || 0));
    const picked = [];
    const take = (ok) => {
      for (const d of order) {
        if (picked.length >= SIZE) return;
        PK.choose(all.filter((q) => q.diff === d && !picked.includes(q) && ok(q)), SIZE - picked.length, rand).forEach((q) => picked.push(q));
      }
    };
    take((q) => weight(q) === 3 && !last.has(q.id) && !other.has(q.id));   // never met
    take((q) => weight(q) === 2 && !last.has(q.id) && !other.has(q.id));   // got it wrong once
    take((q) => !last.has(q.id) && !other.has(q.id));                      // solved before
    take((q) => !last.has(q.id));                                         // a tiny bank: another stage's
    take(() => true);                                                     // nothing else left
    const ids = picked.sort((a, b) => a.diff - b.diff).map((q) => q.id);
    J.stages[n] = Object.assign({}, st, { ids, prev: (st.ids || []).slice(), tries: (st.tries || 0) + 1, best: st.best || 0, done: !!st.done });
    return ids;
  };
})(typeof window !== 'undefined' ? window : globalThis);
