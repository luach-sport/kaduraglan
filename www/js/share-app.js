/* Sharing כדורגלן with friends: a short message with the link to the website, or the app itself as an APK
   file (Bluetooth, WhatsApp, Nearby Share, file manager…). The file is always the newest version: a newer
   APK that was already downloaded, otherwise the installed app (which is the newest once updated, because
   every update is a full APK), and when the phone knows a newer version exists online, that one is
   downloaded first. "שמירת קובץ ההתקנה בטלפון" saves the same newest file in the Documents folder. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const S = (KG.shareApp = {});
  const FILE = 'share/' + KG.BRAND.file + '.apk';
  const SITE = KG.PAGES_URL;

  S.text = 'היי! אני משחק בכדורגלן, חידון כדורגל בעברית עם מאות שאלות על כדורגל ישראלי ועולמי, ראש בראש ואתגר יומי. עובד גם בלי אינטרנט. אשמח מאוד לשתף אותך:';
  S.message = () => S.text + '\n' + SITE;

  S.link = async () => {
    const text = S.message();
    if (KG.isNative()) { try { await KG.callRaw('Share', 'share', { text, title: KG.BRAND.name, dialogTitle: 'שיתוף ' + KG.BRAND.name }); } catch (e) { /* closed */ } return; }
    if (navigator.share) { try { await navigator.share({ text }); } catch (e) { /* closed */ } return; }
    S.copy(text);
  };
  S.copy = async (text) => { try { await navigator.clipboard.writeText(text); KG.toast('הועתק'); } catch (e) { KG.toast(text, 5000); } };

  async function installedApk() {
    const r = await KG.callRaw('Filesystem', 'readFile', { path: '/proc/self/maps', encoding: 'utf8' });
    const m = String((r && r.data) || '').match(/(\/data\/app\/\S+?\/base\.apk)/);
    if (!m) throw new Error('no base.apk');
    return m[1];
  }
  // Returns a file URI of the newest APK this phone can get.
  S.newestApk = async () => {
    const dl = await KG.downloadedApk();
    if (dl) return dl;
    try { await KG.callRaw('Filesystem', 'deleteFile', { path: FILE, directory: 'CACHE' }); } catch (e) { /* not there */ }
    try { await KG.callRaw('Filesystem', 'mkdir', { path: 'share', directory: 'CACHE', recursive: true }); } catch (e) { /* exists */ }
    const newer = KG.update && KG.update.info && KG.online();
    let ok = false;
    if (newer) {
      try { KG.toast('מוריד את הגרסה החדשה ביותר…', 30000); await KG.callRaw('Filesystem', 'downloadFile', { url: KG.APK_URL, path: FILE, directory: 'CACHE', recursive: true }); ok = true; } catch (e) { ok = false; }
    }
    if (!ok) {
      try { await KG.callRaw('Filesystem', 'copy', { from: await installedApk(), to: FILE, toDirectory: 'CACHE' }); ok = true; } catch (e) {
        if (!KG.online()) throw new Error('offline');
        KG.toast('מוריד את הקובץ…', 30000);
        await KG.callRaw('Filesystem', 'downloadFile', { url: KG.APK_URL, path: FILE, directory: 'CACHE', recursive: true });
      }
    }
    const st = await KG.callRaw('Filesystem', 'stat', { path: FILE, directory: 'CACHE' });
    if (!st || st.size < 500000) throw new Error('small file');
    return (await KG.callRaw('Filesystem', 'getUri', { path: FILE, directory: 'CACHE' })).uri;
  };

  S.apk = async () => {
    if (!KG.isNative()) { G.open(KG.APK_URL, '_blank'); return; }
    if (S.busy) return;
    S.busy = true;
    KG.toast('מכין את הקובץ…', 8000);
    try {
      const uri = await S.newestApk();
      KG.$('#toast-root').innerHTML = '';
      await KG.callRaw('Share', 'share', { title: KG.BRAND.name, text: S.message(), files: [uri], dialogTitle: 'שליחת האפליקציה כקובץ' });
    } catch (e) {
      const msg = String(e && (e.message || e));
      if (!/cancel/i.test(msg)) KG.toast(msg === 'offline' ? 'אין אינטרנט כרגע. אפשר לשלוח קישור לאתר במקום' : 'לא הצלחתי להכין את הקובץ. אפשר לשלוח קישור לאתר במקום', 4000);
    } finally { S.busy = false; }
  };

  // A copy of the newest APK in the phone's Documents folder (Documents/כדורגלן), named with its version.
  S.saveApk = async () => {
    if (S.busy) return;
    S.busy = true;
    try {
      try { await KG.callRaw('Filesystem', 'requestPermissions'); } catch (e) { /* not needed on new Android */ }
      const uri = await S.newestApk();
      const l = (() => { try { return JSON.parse(localStorage.getItem('kg.latestApk') || 'null'); } catch (e) { return null; } })();
      const ver = l && l.build > KG.currentBuild() ? l.version + '.' + l.build : KG.VERSION.version + '.' + KG.VERSION.build;
      const name = KG.BRAND.file + '-' + ver + '.apk';
      try { await KG.callRaw('Filesystem', 'mkdir', { path: KG.BRAND.name, directory: 'DOCUMENTS', recursive: true }); } catch (e) { /* exists */ }
      await KG.callRaw('Filesystem', 'copy', { from: uri, to: KG.BRAND.name + '/' + name, toDirectory: 'DOCUMENTS' });
      KG.toast('נשמר: Documents/' + KG.BRAND.name + '/' + name, 5000);
    } catch (e) {
      console.warn('save apk', e && (e.message || e));
      KG.toast('לא הצלחתי לשמור בתיקייה. אפשר לשמור דרך "שליחת האפליקציה כקובץ" ← מנהל הקבצים', 5000);
    } finally { S.busy = false; }
  };

  const row = (action, ic, cls, label, sub) => KG.row(action, ic, cls, label, sub);
  KG.SHEETS.shareApp = {
    title: () => 'שיתוף האפליקציה',
    render: () => '<p class="fine" style="font-size:14px">אפשר לשלוח לחברים קישור לאתר של ' + KG.esc(KG.BRAND.name) + ', עם הסבר והתקנה לאנדרואיד ולאייפון' + (KG.isNative() ? ', או את האפליקציה עצמה כקובץ (תמיד הגרסה החדשה ביותר)' : '') + '.</p>' +
      '<div class="card tight">' +
      row('share-app-link', 'link', 'blue', 'שליחת קישור לאתר', 'הודעה קצרה עם הקישור, לוואטסאפ ולכל מקום') +
      (KG.isNative() ? row('share-app-apk', 'download', 'green', 'שליחת האפליקציה כקובץ (APK)', 'בבלוטות\', בוואטסאפ או במנהל הקבצים. עובד גם בלי אינטרנט') : '') +
      row('share-app-copy', 'copy', 'orange', 'העתקת הקישור לאתר', SITE.replace(/^https:\/\//, '').replace(/\/$/, '')) +
      '</div><div class="card"><p class="fine">ההודעה שנשלחת:<br>' + KG.esc(S.text) + '<br><span class="ltr">' + KG.esc(SITE) + '</span></p></div>'
  };
  KG.A['share-app'] = () => KG.openSheet('shareApp');
  KG.A['share-app-link'] = () => { KG.closeSheet(); S.link(); };
  KG.A['share-app-apk'] = () => { KG.closeSheet(); S.apk(); };
  KG.A['share-app-copy'] = () => { KG.closeSheet(); S.copy(SITE); };
  KG.A['save-apk'] = () => S.saveApk();
})(typeof window !== 'undefined' ? window : globalThis);
