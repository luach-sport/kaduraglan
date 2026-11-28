/* Update packages for the question bank: reading and checking a package file, importing it safely,
   content backups and restores, and exporting the editor's own additions as a package.

   Package = a ZIP file (football-update-001.zip or any name):
     manifest.json   { format: 1, app: "kaduraglan", id, title, contentVersion, created, notes, maintenance?,
                       files: { "questions.json": { size, sha256 }, "images/crest-x.webp": {…}, … } }
     questions.json  { add: [...], update: [...], remove: [ids] }          (remove only when maintenance: true)
     entities.json   { teams: { add, update }, players: {…}, nations: {…}, comps: {…}, stadiums: {…} }
     images.json     { add: [{ id, kind, for, file: "images/…", source, license, credit }], update: [...] }
     images/…        the picture files
   Every file is checked against its size and SHA-256 in the manifest; one bad file rejects the whole package.
   A one-file JSON package is also accepted (for phones that can't pick ZIP files):
     { manifest: { format: 1, app, id, …, checksum: sha256(JSON.stringify(data)) }, data: { questions, entities, images } }
   with each picture's bytes in images.add[i].data (base64). See docs/updates.md. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const PK = (KG.pkg = {});
  const MAX_BACKUPS = 4;
  const MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };
  const fz = () => { const f = G.fflate; if (!f) throw new Error('ספריית ה-ZIP לא נטענה'); return f; };
  const enc = (s) => new TextEncoder().encode(s);
  const dec = (u) => new TextDecoder().decode(u);
  const err = (msg) => { const e = new Error(msg); e.user = true; return e; };

  PK.sha256 = async (bytes) => {
    const h = await crypto.subtle.digest('SHA-256', bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  const toU8 = async (x) => (x instanceof Uint8Array ? x : x instanceof ArrayBuffer ? new Uint8Array(x) : new Uint8Array(await x.arrayBuffer()));
  const b64ToU8 = (b64) => Uint8Array.from(atob(String(b64)), (c) => c.charCodeAt(0));
  const u8ToB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const mimeOf = (name) => MIME[String(name).split('.').pop().toLowerCase()] || 'application/octet-stream';
  const parseJson = (u8, name) => { try { return JSON.parse(dec(u8)); } catch (e) { throw err('הקובץ ' + name + ' בחבילה לא תקין'); } };

  function checkManifest(m) {
    if (!m || typeof m !== 'object') throw err('בחבילה אין manifest.json תקין');
    if (m.format !== 1) throw err('גרסת פורמט לא נתמכת (' + m.format + ')');
    if (m.app && m.app !== 'kaduraglan') throw err('החבילה הזו לא שייכת ל' + KG.BRAND.name);
    if (!/^[A-Za-z0-9._-]{2,80}$/.test(String(m.id || ''))) throw err('לחבילה אין מזהה תקין');
  }

  // bytes → { manifest, questions, entities, images, files } after every check passed.
  PK.read = async (input) => {
    const u8 = await toU8(input);
    if (!u8.length) throw err('הקובץ ריק');
    if (u8[0] === 0x50 && u8[1] === 0x4b) return readZip(u8);
    if (u8[0] === 0x7b || (u8[0] === 0xef && u8[3] === 0x7b)) return readJson(u8);
    throw err('זה לא קובץ חבילה (ZIP או JSON)');
  };

  async function readZip(u8) {
    let entries;
    try { entries = fz().unzipSync(u8); } catch (e) { throw err('קובץ ה-ZIP פגום ואי אפשר לפתוח אותו'); }
    const files = Object.fromEntries(Object.entries(entries).filter(([n]) => !n.endsWith('/') && !/(^|\/)(__MACOSX|\.DS_Store)/.test(n)));
    if (!files['manifest.json']) throw err('בחבילה אין manifest.json');
    const manifest = parseJson(files['manifest.json'], 'manifest.json');
    checkManifest(manifest);
    if (manifest.kind === 'content-backup') throw err('זה קובץ גיבוי של המאגר. משחזרים אותו בכפתור "שחזור מגיבוי"');
    const listed = manifest.files || {};
    for (const name of Object.keys(files)) {
      if (name === 'manifest.json') continue;
      if (!listed[name]) throw err('הקובץ ' + name + ' לא רשום ב-manifest');
    }
    for (const [name, info] of Object.entries(listed)) {
      const f = files[name];
      if (!f) throw err('הקובץ ' + name + ' חסר בחבילה');
      if (info.size != null && info.size !== f.length) throw err('הקובץ ' + name + ' פגום (גודל לא תואם)');
      if (!info.sha256 || (await PK.sha256(f)) !== info.sha256) throw err('הקובץ ' + name + ' פגום (סכום ביקורת לא תואם)');
    }
    const questions = files['questions.json'] ? parseJson(files['questions.json'], 'questions.json') : {};
    const entities = files['entities.json'] ? parseJson(files['entities.json'], 'entities.json') : {};
    const images = files['images.json'] ? parseJson(files['images.json'], 'images.json') : {};
    const pics = {};
    for (const m of [].concat(images.add || [], images.update || [])) {
      if (m && m.file && files[m.file]) pics[m.id] = new Blob([files[m.file]], { type: mimeOf(m.file) });
    }
    return { manifest, questions, entities, images, files: pics };
  }

  async function readJson(u8) {
    const o = parseJson(u8, 'החבילה');
    if (o && o.kind === 'progress') throw err('זה קובץ גיבוי של ההתקדמות. משחזרים אותו במסך הפרופיל');
    checkManifest(o && o.manifest);
    const data = o.data || {};
    if (!o.manifest.checksum || (await PK.sha256(enc(JSON.stringify(data)))) !== o.manifest.checksum) throw err('החבילה פגומה (סכום ביקורת לא תואם)');
    const images = data.images || {};
    const pics = {};
    for (const m of [].concat(images.add || [], images.update || [])) {
      if (m && m.data) { try { pics[m.id] = new Blob([b64ToU8(m.data)], { type: m.type || mimeOf(m.file || 'x.webp') }); } catch (e) { /* reported as missing */ } delete m.data; }
    }
    return { manifest: o.manifest, questions: data.questions || {}, entities: data.entities || {}, images, files: pics };
  }

  // ---- Backups of the bank (the additions on top of what ships in the app) ----
  function backupOps(reason, now) {
    const key = 'auto-' + now;
    return { key, op: { store: 'backups', op: 'put', key, val: { key, ts: now, reason, overlay: KG.C.overlay, version: KG.C.meta.contentVersion, questions: KG.C.meta.questions } } };
  }
  async function trimBackups(keep) {
    const all = (await KG.db.keys('backups')).filter((k) => String(k).startsWith('auto-')).sort();
    const extra = all.slice(0, Math.max(0, all.length - keep));
    return extra.map((k) => ({ store: 'backups', op: 'del', key: k }));
  }
  PK.listBackups = async () => (await KG.db.all('backups')).map(([, v]) => v).filter((v) => v && v.ts).sort((a, b) => b.ts - a.ts);

  // Import: check → back up → merge → save everything in one transaction. On any failure nothing changes.
  PK.importBytes = async (bytes, source) => {
    const pkg = await PK.read(bytes);
    pkg.source = source || 'file';
    return PK.importPackage(pkg);
  };
  PK.importPackage = async (pkg) => {
    const now = Date.now();
    const C = KG.C;
    const res = KG.merge.apply(C.overlay, C.base, pkg, now);
    if (res.report.already) return res.report;
    const b = backupOps('לפני ייבוא ' + (pkg.manifest.title || pkg.manifest.id), now);
    const ops = [b.op].concat(res.imagePuts.map((p) => ({ store: 'images', op: 'put', key: p.id, val: p.blob })), await trimBackups(MAX_BACKUPS - 1));
    try {
      await C.commit(res.overlay, ops);
    } catch (e) {
      console.error('import failed', e);
      throw err('הייבוא נכשל והמאגר נשאר בדיוק כמו שהיה. (' + (e.message || e) + ')');
    }
    res.report.backup = b.key;
    return res.report;
  };

  PK.restoreBackup = async (key) => {
    const bk = await KG.db.get('backups', key);
    if (!bk || !bk.overlay) throw err('הגיבוי לא נמצא');
    const now = Date.now();
    const cur = backupOps('לפני שחזור', now);
    const keepImgs = new Set(Object.keys(bk.overlay.images || {}));
    const stale = (await KG.db.keys('images')).filter((k) => !keepImgs.has(k)).map((k) => ({ store: 'images', op: 'del', key: k }));
    const ov = KG.merge.normalizeOverlay(bk.overlay);
    ov.log = [{ ts: now, id: 'restore', title: 'שחזור מגיבוי מ-' + KG.dateFull(bk.ts), source: 'backup', ok: true }].concat(KG.C.overlay.log || []).slice(0, 100);
    await KG.C.commit(ov, [cur.op].concat(stale, await trimBackups(MAX_BACKUPS - 1)));
  };

  // A full backup of the bank's additions and pictures as a ZIP file the player can keep anywhere.
  PK.exportContent = async () => {
    const f = fz();
    const files = { 'overlay.json': enc(JSON.stringify(KG.C.overlay)) };
    for (const id of Object.keys(KG.C.overlay.images || {})) {
      const blob = await KG.db.get('images', id);
      if (blob) files['images/' + id] = await toU8(blob);
    }
    const manifest = { format: 1, app: 'kaduraglan', kind: 'content-backup', id: 'backup-' + Date.now(), created: new Date().toISOString(), contentVersion: KG.C.meta.contentVersion, appVersion: KG.VERSION.version };
    files['manifest.json'] = enc(JSON.stringify(manifest, null, 1));
    return f.zipSync(files, { level: 6 });
  };
  PK.readContentBackup = async (input) => {
    const u8 = await toU8(input);
    let entries;
    try { entries = fz().unzipSync(u8); } catch (e) { throw err('קובץ הגיבוי פגום'); }
    const man = entries['manifest.json'] ? parseJson(entries['manifest.json'], 'manifest.json') : null;
    if (!man || man.kind !== 'content-backup' || !entries['overlay.json']) throw err('זה לא קובץ גיבוי של המאגר');
    const overlay = KG.merge.normalizeOverlay(parseJson(entries['overlay.json'], 'overlay.json'));
    const images = {};
    Object.entries(entries).forEach(([n, data]) => { if (n.startsWith('images/') && !n.endsWith('/')) images[n.slice(7)] = new Blob([data], { type: (overlay.images[n.slice(7)] || {}).type || 'image/webp' }); });
    return { manifest: man, overlay, images };
  };
  PK.restoreContent = async (bk) => {
    const now = Date.now();
    const cur = backupOps('לפני שחזור מקובץ', now);
    const ops = [cur.op, { store: 'images', op: 'clear' }].concat(Object.entries(bk.images).map(([id, blob]) => ({ store: 'images', op: 'put', key: id, val: blob })), await trimBackups(MAX_BACKUPS - 1));
    const ov = bk.overlay;
    ov.log = [{ ts: now, id: 'restore-file', title: 'שחזור מקובץ גיבוי', source: 'backup', ok: true }].concat(ov.log || []).slice(0, 100);
    await KG.C.commit(ov, ops);
  };

  // ---- Packages made on this phone (the editor's additions), to share with friends or send to the developer ----
  PK.buildPackage = async ({ id, title, notes, questions, entities, images, contentVersion, maintenance }) => {
    const f = fz();
    const files = {};
    const add = (name, u8) => { files[name] = u8; };
    if (questions) add('questions.json', enc(JSON.stringify(questions, null, 1)));
    if (entities) add('entities.json', enc(JSON.stringify(entities, null, 1)));
    if (images && images.length) {
      const meta = { add: [] };
      for (const im of images) {
        const ext = (im.blob.type || 'image/webp').split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
        const name = 'images/' + im.meta.id + '.' + ext;
        add(name, await toU8(im.blob));
        meta.add.push(Object.assign({}, im.meta, { file: name, stored: undefined, pkg: undefined }));
      }
      add('images.json', enc(JSON.stringify(meta, null, 1)));
    }
    const listed = {};
    for (const [n, u8] of Object.entries(files)) listed[n] = { size: u8.length, sha256: await PK.sha256(u8) };
    const manifest = { format: 1, app: 'kaduraglan', id, title: title || id, contentVersion: contentVersion || 0, created: new Date().toISOString(), notes: notes || '', files: listed };
    if (maintenance) manifest.maintenance = true;
    files['manifest.json'] = enc(JSON.stringify(manifest, null, 1));
    return f.zipSync(files, { level: 6 });
  };

  PK.exportEditor = async () => {
    const ov = KG.C.overlay, base = KG.C.base;
    const qs = Object.values(ov.questions).filter((q) => q.origin === 'editor');
    const strip = (q) => { const o = Object.assign({}, q); delete o.pkg; delete o.origin; return o; };
    const questions = { add: qs.filter((q) => !base.questions[q.id]).map(strip), update: qs.filter((q) => base.questions[q.id]).map(strip) };
    const imgs = [];
    for (const m of Object.values(ov.images).filter((m) => m.origin === 'editor')) {
      const blob = await KG.db.get('images', m.id);
      if (blob) imgs.push({ meta: Object.assign({}, m, { origin: undefined }), blob });
    }
    if (!qs.length && !imgs.length) throw err('עוד לא הוספת או שינית כלום בעורך');
    const stamp = KG.dateKey().replace(/-/g, '');
    const id = 'editor-' + stamp + '-' + KG.uid().slice(-5);
    const bytes = await PK.buildPackage({ id, title: 'תוספות מהעורך ' + KG.dateFull(Date.now()), questions, images: imgs });
    return { bytes, id, questions: qs.length, images: imgs.length };
  };

  PK.u8ToB64 = u8ToB64;
  PK.b64ToU8 = b64ToU8;
})(typeof window !== 'undefined' ? window : globalThis);
