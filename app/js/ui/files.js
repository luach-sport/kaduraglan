/* Picking a file from the phone and saving / sharing a file the app made (backups, packages, the APK). */
(function (G) {
  'use strict';
  const KG = G.KG;

  // Opens the phone's file chooser. Any file type is allowed (some phones hide ZIP files when filtered);
  // the app checks the content itself.
  KG.pickFile = (accept) => new Promise((res) => {
    const inp = document.getElementById('file-in');
    inp.value = '';
    inp.setAttribute('accept', accept || '');
    const done = () => { inp.removeEventListener('change', done); res(inp.files && inp.files[0] ? inp.files[0] : null); };
    inp.addEventListener('change', done);
    inp.click();
  });

  const toB64 = (data) => {
    if (typeof data === 'string') return btoa(unescape(encodeURIComponent(data)));
    return KG.pkg.u8ToB64(data instanceof Uint8Array ? data : new Uint8Array(data));
  };

  // Android: written to the app's cache and handed to the share menu (Drive, WhatsApp, file manager…).
  // iPhone and browsers: the share menu when possible, otherwise a download.
  KG.saveFile = async (name, data, mime, title) => {
    if (KG.isNative()) {
      const w = await KG.call('Filesystem', 'writeFile', { path: 'out/' + name, data: toB64(data), directory: 'CACHE', recursive: true });
      if (w && w.uri) {
        try { await KG.callRaw('Share', 'share', { title, files: [w.uri], dialogTitle: title }); return 'shared'; } catch (e) { return 'cancelled'; }
      }
      KG.toast('לא הצלחתי לשמור את הקובץ');
      return 'failed';
    }
    const blob = new Blob([data], { type: mime || 'application/octet-stream' });
    const file = new File([blob], name, { type: blob.type });
    if (KG.webShare) return KG.webShare({ files: [file], title });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'saved';
  };
})(typeof window !== 'undefined' ? window : globalThis);
