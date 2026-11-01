/* Pictures: where each one comes from (shipped in www/data/images/ or saved in the local database),
   shrinking a picture before it's saved (so hundreds of pictures don't fill the phone), and the list of
   pictures still missing. Only pictures on the phone are used — never links to the internet. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const I = (KG.img = {});
  const urls = new Map();

  I.forget = () => { urls.forEach((u) => { if (u.startsWith('blob:')) try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ } }); urls.clear(); };

  // A URL for the picture, or null when it isn't on the phone (the screen then shows a neat placeholder).
  I.url = async (id) => {
    if (!id) return null;
    if (urls.has(id)) return urls.get(id);
    const m = KG.C.images.get(id);
    if (!m) return null;
    let u = null;
    if (m.file && !m.stored) u = 'data/images/' + m.file;
    else {
      try { const b = await KG.db.get('images', id); if (b) u = URL.createObjectURL(b); } catch (e) { u = null; }
    }
    if (u) urls.set(id, u);
    return u;
  };

  // Shrinks a picture: long side up to `max` pixels, WebP when the browser can make it (JPEG otherwise).
  // Crests and shirts keep a transparent background in WebP; in JPEG they get a white one.
  I.MAX = { crest: 480, 'shirt-home': 560, 'shirt-away': 560, player: 640, stadium: 960, trophy: 560, photo: 900 };
  I.compress = async (file, kind) => {
    const max = I.MAX[kind] || 800;
    const src = await new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => res({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('זו לא תמונה שאפשר לפתוח')); };
      img.src = url;
    });
    const { img } = src;
    const scale = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const toBlob = (type, q) => new Promise((res) => cv.toBlob((b) => res(b), type, q));
    ctx.drawImage(img, 0, 0, w, h);
    let blob = await toBlob('image/webp', 0.8);
    if (!blob || blob.type !== 'image/webp') {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      blob = await toBlob('image/jpeg', 0.82);
    }
    URL.revokeObjectURL(src.url);
    if (!blob) throw new Error('לא הצלחתי לכווץ את התמונה');
    return { blob, w, h, type: blob.type, size: blob.size, before: file.size || 0 };
  };

  // What's missing: a crest for every team, a photo for every player, a picture for every stadium.
  I.missing = () => {
    const C = KG.C, out = [];
    const has = new Set([...C.images.values()].map((m) => m.kind + ':' + m.for));
    const sortTier = (a, b) => (a.tier || 3) - (b.tier || 3) || a.he.localeCompare(b.he, 'he');
    [...C.ent.teams.values()].sort(sortTier).forEach((t) => { if (!has.has('crest:' + t.id)) out.push({ kind: 'crest', for: t.id, label: t.he, file: 'crest-' + t.id + '.webp' }); });
    [...C.ent.players.values()].sort(sortTier).forEach((p) => { if (!has.has('player:' + p.id)) out.push({ kind: 'player', for: p.id, label: p.he, file: 'player-' + p.id + '.webp' }); });
    [...C.ent.stadiums.values()].sort(sortTier).forEach((s) => { if (!has.has('stadium:' + s.id)) out.push({ kind: 'stadium', for: s.id, label: s.he, file: 'stadium-' + s.id + '.webp' }); });
    return out;
  };
  I.counts = () => {
    const c = { crest: 0, player: 0, stadium: 0, shirt: 0, other: 0 };
    for (const m of KG.C.images.values()) {
      if (m.kind === 'crest') c.crest++; else if (m.kind === 'player') c.player++; else if (m.kind === 'stadium') c.stadium++;
      else if (m.kind.startsWith('shirt')) c.shirt++; else c.other++;
    }
    return c;
  };
})(typeof window !== 'undefined' ? window : globalThis);
