/* New versions of the app. Every release publishes a signed update.json next to kaduraglan.apk on GitHub.
   The app checks the signature with the public key it was built with, and offers "עדכון עכשיו": it downloads
   the new APK inside the app and opens Android's installer, which installs it over the current one (all the
   progress and questions stay). Because the installed app is then the newest one, sharing the app as a file
   and backing it up from a file manager always give the latest version. On iPhone / web the new version
   simply arrives with the website (sw.js). */
(function (G) {
  'use strict';
  const KG = G.KG;
  const RELEASES = 'https://github.com/' + KG.REPO + '/releases/';
  const MANIFEST_URLS = [RELEASES + 'latest/download/update.json', 'https://raw.githubusercontent.com/' + KG.REPO + '/main/update.json'];
  KG.APK_URL = RELEASES + 'latest/download/' + KG.BRAND.file + '.apk';
  const APK_PATH = 'apk/' + KG.BRAND.file + '.apk';

  const U = (KG.update = { state: 'idle', info: null, progress: 0, error: '', checkedAt: 0 });
  const b64Bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  async function verify(doc) {
    const jwk = KG.VERSION.updateKey;
    if (!jwk || !G.crypto || !crypto.subtle) throw new Error('no-key');
    if (!doc || typeof doc.payload !== 'string' || typeof doc.sig !== 'string') throw new Error('bad-manifest');
    const ec = jwk.kty === 'EC';
    const importAlg = ec ? { name: 'ECDSA', namedCurve: jwk.crv } : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    const verifyAlg = ec ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' };
    const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, crv: jwk.crv, x: jwk.x, y: jwk.y }, importAlg, false, ['verify']);
    if (!(await crypto.subtle.verify(verifyAlg, key, b64Bytes(doc.sig), new TextEncoder().encode(doc.payload)))) throw new Error('bad-signature');
    const p = JSON.parse(doc.payload);
    if (p.app !== KG.APP_ID) throw new Error('wrong-app');
    if (typeof p.url !== 'string' || p.url.indexOf(RELEASES + 'download/') !== 0) throw new Error('bad-url');
    return p;
  }
  async function fetchManifest() {
    let last = null;
    for (const url of MANIFEST_URLS) {
      try {
        const r = await KG.http(url + '?t=' + Date.now(), { timeout: 15000, text: true });
        if (!r.ok) { last = new Error('http ' + r.status); continue; }
        return await verify(typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
      } catch (e) { last = e; }
    }
    throw last || new Error('no-manifest');
  }

  KG.currentBuild = () => parseInt(KG.VERSION.build, 10) || 0;
  KG.canUpdate = () => KG.isNative() && !!KG.VERSION.updateKey;

  U.check = async (manual) => {
    if (!KG.canUpdate()) return null;
    if (U.state !== 'idle' && U.state !== 'error') return U.info;
    if (!KG.online()) { if (manual) U.error = 'אין חיבור לאינטרנט'; return U.info; }
    if (!manual && Date.now() - U.checkedAt < 30 * 60e3) return U.info;
    U.state = 'checking'; U.error = '';
    try {
      const p = await fetchManifest();
      U.checkedAt = Date.now();
      U.info = +p.build > KG.currentBuild() ? { version: String(p.version), build: +p.build, notes: Array.isArray(p.notes) ? p.notes.map(String).slice(0, 8) : [], url: p.url, size: +p.size || 0 } : null;
      U.state = 'idle';
    } catch (e) {
      console.warn('update check', e && e.message);
      U.state = 'idle';
      if (manual) U.error = 'לא הצלחתי לבדוק כרגע. נסה שוב בעוד רגע.';
    }
    return U.info;
  };

  // Downloads the new APK (with progress) and opens the installer.
  U.apply = async () => {
    const i = U.info;
    if (!i || !KG.isNative()) return false;
    if (!KG.online()) { U.error = 'אין חיבור לאינטרנט'; KG.renderSheet(); return false; }
    U.state = 'downloading'; U.progress = 0; U.error = ''; KG.renderSheet();
    let sub = null;
    try {
      sub = await KG.listen('Filesystem', 'progress', (e) => {
        if (e && e.contentLength) { U.progress = KG.clamp((e.bytes / e.contentLength) * 100, 0, 100); const b = document.getElementById('upd-bar'); if (b) b.style.width = U.progress.toFixed(0) + '%'; const t = document.getElementById('upd-pct'); if (t) t.textContent = Math.round(U.progress) + '%'; }
      });
      try { await KG.callRaw('Filesystem', 'deleteFile', { path: APK_PATH, directory: 'CACHE' }); } catch (e) { /* not there */ }
      await KG.callRaw('Filesystem', 'downloadFile', { url: i.url, path: APK_PATH, directory: 'CACHE', recursive: true, progress: true });
      const st = await KG.callRaw('Filesystem', 'stat', { path: APK_PATH, directory: 'CACHE' });
      if (!st || st.size < 500000 || (i.size && Math.abs(st.size - i.size) > 16)) throw new Error('size');
      try { localStorage.setItem('kg.latestApk', JSON.stringify({ build: i.build, version: i.version })); } catch (e) { /* ignore */ }
      U.state = 'installing'; KG.renderSheet();
      KG.saveProgress(true);
      const uri = (await KG.callRaw('Filesystem', 'getUri', { path: APK_PATH, directory: 'CACHE' })).uri;
      await KG.callRaw('FileOpener', 'open', { filePath: uri, contentType: 'application/vnd.android.package-archive', openWithDefault: true });
      U.state = 'idle';
      KG.renderSheet();
      return true;
    } catch (e) {
      console.warn('update apply', e && (e.message || e));
      U.state = 'idle';
      U.error = 'ההורדה לא הושלמה. אפשר לנסות שוב, או להוריד מהאתר.';
      KG.renderSheet();
      return false;
    } finally {
      try { if (sub && sub.remove) sub.remove(); } catch (e) { /* ignore */ }
    }
  };

  // The newest APK file on the phone: the one just downloaded (if it's newer than what's installed), or null.
  KG.downloadedApk = async () => {
    try {
      const l = JSON.parse(localStorage.getItem('kg.latestApk') || 'null');
      if (!l || l.build <= KG.currentBuild()) return null;
      const st = await KG.callRaw('Filesystem', 'stat', { path: APK_PATH, directory: 'CACHE' });
      return st && st.size > 500000 ? (await KG.callRaw('Filesystem', 'getUri', { path: APK_PATH, directory: 'CACHE' })).uri : null;
    } catch (e) { return null; }
  };

  KG.SHEETS.update = {
    title: () => 'גרסה חדשה',
    render: () => {
      const i = U.info;
      const mine = 'אצלך: ' + KG.esc(KG.VERSION.version) + ' (בנייה ' + KG.esc(KG.VERSION.build) + ')';
      if (!i) {
        return '<div class="about-head"><img src="logo.svg" alt=""><h2>' + KG.esc(KG.BRAND.name) + '</h2><span class="ver">' + mine + '</span></div>' +
          (U.error ? '<div class="notice orange">' + KG.icon('alert', 'sm') + '<span class="grow">' + KG.esc(U.error) + '</span></div>' : '<div class="notice green">' + KG.icon('check', 'sm') + '<span class="grow">יש לך את הגרסה האחרונה.</span></div>') +
          '<button type="button" class="btn secondary" data-action="close-sheet">סגירה</button>';
      }
      let h = '<div class="about-head"><img src="logo.svg" alt=""><h2>' + KG.esc(KG.BRAND.name) + ' ' + KG.esc(i.version) + '</h2><span class="ver">בנייה ' + i.build + ' · ' + mine + '</span></div>';
      if (i.notes.length) h += '<div class="card"><span class="section-label" style="margin:0 0 8px">מה חדש</span><ul style="margin:0;padding-inline-start:20px;display:flex;flex-direction:column;gap:6px">' + i.notes.map((n) => '<li>' + KG.esc(n) + '</li>').join('') + '</ul></div>';
      if (U.state === 'downloading') h += '<div class="field"><span class="label">מוריד את הגרסה החדשה… <span id="upd-pct">' + Math.round(U.progress) + '%</span></span><div class="bar"><span id="upd-bar" style="width:' + Math.max(3, U.progress) + '%"></span></div></div>';
      else if (U.state === 'installing') h += '<div class="notice green">' + KG.icon('check', 'sm') + '<span class="grow">ההורדה הסתיימה. במסך שנפתח לוחצים "עדכון" (בפעם הראשונה אנדרואיד מבקש לאשר התקנה מהאפליקציה הזו).</span></div><button type="button" class="btn" data-action="update-now">' + KG.icon('download') + 'לפתוח שוב את ההתקנה</button>';
      else h += '<button type="button" class="btn" data-action="update-now">' + KG.icon('download') + 'עדכון עכשיו</button>' +
        '<p class="fine center">הגרסה החדשה מותקנת מעל הקיימת. ההתקדמות, הנקודות וכל השאלות נשמרים.' + (i.size ? ' גודל ההורדה: ' + (i.size / 1048576).toFixed(1) + 'MB.' : '') + '</p>';
      if (U.error) h += '<div class="notice orange">' + KG.icon('alert', 'sm') + '<span class="grow">' + KG.esc(U.error) + '</span></div><a class="btn secondary" href="' + KG.esc(KG.APK_URL) + '" target="_blank" rel="noopener">' + KG.icon('link') + 'הורדה מהאתר</a>';
      if (U.state === 'idle') h += '<button type="button" class="btn secondary" data-action="update-later">אחר כך</button>';
      return h;
    }
  };
  KG.A['update-now'] = () => U.apply();
  KG.A['update-later'] = () => { if (U.info) { KG.P.updateSeen = U.info.build; KG.saveProgress(); } KG.closeSheet(); };
  KG.A['check-update'] = async () => {
    if (!KG.isNative()) { KG.toast('באייפון ובדפדפן העדכונים נכנסים לבד'); return; }
    if (!KG.canUpdate()) { KG.toast('בגרסת הבדיקה הזו אין בדיקת עדכונים'); return; }
    KG.toast('בודק…');
    await U.check(true);
    KG.openSheet('update');
  };
})(typeof window !== 'undefined' ? window : globalThis);
