/* The app's name and brand in one place. Changing the name, the English name or the colors starts here
   (and in capacitor.config.json, manifest.webmanifest and tools/icon-svg.mjs for the icon). */
(function (G) {
  'use strict';
  const KG = (G.KG = G.KG || {});
  KG.BRAND = {
    name: 'כדורגלן',
    en: 'Kaduraglan',
    file: 'kaduraglan',
    maker: 'Itzko',
    // Colors used by code (status bar, theme-color); the full palette is in styles/tokens.css.
    dark: { bg: '#060A12', primary: '#1FD17A' },
    light: { bg: '#F2F5F9', primary: '#0E9F59' }
  };
  KG.REPO = 'luach-sport/kaduraglan';
  KG.APP_ID = 'com.luachsport.kaduraglan';
  KG.PAGES_URL = 'https://luach-sport.github.io/kaduraglan/';
  // Question packages: the website first, the repo as a backup source.
  KG.CONTENT_URLS = [
    'https://luach-sport.github.io/kaduraglan/content/',
    'https://raw.githubusercontent.com/luach-sport/kaduraglan/main/updates/'
  ];
  // Feedback goes to the developer's own Google Apps Script (shared by all of Itzko's apps), which e-mails
  // only the developer. No e-mail address ships in the app; the key just keeps generic bots out.
  KG.FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbwuxeoRQSIFoCfTrJqJ_QUeF1JANm0H4PY5Mc00Ns8hBm9K8lvJ2S5hBYQOVtA3lZX1lw/exec';
  KG.FEEDBACK_KEY = 'mc_9-ATPT_LPmYj188PGtCksaLh';
})(typeof window !== 'undefined' ? window : globalThis);
