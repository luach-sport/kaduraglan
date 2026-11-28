/* The frame of the app: screens, the bottom tabs, sheets (bottom panels), toasts, sounds and
   the Android back button. Screens are functions that return HTML (KG.V[name]); buttons call actions
   through data-action (KG.A[name]). */
(function (G) {
  'use strict';
  const KG = G.KG;
  const ui = (KG.ui = { tab: 'home', view: null, params: {}, history: [], sheet: null, form: {} });
  KG.V = {};
  KG.A = {};
  KG.SHEETS = {};
  const $ = (s) => document.querySelector(s);
  KG.$ = $;

  // ---- Theme ----
  KG.applyTheme = () => {
    const t = KG.P.settings.theme;
    const dark = t === 'system' ? !(G.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) : t !== 'light';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem('kg.theme', dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? KG.BRAND.dark.bg : KG.BRAND.light.bg);
    KG.setStatusBar(dark);
  };

  // ---- Rendering ----
  const TABS = ['home', 'play', 'cats', 'ach', 'profile'];
  KG.render = (keepScroll) => {
    const scr = $('#screen');
    if (!scr) return;
    const name = ui.view || ui.tab;
    const fn = KG.V[name];
    const y = keepScroll ? G.scrollY : 0;
    let html = '';
    try { html = fn ? fn(ui.params || {}) : ''; } catch (e) {
      console.error('render', name, e);
      html = KG.errorBox('משהו השתבש בהצגת המסך. אפשר לחזור ולנסות שוב.', e);
    }
    scr.innerHTML = html;
    const tabsOn = !ui.view || (KG.V[name] && KG.V[name].tabs);
    document.body.classList.toggle('has-tabs', !!tabsOn);
    const tabs = $('#tabs');
    if (tabs) {
      tabs.hidden = !tabsOn;
      tabs.querySelectorAll('button[data-tab]').forEach((b) => b.setAttribute('aria-current', !ui.view && b.dataset.tab === ui.tab ? 'page' : 'false'));
    }
    if (!keepScroll) { scr.classList.remove('enter'); void scr.offsetWidth; scr.classList.add('enter'); }
    G.scrollTo(0, y);
    if (KG.afterRender) KG.afterRender(name);
  };
  KG.errorBox = (msg, e) => '<div class="empty"><span class="tile red">' + KG.icon('alert', 'lg') + '</span><b>' + KG.esc(msg) + '</b>' +
    (e ? '<span class="fine ltr">' + KG.esc(String(e && e.message || e).slice(0, 160)) + '</span>' : '') +
    '<button type="button" class="btn small secondary" data-action="go-home">' + KG.icon('home', 'sm') + 'למסך הבית</button></div>';

  KG.go = (view, params) => {
    if (ui.view) ui.history.push({ view: ui.view, params: ui.params });
    ui.view = view; ui.params = params || {};
    KG.closeSheet(true);
    KG.render();
  };
  KG.back = () => {
    const prev = ui.history.pop();
    if (prev) { ui.view = prev.view; ui.params = prev.params; } else { ui.view = null; ui.params = {}; }
    KG.render();
  };
  KG.setTab = (tab) => { ui.view = null; ui.params = {}; ui.history = []; ui.tab = TABS.includes(tab) ? tab : 'home'; KG.closeSheet(true); KG.render(); };

  // ---- Sheets ----
  KG.openSheet = (name, data) => {
    const def = KG.SHEETS[name];
    if (!def) return;
    ui.sheet = { name, data: data || {} };
    if (def.init) def.init(ui.sheet.data);
    renderSheet();
  };
  const renderSheet = (KG.renderSheet = () => {
    const root = $('#sheet-root');
    if (!root) return;
    const s = ui.sheet;
    if (!s) { root.innerHTML = ''; document.body.style.overflow = ''; return; }
    const def = KG.SHEETS[s.name];
    let body = '';
    try { body = def.render(s.data); } catch (e) { console.error('sheet', s.name, e); body = KG.errorBox('משהו השתבש', e); }
    const old = root.querySelector('.sheet');
    const st = old ? old.scrollTop : 0;
    const same = old && old.dataset.name === s.name;
    root.innerHTML = '<div class="scrim" data-action="' + (def.noClose ? '' : 'close-sheet') + '"></div>' +
      '<div class="sheet' + (def.full ? ' full' : '') + '" role="dialog" aria-modal="true" data-name="' + s.name + '"' + (same ? ' style="animation:none"' : '') + '>' +
      '<div class="grab"></div><div class="sheet-head"><h2>' + KG.esc(def.title(s.data)) + '</h2>' +
      (def.noClose ? '' : '<button type="button" class="round-btn" aria-label="סגירה" data-action="close-sheet">' + KG.icon('close', 'sm') + '</button>') +
      '</div><div class="sheet-body">' + body + '</div></div>';
    if (same) root.querySelector('.sheet').scrollTop = st;
    document.body.style.overflow = 'hidden';
  });
  KG.closeSheet = (silent) => {
    if (!ui.sheet) return;
    const def = KG.SHEETS[ui.sheet.name];
    if (def && def.onClose) def.onClose(ui.sheet.data);
    ui.sheet = null;
    renderSheet();
    if (!silent && KG.afterSheetClose) KG.afterSheetClose();
  };

  // ---- Toast and achievement pop ----
  let toastTimer = null;
  KG.toast = (msg, ms) => {
    const root = $('#toast-root');
    if (!root) return;
    root.innerHTML = '<div class="toast">' + KG.esc(msg) + '</div>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { root.innerHTML = ''; }, ms || 2600);
  };
  const achQueue = [];
  let achBusy = false;
  KG.celebrate = (list) => {
    (list || []).forEach((a) => achQueue.push(a));
    if (achBusy) return;
    const nextOne = () => {
      const a = achQueue.shift();
      if (!a) { achBusy = false; return; }
      achBusy = true;
      const el = document.createElement('div');
      el.className = 'ach-pop';
      el.innerHTML = '<div class="in"><span class="tile">' + KG.icon(a.icon || 'trophy') + '</span><div><b>הישג חדש: ' + KG.esc(a.title) + '</b><span>' + KG.esc(a.desc) + '</span></div></div>';
      document.body.appendChild(el);
      KG.sound.play('ach');
      KG.haptic('success');
      setTimeout(() => { el.remove(); nextOne(); }, 3300);
    };
    nextOne();
  };
  KG.confetti = () => {
    const box = document.createElement('div');
    box.className = 'confetti';
    const colors = ['#1FD17A', '#F6C453', '#4C8DFF', '#FF5A6E', '#9B7BFF', '#FFFFFF'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      c.style.animationDelay = Math.random() * 0.5 + 's';
      box.appendChild(c);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4200);
  };

  // ---- Sounds: made on the phone (no sound files), off in settings ----
  let actx = null;
  const tone = (f, t0, dur, type, vol) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, actx.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, actx.currentTime + t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t0 + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(actx.currentTime + t0); o.stop(actx.currentTime + t0 + dur + 0.05);
  };
  KG.sound = {
    play(kind) {
      if (!KG.P || !KG.P.settings.sound) return;
      try {
        actx = actx || new (G.AudioContext || G.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        if (kind === 'correct') { tone(660, 0, 0.12, 'triangle'); tone(990, 0.09, 0.22, 'triangle'); }
        else if (kind === 'wrong') { tone(220, 0, 0.22, 'sawtooth', 0.08); tone(165, 0.12, 0.3, 'sawtooth', 0.07); }
        else if (kind === 'tick') tone(880, 0, 0.05, 'square', 0.04);
        else if (kind === 'win') [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.26, 'triangle'));
        else if (kind === 'ach') [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.22, 'sine', 0.14));
        else if (kind === 'tap') tone(520, 0, 0.04, 'sine', 0.05);
      } catch (e) { /* no audio */ }
    }
  };

  // ---- Small shared pieces of HTML ----
  KG.sw = (action, on, label, extra) => '<button type="button" class="switch" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + KG.esc(label) + '" data-action="' + action + '"' + (extra || '') + '></button>';
  KG.seg = (action, items, cur, extra) => '<div class="seg" role="group">' + items.map((it) =>
    '<button type="button" data-action="' + action + '" data-v="' + KG.esc(it.v) + '"' + (extra || '') + ' aria-pressed="' + (String(it.v) === String(cur) ? 'true' : 'false') + '">' + (it.icon ? KG.icon(it.icon, 'sm') : '') + KG.esc(it.label) + '</button>').join('') + '</div>';
  KG.row = (action, ic, color, title, sub, extra, right) => '<button type="button" class="row" data-action="' + action + '"' + (extra || '') + '><span class="tile ' + (color || '') + '">' + KG.icon(ic) + '</span>' +
    '<span class="grow"><span class="t">' + KG.esc(title) + '</span>' + (sub ? '<span class="s">' + KG.esc(sub) + '</span>' : '') + '</span>' + (right || '<span class="chev">' + KG.icon('chevL', 'sm') + '</span>') + '</button>';
  KG.diffTag = (d) => { const x = KG.schema.DIFFS[d] || KG.schema.DIFFS[1]; return '<span class="tag ' + x.color + '">' + KG.esc(x.name) + '</span>'; };
  KG.backBar = (title, sub, right) => '<div class="top"><button type="button" class="round-btn" aria-label="חזרה" data-action="back">' + KG.icon('back') + '</button>' +
    '<div class="titles">' + (sub ? '<span class="kicker">' + KG.esc(sub) + '</span>' : '') + '<h1 class="h1" style="font-size:22px">' + KG.esc(title) + '</h1></div>' + (right || '') + '</div>';

  // ---- Events ----
  function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const name = el.dataset.action;
    if (!name) return;
    const fn = KG.A[name];
    if (!fn) { console.warn('no action', name); return; }
    if (el.tagName === 'A' && el.getAttribute('href') && !el.dataset.force) return;
    e.preventDefault();
    if (el.getAttribute('aria-disabled') === 'true') return;
    try { const r = fn(el, e); if (r && r.catch) r.catch((err) => { console.error(name, err); KG.toast(err && err.user ? err.message : 'משהו השתבש. נסה שוב.'); }); }
    catch (err) { console.error(name, err); KG.toast('משהו השתבש. נסה שוב.'); }
  }
  KG.onInput = {};
  function onInput(e) {
    const el = e.target;
    const k = el.dataset && (el.dataset.bind || el.dataset.f);
    if (!k) return;
    const h = KG.onInput[el.dataset.scope || 'form'];
    if (h) h(el, e);
  }
  KG.bindEvents = () => {
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    KG.listen('App', 'backButton', () => KG.hardwareBack());
    G.addEventListener('popstate', () => { /* web: stay in the app */ });
  };
  KG.hardwareBack = () => {
    if (ui.sheet) { const def = KG.SHEETS[ui.sheet.name]; if (!def || !def.noClose) KG.closeSheet(); return; }
    if (ui.view === 'quiz') { KG.A['quiz-exit'](); return; }
    if (ui.view) { KG.back(); return; }
    if (ui.tab !== 'home') { KG.setTab('home'); return; }
    KG.call('App', 'minimizeApp');
  };

  KG.A['tab'] = (el) => { KG.sound.play('tap'); KG.setTab(el.dataset.tab); };
  KG.A['go'] = (el) => KG.go(el.dataset.view, Object.assign({}, el.dataset));
  KG.A['back'] = () => KG.back();
  KG.A['go-home'] = () => KG.setTab('home');
  KG.A['open-sheet'] = (el) => KG.openSheet(el.dataset.sheet, Object.assign({}, el.dataset));
  KG.A['close-sheet'] = () => KG.closeSheet();
})(typeof window !== 'undefined' ? window : globalThis);
