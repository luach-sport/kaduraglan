/* How an update package joins the question bank (pure functions, no storage — tested in tests/merge.test.mjs).
   Rules:
   - Every record has a stable id and a revision number (rev).
   - "add" adds a new id. An id that already exists is never overwritten by "add" (no duplicates).
   - "update" changes an existing id, and only with a higher rev than the one installed.
   - Anything the package doesn't mention stays exactly as it is.
   - "remove" works only in a package marked maintenance: true, and keeps a marker (never a hard delete),
     so the player's history for that question stays.
   - A package id can be installed once; importing it again changes nothing. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const M = (KG.merge = {});
  const ENT = ['teams', 'players', 'nations', 'comps', 'stadiums'];
  const clone = (o) => JSON.parse(JSON.stringify(o));

  M.emptyOverlay = () => ({
    v: 1, questions: {}, removed: {}, entities: { teams: {}, players: {}, nations: {}, comps: {}, stadiums: {} },
    images: {}, packages: {}, log: [], contentVersion: 0, updatedAt: 0
  });

  M.normalizeOverlay = (o) => {
    const d = M.emptyOverlay();
    if (!o || typeof o !== 'object') return d;
    for (const k of ['questions', 'removed', 'images', 'packages']) if (o[k] && typeof o[k] === 'object') d[k] = o[k];
    if (o.entities) ENT.forEach((k) => { if (o.entities[k] && typeof o.entities[k] === 'object') d.entities[k] = o.entities[k]; });
    if (Array.isArray(o.log)) d.log = o.log.slice(0, 100);
    d.contentVersion = +o.contentVersion || 0;
    d.updatedAt = +o.updatedAt || 0;
    return d;
  };

  const rev = (x) => (x && Number.isInteger(x.rev) ? x.rev : 1);

  // The installed version of a question: the higher rev of the app's own bank and the additions, unless removed.
  M.currentQuestion = (base, ov, id) => {
    const b = base.questions[id], o = ov.questions[id];
    let cur = b && o ? (rev(o) >= rev(b) ? o : b) : b || o || null;
    const tomb = ov.removed[id];
    if (cur && tomb && tomb.rev >= rev(cur)) cur = null;
    return cur;
  };
  M.currentEntity = (base, ov, kind, id) => {
    const b = (base.entities[kind] || {})[id], o = (ov.entities[kind] || {})[id];
    return b && o ? (rev(o) >= rev(b) ? o : b) : b || o || null;
  };

  M.effective = (base, ov) => {
    const questions = new Map();
    const ids = new Set(Object.keys(base.questions).concat(Object.keys(ov.questions)));
    ids.forEach((id) => { const q = M.currentQuestion(base, ov, id); if (q) questions.set(id, q); });
    const entities = {};
    ENT.forEach((k) => {
      const m = new Map();
      const all = new Set(Object.keys(base.entities[k] || {}).concat(Object.keys(ov.entities[k] || {})));
      all.forEach((id) => m.set(id, M.currentEntity(base, ov, k, id)));
      entities[k] = m;
    });
    const images = new Map(Object.entries(base.images || {}));
    Object.entries(ov.images).forEach(([id, meta]) => { const b = images.get(id); if (!b || (meta.v || 1) >= (b.v || 1)) images.set(id, meta); });
    return { questions, entities, images };
  };

  const sameContent = (a, b) => JSON.stringify(Object.assign({}, a, { rev: 0 })) === JSON.stringify(Object.assign({}, b, { rev: 0 }));

  // pkg: { manifest, questions: {add, update, remove}, entities: {teams: {add, update}, ...}, images: {add, update}, files: {imageId: blob} }
  M.apply = (overlay, base, pkg, now) => {
    const ov = clone(M.normalizeOverlay(overlay));
    const man = pkg.manifest || {};
    const report = { id: man.id, title: man.title || '', added: 0, updated: 0, removed: 0, skipped: 0, rejected: [], images: 0, entities: 0 };
    const reject = (id, kind, reason) => report.rejected.push({ id: String(id || '?'), kind, reason });
    if (!man.id) throw new Error('bad-manifest');
    if (ov.packages[man.id]) { report.already = true; return { overlay: ov, report, imagePuts: [] }; }
    const S = KG.schema;
    const qs = pkg.questions || {};

    for (const q of qs.add || []) {
      const errs = S.checkQuestion(q);
      if (errs.length) { reject(q && q.id, 'question', errs[0]); continue; }
      const cur = M.currentQuestion(base, ov, q.id);
      if (cur) {
        if (rev(cur) === q.rev && sameContent(cur, q)) report.skipped++;
        else reject(q.id, 'question', 'המזהה כבר קיים. לשינוי שאלה קיימת משתמשים ב-update');
        continue;
      }
      const tomb = ov.removed[q.id];
      if (tomb && q.rev <= tomb.rev) { reject(q.id, 'question', 'השאלה הוסרה. כדי להחזיר אותה צריך rev גבוה יותר'); continue; }
      ov.questions[q.id] = Object.assign({}, q, { pkg: man.id });
      report.added++;
    }

    for (const u of qs.update || []) {
      const cur = u && M.currentQuestion(base, ov, u.id);
      if (!cur) { reject(u && u.id, 'question', 'אין שאלה כזו במאגר לעדכן'); continue; }
      const next = u.patch ? Object.assign({}, cur, u.patch, { id: cur.id, rev: u.rev }) : Object.assign({}, u);
      delete next.patch;
      if (!Number.isInteger(next.rev) || next.rev <= rev(cur)) { reject(u.id, 'question', 'העדכון צריך rev גבוה מ-' + rev(cur)); continue; }
      const errs = S.checkQuestion(next);
      if (errs.length) { reject(u.id, 'question', errs[0]); continue; }
      next.pkg = man.id;
      ov.questions[u.id] = next;
      report.updated++;
    }

    for (const id of qs.remove || []) {
      if (!man.maintenance) { reject(id, 'question', 'מחיקה מותרת רק בחבילת תחזוקה (maintenance)'); continue; }
      const cur = M.currentQuestion(base, ov, id);
      if (!cur) { reject(id, 'question', 'אין שאלה כזו'); continue; }
      ov.removed[id] = { rev: rev(cur), ts: now, pkg: man.id };
      report.removed++;
    }

    const ents = pkg.entities || {};
    ENT.forEach((kind) => {
      const e = ents[kind] || {};
      for (const x of e.add || []) {
        const errs = S.checkEntity(kind, x);
        if (errs.length) { reject(x && x.id, kind, errs[0]); continue; }
        const cur = M.currentEntity(base, ov, kind, x.id);
        if (cur) { if (sameContent(cur, Object.assign({ rev: 1 }, x))) report.skipped++; else reject(x.id, kind, 'המזהה כבר קיים'); continue; }
        ov.entities[kind][x.id] = Object.assign({ rev: 1 }, x);
        report.entities++;
      }
      for (const u of e.update || []) {
        const cur = u && M.currentEntity(base, ov, kind, u.id);
        if (!cur) { reject(u && u.id, kind, 'אין רשומה כזו לעדכן'); continue; }
        const next = u.patch ? Object.assign({}, cur, u.patch, { id: cur.id, rev: u.rev }) : Object.assign({}, u);
        delete next.patch;
        if (!Number.isInteger(next.rev) || next.rev <= rev(cur)) { reject(u.id, kind, 'העדכון צריך rev גבוה מ-' + rev(cur)); continue; }
        const errs = S.checkEntity(kind, next);
        if (errs.length) { reject(u.id, kind, errs[0]); continue; }
        ov.entities[kind][u.id] = next;
        report.entities++;
      }
    });

    const imagePuts = [];
    const im = pkg.images || {};
    const files = pkg.files || {};
    const curImg = (id) => ov.images[id] || (base.images || {})[id] || null;
    for (const [list, isUpdate] of [[im.add || [], false], [im.update || [], true]]) {
      for (const m of list) {
        const errs = S.checkImage(m);
        if (errs.length) { reject(m && m.id, 'image', errs[0]); continue; }
        const cur = curImg(m.id);
        if (!isUpdate && cur) { reject(m.id, 'image', 'כבר יש תמונה עם המזהה הזה'); continue; }
        if (isUpdate && cur && (m.v || 1) <= (cur.v || 1)) { reject(m.id, 'image', 'העדכון צריך v גבוה יותר'); continue; }
        if (!files[m.id]) { reject(m.id, 'image', 'קובץ התמונה חסר בחבילה'); continue; }
        const meta = Object.assign({}, m, { v: m.v || 1, stored: true, pkg: man.id });
        delete meta.file;
        ov.images[m.id] = meta;
        imagePuts.push({ id: m.id, blob: files[m.id] });
        report.images++;
      }
    }

    const changed = report.added + report.updated + report.removed + report.images + report.entities;
    if (changed) {
      ov.packages[man.id] = { id: man.id, title: man.title || '', contentVersion: +man.contentVersion || 0, date: now, source: pkg.source || 'file', added: report.added, updated: report.updated, removed: report.removed, images: report.images, rejected: report.rejected.length };
      ov.contentVersion = Math.max(ov.contentVersion || 0, +man.contentVersion || 0);
      ov.updatedAt = now;
    }
    ov.log.unshift({ ts: now, id: man.id, title: man.title || '', source: pkg.source || 'file', added: report.added, updated: report.updated, removed: report.removed, images: report.images, entities: report.entities, skipped: report.skipped, rejected: report.rejected.length, ok: !!changed });
    ov.log = ov.log.slice(0, 100);
    report.changed = changed;
    return { overlay: ov, report, imagePuts };
  };
})(typeof window !== 'undefined' ? window : globalThis);
