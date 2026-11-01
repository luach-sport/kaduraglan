/* Small helpers used everywhere: text, numbers, dates, Hebrew search, seeded randomness. */
(function (G) {
  'use strict';
  const KG = (G.KG = G.KG || {});
  const VER = G.KADURAGLAN_VERSION || { version: '1.01', build: 'dev' };
  KG.VERSION = VER;

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  KG.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  KG.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  KG.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  KG.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  KG.isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
  KG.debounce = (fn, ms) => { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); }; };
  KG.isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  KG.copy = (o) => JSON.parse(JSON.stringify(o));

  const nf = {};
  KG.fmt = (n, d = 0) => {
    if (!isFinite(n)) return '–';
    if (!nf[d]) nf[d] = new Intl.NumberFormat('he-IL', { minimumFractionDigits: d, maximumFractionDigits: d });
    return nf[d].format(n);
  };
  KG.pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

  // ---- Dates: the local calendar day, as YYYY-MM-DD ----
  const p2 = (n) => String(n).padStart(2, '0');
  KG.dateKey = (d) => { d = d ? new Date(d) : new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  KG.keyToTime = (k) => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1).getTime(); };
  KG.dayDiff = (a, b) => Math.round((KG.keyToTime(b) - KG.keyToTime(a)) / 864e5);
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  KG.MONTHS = MONTHS;
  KG.dateFull = (ts) => { const d = new Date(ts); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); };
  KG.dateLong = (ts) => { const d = new Date(ts); return d.getDate() + ' ב' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
  KG.time = (ts) => { const d = new Date(ts); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  KG.todayTitle = () => { const d = new Date(); return 'יום ' + DAYS[d.getDay()] + ', ' + d.getDate() + ' ב' + MONTHS[d.getMonth()]; };
  KG.greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'לילה טוב';
    if (h < 12) return 'בוקר טוב';
    if (h < 17) return 'צהריים טובים';
    if (h < 21) return 'ערב טוב';
    return 'לילה טוב';
  };

  // ---- Hebrew-aware search: no nikud or punctuation, final letters folded, doubled yod/vav folded ----
  const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  KG.norm = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[^a-z0-9א-ת]/g, '')
    .replace(/יי+/g, 'י')
    .replace(/וו+/g, 'ו');

  // ---- Seeded randomness (the same seed gives the same order on every phone) ----
  KG.hash = (str) => {
    let h = 2166136261 >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  };
  KG.rng = (seed) => {
    let a = (typeof seed === 'number' ? seed : KG.hash(seed)) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  KG.shuffle = (arr, rand) => {
    const a = arr.slice(), r = rand || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
})(typeof window !== 'undefined' ? window : globalThis);
