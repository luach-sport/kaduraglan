/* The question bank as the game sees it: the bank that ships inside the app (www/data/content/) plus
   everything added by update packages and the editor (kept in the local database), merged by id and rev.
   KG.C holds the result with ready-made lists for the game screens and the library. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const C = (KG.C = { ready: false, base: null, overlay: null, questions: [], byId: new Map(), ent: {}, images: new Map(), active: [], byCat: {}, byTeam: {}, meta: {} });
  const FILES = ['questions', 'teams', 'players', 'nations', 'comps', 'stadiums', 'images'];

  // Reads the bank that ships with the app. Tests replace this with their own loader.
  C.loadBase = async () => {
    const get = async (name) => {
      const r = await fetch('data/content/' + name + '.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('missing ' + name);
      return r.json();
    };
    const manifest = await get('manifest');
    const parts = await Promise.all(FILES.map((f) => get(f).catch(() => [])));
    const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));
    const [questions, teams, players, nations, comps, stadiums, images] = parts.map(byId);
    return { manifest, questions, entities: { teams, players, nations, comps, stadiums }, images };
  };

  C.init = async () => {
    await KG.db.ready;
    try { C.base = await C.loadBase(); } catch (e) {
      console.error('bank', e);
      C.base = { manifest: { contentVersion: 0 }, questions: {}, entities: { teams: {}, players: {}, nations: {}, comps: {}, stadiums: {} }, images: {} };
      C.loadError = true;
    }
    let ov = null;
    try { ov = await KG.db.get('kv', 'overlay'); } catch (e) { console.warn('overlay read', e); }
    C.overlay = KG.merge.normalizeOverlay(ov);
    C.build();
    C.ready = true;
    return C;
  };

  C.build = () => {
    const eff = KG.merge.effective(C.base, C.overlay);
    C.ent = eff.entities;
    C.images = eff.images;
    const own = [...eff.questions.values()].map((q) => Object.assign({}, q));
    const gen = KG.gen ? KG.gen.imageQuestions(C) : [];
    C.questions = own.concat(gen);
    C.byId = new Map(C.questions.map((q) => [q.id, q]));
    // Not played: records waiting for review, and picture questions whose picture isn't on the phone.
    C.active = C.questions.filter((q) => q.status !== 'review' && (!q.img || C.images.has(q.img)));
    C.byCat = {};
    C.byTeam = {};
    C.active.forEach((q) => {
      (C.byCat[q.cat] = C.byCat[q.cat] || []).push(q);
      (q.teams || []).forEach((t) => (C.byTeam[t] = C.byTeam[t] || []).push(q));
    });
    const bv = +(C.base.manifest && C.base.manifest.contentVersion) || 0;
    C.meta = {
      baseVersion: bv,
      contentVersion: Math.max(bv, C.overlay.contentVersion || 0),
      baseDate: (C.base.manifest && C.base.manifest.date) || '',
      updatedAt: C.overlay.updatedAt || 0,
      questions: C.active.length,
      il: C.active.filter((q) => C.isIsraeli(q)).length,
      teams: C.ent.teams.size, players: C.ent.players.size, stadiums: C.ent.stadiums.size, nations: C.ent.nations.size, comps: C.ent.comps.size,
      images: C.images.size,
      review: C.questions.length - C.active.length
    };
    if (KG.onContentChange) KG.onContentChange();
  };

  C.isIsraeli = (q) => q.il === true || q.cat === 'israel';
  C.q = (id) => C.byId.get(id) || null;
  C.team = (id) => C.ent.teams && C.ent.teams.get(id);
  C.player = (id) => C.ent.players && C.ent.players.get(id);
  C.entityName = (id) => {
    for (const k of KG.schema.ENTITY_KINDS) { const x = C.ent[k] && C.ent[k].get(id); if (x) return x.he; }
    return id;
  };
  C.imagesOf = (kind) => [...C.images.values()].filter((m) => m.kind === kind);
  C.hasImage = (kind, forId) => [...C.images.values()].some((m) => m.kind === kind && m.for === forId);

  // Teams with enough questions for "challenge by team", favourites first.
  C.teamsForChallenge = (min) => {
    const fav = (KG.P && KG.P.settings.favTeams) || [];
    return Object.entries(C.byTeam)
      .filter(([id, list]) => list.length >= (min || 5) && C.team(id))
      .map(([id, list]) => ({ id, team: C.team(id), count: list.length, fav: fav.includes(id) }))
      .sort((a, b) => (b.fav - a.fav) || (b.count - a.count) || a.team.he.localeCompare(b.team.he, 'he'));
  };

  // Saves a new overlay (and any picture changes) in one transaction, then rebuilds the bank.
  C.commit = async (overlay, extraOps) => {
    const ops = [{ store: 'kv', op: 'put', key: 'overlay', val: overlay }].concat(extraOps || []);
    await KG.db.atomic(ops);
    C.overlay = KG.merge.normalizeOverlay(overlay);
    if (KG.img) KG.img.forget();
    C.build();
  };
})(typeof window !== 'undefined' ? window : globalThis);
