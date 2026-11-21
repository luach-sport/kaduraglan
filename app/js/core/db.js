/* Local database (IndexedDB) for the question bank additions, pictures and content backups.
   KG.db.atomic(ops) writes several changes in ONE transaction: either all of them are saved or none,
   so a failed import never leaves a half-updated bank. Without IndexedDB (rare private modes, tests)
   a memory store with the same API is used. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const NAME = 'kaduraglan';
  const STORES = ['kv', 'images', 'backups'];

  function memoryDb() {
    const data = Object.fromEntries(STORES.map((s) => [s, new Map()]));
    const clone = (v) => (v instanceof Blob || v instanceof ArrayBuffer || ArrayBuffer.isView(v) ? v : v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
    return {
      mem: true,
      async get(s, k) { return clone(data[s].get(k)); },
      async put(s, k, v) { data[s].set(k, clone(v)); },
      async del(s, k) { data[s].delete(k); },
      async keys(s) { return [...data[s].keys()]; },
      async all(s) { return [...data[s].entries()].map(([k, v]) => [k, clone(v)]); },
      async atomic(ops) {
        // validate first, then apply all at once (same all-or-nothing behaviour as IndexedDB)
        for (const o of ops) if (!data[o.store]) throw new Error('unknown store ' + o.store);
        const snap = Object.fromEntries(STORES.map((s) => [s, new Map(data[s])]));
        try {
          for (const o of ops) {
            if (o.fail) throw new Error('forced failure');
            if (o.op === 'put') data[o.store].set(o.key, clone(o.val));
            else if (o.op === 'del') data[o.store].delete(o.key);
            else if (o.op === 'clear') data[o.store].clear();
          }
        } catch (e) {
          STORES.forEach((s) => { data[s] = snap[s]; });
          throw e;
        }
      }
    };
  }

  function idb() {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, 1);
      r.onupgradeneeded = () => { STORES.forEach((s) => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error('blocked'));
    }));
    const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const store = async (s, mode) => (await open()).transaction(s, mode).objectStore(s);
    return {
      mem: false,
      open,
      async get(s, k) { return req((await store(s, 'readonly')).get(k)); },
      async put(s, k, v) { const st = await store(s, 'readwrite'); await req(st.put(v, k)); },
      async del(s, k) { const st = await store(s, 'readwrite'); await req(st.delete(k)); },
      async keys(s) { return req((await store(s, 'readonly')).getAllKeys()); },
      async all(s) {
        const st = await store(s, 'readonly');
        const [ks, vs] = await Promise.all([req(st.getAllKeys()), req(st.getAll())]);
        return ks.map((k, i) => [k, vs[i]]);
      },
      async atomic(ops) {
        const db = await open();
        const names = [...new Set(ops.map((o) => o.store))];
        if (!names.length) return;
        await new Promise((res, rej) => {
          const tx = db.transaction(names, 'readwrite');
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error || new Error('transaction failed'));
          tx.onabort = () => rej(tx.error || new Error('transaction aborted'));
          try {
            for (const o of ops) {
              if (o.fail) throw new Error('forced failure');
              const st = tx.objectStore(o.store);
              if (o.op === 'put') st.put(o.val, o.key);
              else if (o.op === 'del') st.delete(o.key);
              else if (o.op === 'clear') st.clear();
            }
          } catch (e) { try { tx.abort(); } catch (e2) { /* already done */ } rej(e); }
        });
      }
    };
  }

  KG.db = typeof indexedDB !== 'undefined' ? idb() : memoryDb();
  KG.db.ready = (async () => {
    if (KG.db.mem) return KG.db;
    try { await KG.db.open(); } catch (e) {
      console.warn('IndexedDB unavailable, using memory', e && e.message);
      const ready = KG.db.ready;
      KG.db = memoryDb();
      KG.db.ready = ready;
      KG.dbFallback = true;
    }
    return KG.db;
  })();
  KG.memoryDb = memoryDb;
})(typeof window !== 'undefined' ? window : globalThis);
