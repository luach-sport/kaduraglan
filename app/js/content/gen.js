/* Picture questions made from the pictures in the bank: as soon as a club crest, a player photo, a shirt
   or a stadium picture exists (shipped with the app, from a package or added in the editor), a question
   "which team / who is this" exists for it. Their ids are stable (gen-<kind>-<id>), so progress is kept. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const GEN = (KG.gen = {});
  const TIER_DIFF = { 1: 2, 2: 3, 3: 4 };

  // Three wrong answers of the same kind: same country first, then same tier, then any.
  function distractors(list, target, key, rand) {
    const others = list.filter((x) => x.id !== target.id);
    const pick = [];
    const add = (arr) => { KG.shuffle(arr, rand).forEach((x) => { if (pick.length < 3 && !pick.includes(x) && KG.norm(x.he) !== KG.norm(target.he)) pick.push(x); }); };
    add(others.filter((x) => key && x[key] && x[key] === target[key]));
    add(others.filter((x) => x.tier === target.tier));
    add(others);
    return pick.map((x) => x.he);
  }

  const T = {
    crest: { of: 'teams', sub: 'crest', q: 'של איזו קבוצה הסמל הזה?', fx: 'half', key: 'country',
      explain: (t) => 'זה הסמל של ' + t.he + (t.country ? ' (' + t.country + ')' : '') + (t.founded ? ', שנוסדה ב-' + t.founded : '') + '.',
      hints: (t) => [t.country ? 'קבוצה מ' + t.country : '', t.city ? 'העיר: ' + t.city : ''] },
    'shirt-home': { of: 'teams', sub: 'shirt', q: 'של איזו קבוצה חולצת הבית הזו?', fx: 'none', key: 'country',
      explain: (t) => 'זו חולצת הבית של ' + t.he + '.', hints: (t) => [t.country ? 'קבוצה מ' + t.country : '', t.nick ? 'הכינוי: ' + t.nick : ''] },
    'shirt-away': { of: 'teams', sub: 'shirt', q: 'של איזו קבוצה חולצת החוץ הזו?', fx: 'none', key: 'country',
      explain: (t) => 'זו חולצת החוץ של ' + t.he + '.', hints: (t) => [t.country ? 'קבוצה מ' + t.country : ''] },
    player: { of: 'players', sub: 'player', q: 'מי השחקן בתמונה?', fx: 'blur', key: 'country',
      explain: (p) => 'זה ' + p.he + (p.country ? ', ' + p.country : '') + (p.pos ? ', ' + p.pos : '') + '.',
      hints: (p) => [p.country ? 'מדינה: ' + p.country : '', p.pos ? 'עמדה: ' + p.pos : ''] },
    stadium: { of: 'stadiums', sub: 'stadium', q: 'איזה אצטדיון מופיע בתמונה?', fx: 'none', key: 'country',
      explain: (s) => 'זה ' + s.he + (s.city ? ' ב' + s.city : '') + (s.opened ? ', שנפתח ב-' + s.opened : '') + '.',
      hints: (s) => [s.country ? 'מדינה: ' + s.country : '', s.city ? 'עיר: ' + s.city : ''] }
  };

  GEN.imageQuestions = (C) => {
    const out = [];
    for (const m of C.images.values()) {
      const t = T[m.kind];
      if (!t) continue;
      const ent = C.ent[t.of] && C.ent[t.of].get(m.for);
      if (!ent) continue;
      const pool = [...C.ent[t.of].values()];
      if (pool.length < 4) continue;
      const rand = KG.rng('gen-' + m.id);
      const w = distractors(pool, ent, t.key, rand);
      if (w.length < 3) continue;
      out.push({
        id: 'gen-' + m.kind + '-' + m.for, rev: m.v || 1, type: 'img', cat: 'images', sub: t.sub,
        diff: TIER_DIFF[ent.tier] || 3, q: t.q, a: ent.he, w, img: m.id, fx: t.fx,
        explain: t.explain(ent), hints: t.hints(ent).filter(Boolean),
        teams: t.of === 'teams' ? [ent.id] : (ent.clubs || []).filter((c) => C.ent.teams.has(c)).slice(0, 3),
        players: t.of === 'players' ? [ent.id] : [], src: m.source || '', generated: true, il: !!ent.il
      });
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
