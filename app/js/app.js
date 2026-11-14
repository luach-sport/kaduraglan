/* Start-up: progress → theme → question bank → first screen, then the quiet internet jobs
   (new questions, a new app version, feedback waiting to be sent). Nothing here waits for the internet. */
(function (G) {
  'use strict';
  const KG = G.KG;

  async function quietJobs() {
    if (!KG.online()) return;
    KG.flushOutbox();
    const sum = await KG.online2.check(false);
    if (sum && sum.packages && sum.packages.length) KG.toast('נוספו למאגר ' + sum.added + ' שאלות חדשות' + (sum.updated ? ' ועודכנו ' + sum.updated : ''), 4000);
    const info = await KG.update.check(false);
    if (info && info.build > (KG.P.updateSeen || 0) && !KG.ui.sheet && KG.ui.view !== 'quiz') KG.openSheet('update');
  }

  KG.onContentChange = () => {
    if (!KG.ui || KG.ui.sheet) return;
    if (!KG.ui.view || ['data', 'library', 'editor', 'img-missing', 'teams', 'journey'].includes(KG.ui.view)) {
      if (document.getElementById('screen') && KG.booted) KG.render(true);
    }
  };

  async function boot() {
    await KG.loadProgress();
    KG.applyTheme();
    const scr = document.getElementById('screen');
    scr.innerHTML = '<div class="splash"><img src="logo.svg" alt=""><b style="color:var(--ink);font-size:20px">' + KG.BRAND.name + '</b><span>טוען את המאגר…</span></div>';
    await KG.initNetwork();
    await KG.C.init();
    KG.bindEvents();
    KG.booted = true;
    KG.render();
    if (KG.C.loadError) KG.toast('לא הצלחתי לטעון את מאגר השאלות. נסו לפתוח שוב את האפליקציה.', 6000);
    if (KG.firstIosSheet && KG.firstIosSheet() && !KG.P.games) KG.openSheet('installIos');

    KG.onNetwork((on) => { if (on) quietJobs(); if (!KG.ui.view && !KG.ui.sheet) KG.render(true); });
    KG.listen('App', 'appStateChange', (st) => { if (st && st.isActive) quietJobs(); else KG.saveProgress(true); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') KG.saveProgress(true); });
    G.addEventListener('pagehide', () => KG.saveProgress(true));
    G.addEventListener('error', (e) => console.warn('error', e && e.message));
    if (G.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (KG.P.settings.theme === 'system') KG.applyTheme(); });
    setTimeout(quietJobs, 1500);
  }

  boot().catch((e) => {
    console.error('boot', e);
    const scr = document.getElementById('screen');
    if (scr) scr.innerHTML = '<div class="empty"><b>משהו השתבש בפתיחה.</b><span class="fine">ההתקדמות שלך שמורה. סגרו ופתחו שוב את האפליקציה.</span><button type="button" class="btn small" onclick="location.reload()">לנסות שוב</button></div>';
  });
})(window);
