/* New questions from the internet, when there is a connection: the app reads the list of packages
   (content/index.json on the website, or updates/index.json in the repo as a backup), downloads the ones
   it doesn't have yet, checks each file's SHA-256 and imports it like any package. The game never waits
   for this, and without internet nothing changes. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const O = (KG.online2 = { state: 'idle', last: 0, error: '' });
  const EVERY = 6 * 3600e3;
  const LAST_KEY = 'kg.contentCheck';

  const lastCheck = () => { try { return +G.localStorage.getItem(LAST_KEY) || 0; } catch (e) { return 0; } };
  const markCheck = () => { try { G.localStorage.setItem(LAST_KEY, String(Date.now())); } catch (e) { /* ignore */ } };

  async function index() {
    let last = null;
    for (const base of KG.CONTENT_URLS) {
      try {
        const r = await KG.http(base + 'index.json?t=' + Date.now(), { timeout: 12000 });
        if (r.ok && r.data && Array.isArray(r.data.packages)) return { base, list: r.data.packages };
        last = new Error('http ' + r.status);
      } catch (e) { last = e; }
    }
    throw last || new Error('no index');
  }

  // Returns { added, updated, packages } of what was installed now.
  O.check = async (manual) => {
    if (O.state === 'checking') return null;
    if (!KG.online()) { if (manual) O.error = 'אין חיבור לאינטרנט'; return null; }
    if (!manual && Date.now() - lastCheck() < EVERY) return null;
    O.state = 'checking'; O.error = '';
    const sum = { added: 0, updated: 0, images: 0, packages: [] };
    try {
      const { base, list } = await index();
      markCheck();
      const have = KG.C.overlay.packages || {};
      const todo = list.filter((p) => p && p.id && p.file && !have[p.id]).sort((a, b) => (a.contentVersion || 0) - (b.contentVersion || 0));
      for (const p of todo) {
        const r = await KG.http(base + p.file + '?v=' + encodeURIComponent(p.sha256 || p.id), { binary: true, timeout: 60000 });
        if (!r.ok || !r.data) throw new Error('download ' + p.file);
        const u8 = new Uint8Array(r.data);
        if (p.sha256 && (await KG.pkg.sha256(u8)) !== p.sha256) throw new Error('checksum ' + p.file);
        const rep = await KG.pkg.importBytes(u8, 'online');
        if (!rep.already) { sum.added += rep.added; sum.updated += rep.updated; sum.images += rep.images; sum.packages.push(p.title || p.id); }
      }
    } catch (e) {
      console.warn('content check', e && e.message);
      if (manual) O.error = 'לא הצלחתי לבדוק כרגע. נסה שוב בעוד רגע.';
    } finally {
      O.state = 'idle';
      O.last = Date.now();
    }
    return sum;
  };
})(typeof window !== 'undefined' ? window : globalThis);
