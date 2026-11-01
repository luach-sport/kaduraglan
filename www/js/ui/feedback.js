/* "פנייה / הצעת ייעול" (reaches the developer's e-mail; waits for internet when there is none) and "אודות". */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon } = KG;
  const ui = KG.ui;
  let flushing = false;
  const ERR = { 'rate-limit': 'יותר מדי פניות כרגע, ננסה שוב מאוחר יותר', invalid: 'חסר שם, מייל או תוכן', 'bad-key': 'השרת דחה את הפנייה', server: 'תקלה זמנית בשרת' };

  KG.queueFeedback = (type, message) => {
    const p = KG.P.profile;
    KG.P.outbox.push({ id: KG.uid(), ts: Date.now(), type, name: p.name, email: p.email, message, status: 'pending' });
    KG.P.outbox = KG.P.outbox.slice(-30);
    KG.saveProgress();
    if (KG.online()) KG.flushOutbox();
  };

  KG.flushOutbox = async () => {
    if (flushing || !KG.online() || !KG.FEEDBACK_URL) return 0;
    const pending = KG.P.outbox.filter((m) => m.status !== 'sent');
    if (!pending.length) return 0;
    flushing = true;
    let sent = 0;
    try {
      for (const m of pending) {
        // The shared script names the app in the e-mail; the message also starts with the app's name.
        const body = {
          key: KG.FEEDBACK_KEY, app: KG.BRAND.file, name: m.name, email: m.email, type: m.type,
          message: '[' + KG.BRAND.name + '] ' + m.message,
          when: KG.dateFull(m.ts) + ' ' + KG.time(m.ts),
          version: KG.BRAND.name + ' ' + KG.VERSION.version + ' (בנייה ' + KG.VERSION.build + ')',
          device: KG.deviceName ? KG.deviceName() : KG.isNative() ? 'אנדרואיד' : 'דפדפן'
        };
        m.tries = (m.tries || 0) + 1;
        try {
          const r = await KG.http(KG.FEEDBACK_URL, { method: 'POST', data: body, plain: true, timeout: 30000 });
          let d = r.data;
          if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = {}; } }
          d = d && typeof d === 'object' ? d : {};
          if ((r.ok && d.ok === true) || r.status === 302 || r.status === 303) { m.status = 'sent'; m.sentAt = Date.now(); delete m.error; sent++; }
          else { m.status = 'failed'; m.error = ERR[d.error] || 'השרת לא קיבל אותה'; if (d.error === 'rate-limit') break; }
        } catch (e) { m.status = 'failed'; m.error = 'אין תשובה מהשרת'; break; }
      }
    } finally {
      flushing = false;
      KG.saveProgress();
      if (ui.sheet && ui.sheet.name === 'feedback') KG.renderSheet();
    }
    return sent;
  };

  KG.SHEETS.feedback = {
    full: true,
    title: () => 'פנייה / הצעת ייעול',
    init: (d) => { const p = KG.P.profile; Object.assign(d, { type: 'idea', name: p.name, email: p.email, message: '', err: {} }); },
    render: (d) => {
      const e = d.err || {};
      const box = KG.P.outbox.slice().reverse();
      let h = '<p class="fine" style="font-size:14px">יש רעיון לשאלה, לקטגוריה או למצב משחק? משהו לא עובד? כתבו כאן, והפנייה תגיע ישירות למפתח.</p>' +
        KG.seg('fb-type', [{ v: 'idea', label: 'הצעת ייעול' }, { v: 'bug', label: 'תקלה' }, { v: 'other', label: 'אחר' }], d.type) +
        '<div class="field"><label for="fbn">שם מלא *</label><input id="fbn" class="input" autocomplete="name" data-scope="fb" data-bind="name" value="' + esc(d.name) + '">' + (e.name ? '<span class="hint bad">' + e.name + '</span>' : '') + '</div>' +
        '<div class="field"><label for="fbe">אימייל *</label><input id="fbe" class="input ltr" style="text-align:left" type="email" inputmode="email" autocomplete="email" data-scope="fb" data-bind="email" value="' + esc(d.email) + '">' + (e.email ? '<span class="hint bad">' + e.email + '</span>' : '<span class="hint">כדי שנוכל לחזור אליך</span>') + '</div>' +
        '<div class="field"><label for="fbm">מה תרצו להגיד? *</label><textarea id="fbm" class="input" data-scope="fb" data-bind="message" placeholder="למשל: הייתי רוצה קטגוריה על הליגה הפורטוגלית">' + esc(d.message) + '</textarea>' + (e.message ? '<span class="hint bad">' + e.message + '</span>' : '') + '</div>' +
        '<button type="button" class="btn" data-action="fb-send"' + (flushing ? ' aria-disabled="true"' : '') + '>' + icon('message') + (flushing ? 'שולח…' : 'שליחת הפנייה') + '</button>' +
        (KG.online() ? '' : '<p class="fine center">אין חיבור כרגע. הפנייה תישמר ותישלח לבד כשיחזור האינטרנט.</p>');
      if (box.length) {
        h += '<span class="section-label">הפניות שלי</span><div class="card">';
        box.slice(0, 6).forEach((m) => {
          const st = m.status === 'sent' ? { c: 'green', i: 'check', t: 'נשלחה' } : m.status === 'failed' ? { c: 'orange', i: 'alert', t: 'עוד לא נשלחה' + (m.error ? ': ' + m.error : '') } : { c: 'orange', i: 'clock', t: KG.online() ? 'בשליחה…' : 'תישלח כשיחזור האינטרנט' };
          h += '<div class="list-item"><span class="tile ' + st.c + '">' + icon(st.i, 'sm') + '</span><span class="grow"><span class="t">' + esc(String(m.message).slice(0, 60)) + '</span><span class="s">' + esc(KG.dateFull(m.ts) + ' · ' + st.t) + '</span></span></div>';
        });
        h += '</div>';
        if (box.some((m) => m.status !== 'sent') && KG.online() && !flushing) h += '<button type="button" class="btn secondary" data-action="fb-retry">' + icon('refresh') + 'לנסות לשלוח שוב</button>';
      }
      return h;
    }
  };
  KG.onInput.fb = (el) => { ui.sheet.data[el.dataset.bind] = el.value; };
  KG.A['fb-type'] = (el) => { ui.sheet.data.type = el.dataset.v; KG.renderSheet(); };
  KG.A['fb-retry'] = async () => { const n = await KG.flushOutbox(); KG.toast(n ? 'נשלח. תודה!' : 'עדיין לא הצלחתי לשלוח. ננסה שוב לבד.'); };
  KG.A['fb-send'] = async () => {
    const d = ui.sheet.data, err = {};
    if (String(d.name || '').trim().length < 2) err.name = 'צריך לכתוב שם';
    if (!KG.isEmail(d.email)) err.email = 'צריך אימייל תקין';
    if (String(d.message || '').trim().length < 5) err.message = 'כתבו לפחות כמה מילים';
    d.err = err;
    if (Object.keys(err).length) { KG.renderSheet(); return; }
    KG.P.profile = { name: d.name.trim(), email: d.email.trim() };
    KG.P.outbox.push({ id: KG.uid(), ts: Date.now(), type: d.type, name: d.name.trim(), email: d.email.trim(), message: d.message.trim(), status: 'pending' });
    KG.saveProgress();
    d.message = '';
    KG.renderSheet();
    if (KG.online()) { KG.toast('שולח…', 8000); const n = await KG.flushOutbox(); KG.toast(n ? 'תודה! הפנייה נשלחה' : 'לא הצלחתי לשלוח כרגע. ננסה שוב לבד.'); }
    else KG.toast('נשמר. הפנייה תישלח כשיחזור האינטרנט');
  };

  KG.SHEETS.about = {
    title: () => 'אודות',
    render: () => {
      const m = KG.C.meta;
      return '<div class="about-head"><img src="logo.svg" alt=""><h2>' + esc(KG.BRAND.name) + '</h2><span class="ver ltr">' + esc(KG.BRAND.en) + '</span><span class="ver">גרסה ' + esc(KG.VERSION.version) + (KG.VERSION.build !== 'dev' ? ' (בנייה ' + esc(KG.VERSION.build) + ')' : '') + ' · מאגר ' + m.contentVersion + '</span></div>' +
        '<p class="credit" style="font-size:15px">Developed by <b>' + esc(KG.BRAND.maker) + '</b></p>' +
        '<div class="card tight">' +
        '<div class="row"><span class="tile green">' + icon('ball') + '</span><span class="grow"><span class="t">' + KG.fmt(m.questions) + ' שאלות אמיתיות</span><span class="s">כל שאלה נבדקה מול מקור, עם תאריך בדיקה</span></span></div>' +
        '<div class="row"><span class="tile blue">' + icon('offline') + '</span><span class="grow"><span class="t">עובד בלי אינטרנט</span><span class="s">השאלות, ההתקדמות והתמונות שמורים בטלפון</span></span></div>' +
        '<div class="row"><span class="tile gold">' + icon('refresh') + '</span><span class="grow"><span class="t">שאלות חדשות בלי להתקין מחדש</span><span class="s">עדכונים לא מוחקים שום דבר קיים</span></span></div></div>' +
        '<p class="fine">בלי פרסומות, בלי הרשמה ובלי איסוף מידע. העובדות במאגר נבדקו מול מקורות (ויקיפדיה, אתרי ההתאחדויות, UEFA ו-FIFA ועוד), ולכל שאלה רשומים המקור ותאריך הבדיקה. נתון עכשווי (כמו מספר חולצה) מסומן עם התאריך שבו הוא נכון. מצאתם טעות? יש כפתור דיווח בכל שאלה. שמות קבוצות ותחרויות מוזכרים לצורך זיהוי בלבד.</p>' +
        '<button type="button" class="btn secondary" data-action="share-app">' + icon('share') + 'שיתוף האפליקציה עם חברים</button>' +
        '<button type="button" class="btn secondary" data-action="open-sheet" data-sheet="feedback">' + icon('message') + 'פנייה / הצעת ייעול</button>';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
