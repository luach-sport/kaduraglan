/* כדורגלן in a browser and on iPhone (added to the home screen from Safari). Does nothing in the Android app.
   - Keeps a full copy of the app (with all the questions) on the phone (sw.js), so it works without internet.
   - A new version downloads quietly and switches in the next time the app comes back to the screen.
   - Asks the browser to keep the app's data even when the phone runs low on space. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const native = KG.isNative();
  const ua = navigator.userAgent || '';
  const iOS = !native && (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const standalone = !native && (navigator.standalone === true || !!(G.matchMedia && matchMedia('(display-mode: standalone)').matches));

  KG.isIOS = () => iOS;
  KG.isStandalone = () => standalone;
  KG.deviceName = () => (native ? 'אנדרואיד' : iOS ? (standalone ? 'אייפון (מסך הבית)' : 'אייפון (ספארי)') : standalone ? 'אפליקציית רשת' : 'דפדפן');
  if (native) return;

  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* not supported */ }
  if (!('serviceWorker' in navigator) || navigator.webdriver || !G.isSecureContext) return;
  const hadCopy = !!navigator.serviceWorker.controller;
  let fresh = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCopy) fresh = true; });
  const quiet = () => !KG.ui.sheet && KG.ui.view !== 'quiz' && KG.ui.view !== 'qform';
  const start = () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') { if (KG.P) KG.saveProgress(true); return; }
        if (fresh && quiet()) { location.reload(); return; }
        reg.update().catch(() => {});
      });
    }).catch((e) => console.warn('offline copy', e && e.message));
  };
  if (document.readyState === 'complete') start(); else G.addEventListener('load', start);
})(typeof window !== 'undefined' ? window : globalThis);
