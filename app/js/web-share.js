/* Sharing files from the web version and on iPhone (backups, packages): the phone's share menu when
   possible, otherwise a download. iPhone opens the share menu only right after a tap, so when getting
   a file ready took a moment, a small window asks for one more tap. */
(function (G) {
  'use strict';
  const KG = G.KG;
  let pending = null;
  const download = (files) => (files || []).forEach((f, i) => setTimeout(() => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, i * 500));
  const canShare = (files) => { try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files })); } catch (e) { return false; } };

  KG.webShare = async (d) => {
    if (canShare(d.files)) {
      try { await navigator.share({ files: d.files, title: d.title }); return 'shared'; } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        if (e && e.name === 'NotAllowedError') { pending = d; KG.openSheet('shareReady'); return 'asked'; }
      }
    }
    download(d.files);
    return 'saved';
  };
  KG.SHEETS.shareReady = {
    title: () => (pending && pending.title) || 'מוכן לשיתוף',
    render: () => '<div class="notice">' + KG.icon('check', 'sm') + '<span class="grow">הקובץ מוכן. לוחצים "שיתוף" ובוחרים איפה לשמור או לאן לשלוח.</span></div>' +
      '<button type="button" class="btn" data-action="share-ready">' + KG.icon('share') + 'שיתוף</button>' +
      '<button type="button" class="btn secondary" data-action="share-ready-save">' + KG.icon('download') + 'הורדה</button>'
  };
  KG.A['share-ready'] = () => { const d = pending; pending = null; KG.closeSheet(); if (d) navigator.share({ files: d.files, title: d.title }).catch((e) => { if (!e || e.name !== 'AbortError') download(d.files); }); };
  KG.A['share-ready-save'] = () => { const d = pending; pending = null; KG.closeSheet(); if (d) download(d.files); };
})(typeof window !== 'undefined' ? window : globalThis);
