/* Bridge to Android (Capacitor plugins) with browser fallbacks, HTTP and network status. */
(function (G) {
  'use strict';
  const KG = G.KG;

  KG.capacitor = () => { const rt = G.KGCap; return (rt && rt.Capacitor) || G.Capacitor || null; };
  KG.isNative = () => {
    const C = KG.capacitor();
    if (!C) return false;
    try { return typeof C.isNativePlatform === 'function' ? !!C.isNativePlatform() : C.platform === 'android'; } catch (e) { return false; }
  };
  const cache = {};
  KG.plugin = (name) => {
    if (!KG.isNative()) return null;
    if (Object.prototype.hasOwnProperty.call(cache, name)) return cache[name];
    let p = null;
    try {
      const rt = G.KGCap;
      if (rt && typeof rt.registerPlugin === 'function') p = rt.registerPlugin(name);
      else if (G.Capacitor && G.Capacitor.Plugins) p = G.Capacitor.Plugins[name] || null;
    } catch (e) { p = null; }
    cache[name] = p;
    return p;
  };
  KG.callRaw = async (name, method, args) => {
    const p = KG.plugin(name);
    if (!p || typeof p[method] !== 'function') throw new Error('no-plugin ' + name + '.' + method);
    return p[method](args);
  };
  KG.call = async (name, method, args) => {
    try { return await KG.callRaw(name, method, args); } catch (e) { console.warn('[native]', name, method, e && (e.message || e)); return undefined; }
  };
  KG.listen = async (name, event, cb) => {
    const p = KG.plugin(name);
    if (!p) return null;
    try { return await p.addListener(event, cb); } catch (e) { console.warn('[native] listen', name, event, e && e.message); return null; }
  };

  // HTTP: native requests on Android (no CORS), fetch elsewhere. opts.binary returns an ArrayBuffer.
  KG.http = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const headers = Object.assign({ Accept: opts.binary ? '*/*' : 'application/json' }, opts.headers || {});
    const timeout = opts.timeout || 15000;
    const rt = G.KGCap;
    if (KG.isNative() && rt && rt.CapacitorHttp && !opts.binary) {
      if (opts.data != null) headers['Content-Type'] = 'application/json';
      const req = rt.CapacitorHttp.request({ url, method, headers, data: opts.data, connectTimeout: timeout, readTimeout: timeout, responseType: opts.text ? 'text' : 'json' });
      const res = await Promise.race([req, KG.sleep(timeout + 2000).then(() => { throw new Error('timeout'); })]);
      let data = res.data;
      if (typeof data === 'string' && !opts.text) { try { data = JSON.parse(data); } catch (e) { /* keep text */ } }
      return { status: res.status, ok: res.status >= 200 && res.status < 300, data };
    }
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), timeout);
    try {
      const init = { method, headers, signal: ctl ? ctl.signal : undefined, cache: 'no-store' };
      if (opts.data != null) { init.body = JSON.stringify(opts.data); headers['Content-Type'] = opts.plain ? 'text/plain;charset=utf-8' : 'application/json'; }
      const res = await fetch(url, init);
      if (opts.binary) return { status: res.status, ok: res.ok, data: res.ok ? await res.arrayBuffer() : null };
      const txt = await res.text();
      let data = txt;
      if (!opts.text) { try { data = JSON.parse(txt); } catch (e) { /* text */ } }
      return { status: res.status, ok: res.ok, data };
    } finally { clearTimeout(t); }
  };

  // ---- Network ----
  let online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  const netListeners = [];
  KG.online = () => online;
  KG.onNetwork = (cb) => netListeners.push(cb);
  function setOnline(v) {
    v = !!v;
    if (v === online) return;
    online = v;
    netListeners.forEach((cb) => { try { cb(v); } catch (e) { console.warn(e); } });
  }
  KG.initNetwork = async () => {
    G.addEventListener('online', () => setOnline(true));
    G.addEventListener('offline', () => setOnline(false));
    if (KG.isNative()) {
      const st = await KG.call('Network', 'getStatus');
      if (st && typeof st.connected === 'boolean') online = st.connected;
      KG.listen('Network', 'networkStatusChange', (s) => setOnline(s && s.connected));
    }
  };

  // ---- Small device extras ----
  KG.haptic = (kind) => {
    if (!KG.P || !KG.P.settings || !KG.P.settings.vibrate) return;
    if (KG.isNative()) {
      if (kind === 'error') KG.call('Haptics', 'notification', { type: 'ERROR' });
      else if (kind === 'success') KG.call('Haptics', 'notification', { type: 'SUCCESS' });
      else KG.call('Haptics', 'impact', { style: kind === 'heavy' ? 'HEAVY' : 'LIGHT' });
      return;
    }
    try { if (navigator.vibrate) navigator.vibrate(kind === 'error' ? [40, 40, 60] : kind === 'success' ? 30 : 12); } catch (e) { /* not supported */ }
  };
  KG.setStatusBar = (dark) => {
    if (!KG.isNative()) return;
    const c = dark ? KG.BRAND.dark.bg : KG.BRAND.light.bg;
    KG.call('StatusBar', 'setBackgroundColor', { color: c });
    KG.call('StatusBar', 'setStyle', { style: dark ? 'DARK' : 'LIGHT' });
  };
})(typeof window !== 'undefined' ? window : globalThis);
