/* Installing כדורגלן on iPhone: when opened in Safari (not yet from the home screen), a short guide explains
   how to add it to the home screen; later a small notice on the home screen can open it again. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const HINT_KEY = 'kg.iosHint';
  const show = () => KG.isIOS() && !KG.isStandalone();
  const hintClosed = () => { try { return localStorage.getItem(HINT_KEY) === 'off'; } catch (e) { return false; } };
  const svg = (d) => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const ICON_SHARE = svg('<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M8 10H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2"/>');
  const ICON_ADD = svg('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>');

  KG.firstIosSheet = () => show() && !hintClosed();
  KG.installNotice = () => {
    if (!show() || hintClosed()) return '';
    return '<div class="notice blue">' + ICON_ADD.replace('class="i"', 'class="i sm"') + '<span class="grow">באייפון? מוסיפים את ' + KG.BRAND.name + ' למסך הבית והוא עובד כמו אפליקציה, גם בלי אינטרנט.</span>' +
      '<button type="button" class="chip sm" data-action="open-sheet" data-sheet="installIos">איך?</button>' +
      '<button type="button" class="chip sm" aria-label="סגירת ההודעה" data-action="ios-hint-off">' + KG.icon('close', 'sm') + '</button></div>';
  };
  const step = (n, ic, cls, title, sub) => '<div class="row"><span class="tile ' + cls + '">' + ic + '</span><span class="grow"><span class="t">' + n + '. ' + title + '</span><span class="s">' + sub + '</span></span></div>';
  KG.SHEETS.installIos = {
    full: true,
    title: () => 'התקנה באייפון',
    render: () => '<div class="about-head"><img src="logo.svg" alt=""><h2>' + KG.BRAND.name + '</h2></div>' +
      '<p style="margin:0;font-size:15px">כדי ש' + KG.BRAND.name + ' ייפתח כמו אפליקציה, מסמל במסך הבית, ויעבוד גם בלי אינטרנט, מוסיפים אותו למסך הבית:</p>' +
      '<div class="card tight">' +
      step(1, ICON_SHARE, 'blue', 'לוחצים על כפתור השיתוף', 'ריבוע עם חץ למעלה, בתחתית המסך. באייפון עם גרסה חדשה הוא בתפריט <span class="ltr">•••</span> שליד שורת הכתובת.') +
      step(2, ICON_ADD, 'orange', 'בוחרים "הוספה למסך הבית"', 'גוללים קצת למטה ברשימה (באנגלית: <bdi dir="ltr">Add to Home Screen</bdi>).') +
      step(3, KG.icon('check'), 'green', 'לוחצים "הוספה"', 'אם יש מתג של פתיחה כאפליקציה, משאירים אותו דלוק.') + '</div>' +
      '<div class="notice orange">' + KG.icon('info', 'sm') + '<span class="grow">ההתקדמות בספארי ובאפליקציה שבמסך הבית נשמרת בנפרד, לכן כדאי להוסיף עכשיו ולשחק משם.</span></div>' +
      '<button type="button" class="btn" data-action="close-sheet">' + KG.icon('check') + 'הבנתי</button>'
  };
  KG.A['ios-hint-off'] = () => { try { localStorage.setItem(HINT_KEY, 'off'); } catch (e) { /* ignore */ } KG.render(true); };
})(typeof window !== 'undefined' ? window : globalThis);
