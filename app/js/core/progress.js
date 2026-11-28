/* The player's own data: points, solved questions, achievements, records, settings.
   Kept on the phone in two places (Android preferences and the web view's storage), plus the previous
   good copy, so a crash in the middle of a save never loses progress. Content updates never touch it. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const KEY = 'kg.progress.v1';
  const PREV = 'kg.progress.prev';

  KG.defaultProgress = () => ({
    v: 1,
    createdAt: Date.now(),
    savedAt: 0,
    name: '',
    settings: { theme: 'dark', sound: true, vibrate: true, timer: true, favTeams: ['barcelona'] },
    xp: 0,
    games: 0,
    answered: 0,
    correct: 0,
    bestStreak: 0,
    bestScore: 0,
    noHintCorrect: 0,
    hardCorrect: 0,
    dayStreak: { count: 0, last: '', best: 0 },
    maxDateSeen: '',
    q: {},          // per question: { a: answered, c: correct, s: first solved time, l: last time }
    cat: {},        // per category: { a, c }
    ach: {},        // achievement id → time unlocked (once only)
    daily: {},      // 'YYYY-MM-DD' → { score, correct, total, rewarded, xp }
    journey: { stages: {}, unlocked: 1 },
    survival: { best: 0, bestScore: 0, games: 0 },
    h2h: { games: 0 },
    seen: { teams: {}, players: {}, crests: {} },
    session: null,  // an unfinished game, to continue later
    lastMode: null,
    reports: [],    // "report a mistake" notes
    outbox: [],     // feedback waiting to be sent
    profile: { name: '', email: '' },
    updateSeen: 0,
    contentSeen: '',
    editorHash: ''
  });

  const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  KG.normalizeProgress = (raw) => {
    const d = KG.defaultProgress();
    if (!isObj(raw)) return d;
    for (const k of ['createdAt', 'savedAt', 'xp', 'games', 'answered', 'correct', 'bestStreak', 'bestScore', 'noHintCorrect', 'hardCorrect', 'updateSeen']) d[k] = Math.max(0, num(raw[k], d[k]));
    for (const k of ['name', 'maxDateSeen', 'contentSeen', 'editorHash', 'lastMode']) if (typeof raw[k] === 'string') d[k] = raw[k];
    if (isObj(raw.settings)) {
      const s = raw.settings;
      if (['dark', 'light', 'system'].includes(s.theme)) d.settings.theme = s.theme;
      ['sound', 'vibrate', 'timer'].forEach((k) => { if (typeof s[k] === 'boolean') d.settings[k] = s[k]; });
      if (Array.isArray(s.favTeams)) d.settings.favTeams = s.favTeams.filter((x) => typeof x === 'string').slice(0, 30);
    }
    if (isObj(raw.dayStreak)) d.dayStreak = { count: num(raw.dayStreak.count, 0), last: String(raw.dayStreak.last || ''), best: num(raw.dayStreak.best, 0) };
    for (const k of ['q', 'cat', 'ach', 'daily']) if (isObj(raw[k])) d[k] = raw[k];
    if (isObj(raw.journey) && isObj(raw.journey.stages)) d.journey = { stages: raw.journey.stages, unlocked: Math.max(1, num(raw.journey.unlocked, 1)) };
    if (isObj(raw.survival)) d.survival = { best: num(raw.survival.best, 0), bestScore: num(raw.survival.bestScore, 0), games: num(raw.survival.games, 0) };
    if (isObj(raw.h2h)) d.h2h = { games: num(raw.h2h.games, 0) };
    if (isObj(raw.seen)) ['teams', 'players', 'crests'].forEach((k) => { if (isObj(raw.seen[k])) d.seen[k] = raw.seen[k]; });
    if (isObj(raw.session) && Array.isArray(raw.session.ids)) d.session = raw.session;
    if (Array.isArray(raw.reports)) d.reports = raw.reports.filter(isObj).slice(-200);
    if (Array.isArray(raw.outbox)) d.outbox = raw.outbox.filter(isObj).slice(-30);
    if (isObj(raw.profile)) d.profile = { name: String(raw.profile.name || ''), email: String(raw.profile.email || '') };
    return d;
  };

  function parse(raw) { if (!raw) return null; try { const o = JSON.parse(raw); return isObj(o) ? o : null; } catch (e) { return null; } }
  function lsGet(k) { try { return G.localStorage ? G.localStorage.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (G.localStorage) G.localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  KG.loadProgress = async () => {
    const cands = [parse(lsGet(KEY))];
    if (KG.isNative()) {
      const r = await KG.call('Preferences', 'get', { key: KEY });
      cands.push(parse(r && r.value));
    }
    let best = cands.filter(Boolean).sort((a, b) => num(b.savedAt, 0) - num(a.savedAt, 0))[0];
    if (!best) best = parse(lsGet(PREV));
    KG.P = KG.normalizeProgress(best);
    return KG.P;
  };

  let timer = null;
  KG.saveProgress = (now) => {
    const write = () => {
      timer = null;
      if (!KG.P) return;
      KG.P.savedAt = Date.now();
      const raw = JSON.stringify(KG.P);
      const cur = lsGet(KEY);
      if (cur && cur !== raw) lsSet(PREV, cur);
      lsSet(KEY, raw);
      if (KG.isNative()) KG.call('Preferences', 'set', { key: KEY, value: raw });
    };
    clearTimeout(timer);
    if (now) write(); else timer = setTimeout(write, 300);
  };

  // ---- Backup of the player's progress (separate from the question bank) ----
  KG.progressBackup = () => JSON.stringify({ app: KG.BRAND.en, kind: 'progress', v: 1, exportedAt: new Date().toISOString(), version: KG.VERSION.version, progress: KG.P }, null, 1);
  KG.readProgressBackup = (text) => {
    const o = parse(text);
    if (!o || o.kind !== 'progress' || !isObj(o.progress)) throw new Error('זה לא קובץ גיבוי של ההתקדמות ב' + KG.BRAND.name);
    return KG.normalizeProgress(o.progress);
  };
})(typeof window !== 'undefined' ? window : globalThis);
