/* The question screen (every question type), the timer, pictures with their effects, the answer and
   explanation, "report a mistake", passing the phone in head to head, and the results screen. */
(function (G) {
  'use strict';
  const KG = G.KG;
  const { esc, icon, fmt } = KG;
  const GM = KG.game;
  const ui = KG.ui;
  let timer = null;
  let lastResult = null;
  ui.order = [];

  const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
  KG.Q_LETTERS = ['א', 'ב', 'ג', 'ד'];

  // Question types: each one draws its answers. A new type = a new entry here (and in KG.schema.TYPES).
  const QT = (KG.qtypes = {});
  const fb = () => (GM.cur && GM.cur.phase !== 'question' ? GM.cur.answers[GM.cur.answers.length - 1] : null);
  QT.mc = (q) => {
    const a = fb();
    const opts = GM.options(q);
    const gone = GM.removed(q);   // taken away by the 50:50 hint
    return '<div class="opts' + (a ? ' locked' : '') + '">' + opts.map((o, i) => {
      let cls = '';
      if (a) cls = KG.norm(o) === KG.norm(q.a) ? ' ok' : a.choice === o ? ' no' : ' dim';
      if (gone.includes(o) && cls !== ' ok') cls += ' gone';
      return '<button type="button" class="opt' + cls + '" data-action="ans" data-i="' + i + '"' + (gone.includes(o) ? ' aria-disabled="true" tabindex="-1"' : '') + '><span class="k">' + KG.Q_LETTERS[i] + '</span><span class="grow">' + esc(o) + '</span>' +
        (a && cls === ' ok' ? icon('check', 'sm') : a && cls === ' no' ? icon('close', 'sm') : '') + '</button>';
    }).join('') + '</div>';
  };
  QT.img = QT.mc;
  QT.whoami = QT.mc;
  QT.tf = (q) => {
    const a = fb();
    const b = (v, label, ic) => {
      let cls = '';
      if (a) cls = v === q.a ? ' ok' : a.choice === v ? ' no' : ' dim';
      return '<button type="button" class="opt' + cls + '" data-action="ans-tf" data-v="' + v + '">' + icon(ic) + esc(label) + '</button>';
    };
    return '<div class="tf opts' + (a ? ' locked' : '') + '">' + b(true, 'נכון', 'check') + b(false, 'לא נכון', 'close') + '</div>';
  };
  QT.order = (q) => {
    const a = fb();
    if (a) {
      const mine = Array.isArray(a.choice) ? a.choice : [];
      return '<div class="order-list">' + q.items.map((it, i) => '<div class="order-item ' + (mine[i] === it.t ? 'ok' : 'no') + '"><span class="n">' + (i + 1) + '</span><span class="grow">' + esc(it.t) + '</span><span class="yr num">' + esc(it.y || it.k) + '</span></div>').join('') + '</div>';
    }
    const items = GM.orderItems(q);
    const first = q.items[0].t;
    if (GM.hintUsed(q) && ui.order[0] !== first) ui.order = [first].concat(ui.order.filter((t) => t !== first));   // the hint placed the earliest one
    return '<p class="fine">לוחצים על הפריטים לפי הסדר, מהמוקדם למאוחר. לחיצה על פריט שנבחר מבטלת אותו.</p><div class="order-list">' + items.map((t) => {
      const k = ui.order.indexOf(t);
      return '<button type="button" class="order-item' + (k >= 0 ? ' picked' : '') + (GM.hintUsed(q) && t === first ? ' fixed' : '') + '" data-action="order-pick" data-t="' + esc(t) + '"><span class="n">' + (k >= 0 ? k + 1 : '') + '</span><span class="grow">' + esc(t) + '</span></button>';
    }).join('') + '</div>' + '<button type="button" class="btn" data-action="order-check"' + (ui.order.length === items.length ? '' : ' aria-disabled="true"') + '>' + icon('check') + 'בדיקה</button>';
  };

  function picFx(q) {
    const s = GM.cur;
    if (s.fx && q.sub === 'crest') return s.fx;
    if (q.sub === 'crest') return q.diff >= 5 ? 'zoom' : q.diff >= 4 ? 'gray' : q.diff >= 3 ? 'quarter' : 'half';
    return q.fx || 'none';
  }
  function picture(q) {
    if (!q.img) return '';
    const s = GM.cur;
    const fx = picFx(q);
    const blur = Math.max(0, 18 - (s.hints[q.id] || 0) * 7);
    const done = s.phase !== 'question';
    let tiles = '';
    if (fx === 'reveal' && !done) {
      const order = KG.shuffle([...Array(12).keys()], KG.rng(s.id + q.id));
      tiles = '<div class="tiles">' + order.map((k) => '<i style="animation-delay:' + (1 + k * 1.1).toFixed(1) + 's"></i>').join('') + '</div>';
    }
    const zoomAt = KG.rng(q.id)();
    return '<div class="pic ' + (q.sub === 'crest' ? 'crest ' : '') + 'fx-' + fx + (done ? ' reveal' : '') + '" style="--blur:' + blur + 'px">' +
      '<img data-img="' + esc(q.img) + '" alt="" style="' + (fx === 'zoom' ? 'transform-origin:' + Math.round(25 + zoomAt * 50) + '% ' + Math.round(25 + (1 - zoomAt) * 50) + '%' : '') + '">' + tiles + '</div>';
  }
  async function loadPics() {
    for (const img of document.querySelectorAll('img[data-img]')) {
      const u = await KG.img.url(img.dataset.img);
      if (u) img.src = u;
      else img.parentElement.innerHTML = '<div class="missing">' + icon('image') + 'התמונה לא נמצאת בטלפון</div>';
    }
  }

  function timerHtml(s) {
    const r = 19, c = 2 * Math.PI * r;
    return '<div class="timer" id="timer" aria-label="זמן"><svg viewBox="0 0 46 46"><circle class="bg" cx="23" cy="23" r="' + r + '"/><circle class="fg" id="timer-fg" cx="23" cy="23" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="0"/></svg><b id="timer-n">' + s.seconds + '</b></div>';
  }
  function startTimer() {
    stopTimer();
    const s = GM.cur;
    if (!s || !s.timed || s.phase !== 'question') return;
    const c = 2 * Math.PI * 19;
    let lastSec = -1;
    const tick = () => {
      const left = s.seconds * 1000 - (Date.now() - s.qStart);
      const fg = document.getElementById('timer-fg'), n = document.getElementById('timer-n'), box = document.getElementById('timer');
      if (!fg || GM.cur !== s || s.phase !== 'question') { stopTimer(); return; }
      const sec = Math.max(0, Math.ceil(left / 1000));
      fg.style.strokeDashoffset = (c * (1 - Math.max(0, left) / (s.seconds * 1000))).toFixed(1);
      n.textContent = sec;
      box.classList.toggle('warn', sec <= 5);
      if (sec !== lastSec && sec <= 5 && sec > 0) KG.sound.play('tick');
      lastSec = sec;
      if (left <= 0) { stopTimer(); answer(null); }
    };
    tick();
    timer = setInterval(tick, 250);
  }

  KG.V.quiz = () => {
    const s = GM.cur;
    stopTimer();
    if (!s) return KG.errorBox('אין משחק פעיל');
    if (s.phase === 'done') return KG.V.result();
    if (s.phase === 'handoff') return handoff(s);
    const q = GM.q();
    if (!q) return KG.errorBox('השאלה לא נמצאה');
    const cat = KG.schema.CAT[q.cat] || {};
    const total = s.ids.length;
    let h = '<div class="qbar"><button type="button" class="round-btn" aria-label="יציאה מהמשחק" data-action="quiz-exit">' + icon('close') + '</button><div class="mid">' +
      '<div class="ttl"><span>' + esc(s.title) + '</span><span class="num">' + (s.mode === 'survival' ? 'שאלה ' + (s.i + 1) : (s.i + 1) + '/' + total) + '</span></div>';
    if (s.mode === 'survival') h += '<div class="lives" aria-label="חיים">' + [1, 2, 3].map((k) => icon('heart', k <= s.lives ? '' : 'off')).join('') + '<span class="kicker" style="margin-inline-start:8px">ניקוד: <b class="num">' + fmt(s.score) + '</b></span></div>';
    else if (total <= 24) h += '<div class="dots">' + s.ids.map((id, i) => { const a = s.answers[i]; return '<i class="' + (a ? (a.ok ? 'ok' : 'no') : i === s.i ? 'cur' : '') + '"></i>'; }).join('') + '</div>';
    h += '</div>' + (s.timed && s.phase === 'question' ? timerHtml(s) : '') + '</div>';
    if (s.players) {
      const cur = GM.player();
      h += '<div class="chips">' + s.players.map((p) => '<span class="chip sm"' + (p === cur ? ' aria-pressed="true"' : '') + '>' + esc(p.name) + ' · <b class="num">' + fmt(p.score) + '</b></span>').join('') + '</div>';
    }
    const possible = KG.CFG.BASE[q.diff];
    h += '<div class="qmeta"><span class="tag">' + icon(cat.icon || 'ball', 'sm') + esc(cat.name || '') + '</span>' + KG.diffTag(q.diff) +
      (s.mode === 'daily' && !s.reward ? '<span class="tag">בלי ניקוד</span>' : '') +
      '<span class="pts">' + icon('star', 'sm') + 'עד ' + fmt(Math.round(possible * (1 + (s.timed ? KG.CFG.SPEED_MAX : 0)))) + '</span></div>';
    h += picture(q);
    h += '<div class="qcard"><div class="qtype">' + icon(q.type === 'tf' ? 'check' : q.type === 'order' ? 'sort' : q.type === 'whoami' ? 'user' : q.type === 'img' ? 'image' : 'question', 'sm') + esc((KG.schema.TYPES[q.type] || {}).name || '') + '</div>' +
      '<p class="qtext">' + esc(q.q) + '</p>';
    if (q.type === 'whoami') {
      h += '<div class="clues">' + q.clues.map((c, i) => '<div class="clue"><span class="n">' + (i + 1) + '</span><span>' + esc(c) + '</span></div>').join('') + '</div>';
    }
    if (q.asOf) h += '<div class="asof">' + icon('clock', 'sm') + ' נכון ל' + esc(asOfLabel(q.asOf)) + '</div>';
    h += '</div>';

    const used = GM.hintUsed(q) ? 1 : 0;
    if (used && q.hints) h += '<div class="hintbox">' + q.hints.slice(0, 1).map((t) => '<div class="h">' + icon('hint', 'sm') + '<span>' + esc(t) + '</span></div>').join('') + '</div>';
    h += (QT[q.type] || QT.mc)(q);

    if (s.phase === 'question') {
      // One hint (50:50, the question is then worth half) and one skip in every game.
      const hl = GM.hintsLeft(), sl = GM.skipsLeft();
      const tool = (action, ic, label, sub, off) => '<button type="button" class="btn secondary tool" data-action="' + action + '"' + (off ? ' aria-disabled="true"' : '') + '>' +
        icon(ic, 'sm') + '<span class="tl"><b>' + label + '</b><span>' + sub + '</span></span></button>';
      let hint;
      if (used) hint = tool('hint', 'hint', 'רמז 50:50', 'בשימוש עכשיו', true);
      else if (hl <= 0) hint = tool('hint', 'hint', 'רמז 50:50', 'כבר נוצל', true);
      else if (!GM.hintFits(q)) hint = tool('hint', 'hint', 'רמז 50:50', 'אין רמז כאן', true);
      else hint = tool('hint', 'hint', 'רמז 50:50', q.type === 'order' ? 'מציב את הראשון · ½' : 'מוחק 2 · חצי ניקוד');
      const skip = sl > 0 ? tool('skip', 'skip', 'דילוג', 'בלי ניקוד') : tool('skip', 'skip', 'דילוג', 'כבר נוצל', true);
      h += '<div class="qtools">' + hint + skip + '</div>';
      h += '<p class="fine center">' + (s.players ? 'לכל שחקן: ' : 'בכל משחק: ') + 'רמז אחד ודילוג אחד</p>';
    } else {
      h += feedback(s, q);
    }
    return h;
  };
  KG.V.quiz.tabs = false;

  function asOfLabel(a) {
    const [y, m] = String(a).split('-').map(Number);
    return (m ? KG.MONTHS[m - 1] + ' ' : '') + y;
  }

  function feedback(s, q) {
    const a = s.answers[s.answers.length - 1];
    const ok = a.ok;
    const last = s.mode === 'survival' ? s.lives <= 0 : s.i + 1 >= s.ids.length;
    const verdict = ok ? ['נכון!', 'בול!', 'יפה מאוד!', 'גול!'][s.i % 4] : a.skip ? 'דילגת' : a.choice == null ? 'נגמר הזמן' : 'לא נכון';
    let ans = '';
    if (q.type === 'tf') ans = 'התשובה: <b>' + (q.a ? 'נכון' : 'לא נכון') + '</b>';
    else if (q.type !== 'order') ans = 'התשובה הנכונה: <b>' + esc(q.a) + '</b>';
    let h = '<div class="feedback ' + (ok ? 'ok' : 'no') + '"><div class="verdict">' + icon(ok ? 'check' : 'close') + esc(verdict) +
      (ok ? '<span class="gain num">+' + fmt(a.pts) + '</span>' : '') + '</div>';
    if (!ok && ans) h += '<div class="ans">' + ans + '</div>';
    if (q.explain) h += '<div class="exp">' + esc(q.explain) + '</div>';
    if (ok && s.mode !== 'h2h' && a.career < a.pts && s.reward !== false) h += '<div class="fine">כבר פתרת את השאלה הזו בעבר, ולכן נוספו לסך הכל ' + fmt(a.career) + ' נקודות.</div>';
    if (q.src) h += '<div class="src">מקור: ' + esc(q.src) + (q.ver ? ' · נבדק ' + esc(KG.dateFull(KG.keyToTime(q.ver))) : '') + '</div>';
    if (!q.generated) h += '<button type="button" class="report" data-action="report">' + icon('flag', 'sm') + 'יש כאן טעות? דווחו לנו</button>';
    h += '</div>';
    h += '<button type="button" class="btn" data-action="next">' + (last ? icon('trophy') + 'לתוצאות' : 'לשאלה הבאה' + icon('chevL')) + '</button>';
    return h;
  }

  function handoff(s) {
    const p = GM.player();
    const round = Math.floor(s.i / s.players.length) + 1, rounds = Math.ceil(s.ids.length / s.players.length);
    return '<div class="qbar"><button type="button" class="round-btn" aria-label="יציאה" data-action="quiz-exit">' + icon('close') + '</button><div class="mid"><div class="ttl"><span>ראש בראש</span><span>סיבוב ' + round + ' מתוך ' + rounds + '</span></div></div></div>' +
      '<div class="handoff"><span class="tile purple">' + icon('phone') + '</span><span class="kicker">מעבירים את הטלפון אל</span><div class="who">' + esc(p.name) + '</div>' +
      '<div class="chips" style="justify-content:center">' + s.players.map((x) => '<span class="chip sm">' + esc(x.name) + ' · <b class="num">' + fmt(x.score) + '</b></span>').join('') + '</div>' +
      '<button type="button" class="btn" style="max-width:320px" data-action="ready">' + icon('play') + 'אני מוכן' + (p.name ? ', ' + esc(p.name) : '') + '</button></div>';
  }

  KG.afterRender = (name) => {
    if (name === 'quiz') { loadPics(); startTimer(); }
    else stopTimer();
    if (name === 'library' || name === 'editor' || name === 'data') loadPics();
  };

  function answer(choice) {
    const r = GM.answer(choice);
    if (!r) return;
    ui.order = [];
    KG.sound.play(r.correct ? 'correct' : 'wrong');
    KG.haptic(r.correct ? 'success' : 'error');
    KG.render(true);
    if (r.unlocked && r.unlocked.length) KG.celebrate(r.unlocked);
  }
  KG.A['ans'] = (el) => { const q = GM.q(); if (!q) return; const o = GM.options(q)[+el.dataset.i]; answer(o); };
  KG.A['ans-tf'] = (el) => answer(el.dataset.v === 'true');
  KG.A['order-pick'] = (el) => {
    const t = el.dataset.t, k = ui.order.indexOf(t);
    if (k >= 0) ui.order = ui.order.slice(0, k); else ui.order.push(t);
    KG.sound.play('tap');
    KG.render(true);
  };
  KG.A['order-check'] = () => answer(ui.order.slice());
  KG.A['hint'] = () => { if (GM.useHint()) { KG.sound.play('tap'); KG.haptic('light'); KG.render(true); } };
  KG.A['skip'] = () => { const r = GM.skip(); if (r) { ui.order = []; KG.render(true); } };
  KG.A['ready'] = () => { GM.ready(); KG.render(); };
  KG.A['next'] = () => {
    const r = GM.next();
    if (!r) return;
    if (r.mode && r.total != null) {  // finished: a summary
      lastResult = r;
      KG.ui.view = 'result'; KG.ui.history = [];
      KG.render();
      celebrateResult(r);
      return;
    }
    KG.render();
  };
  KG.A['quiz-exit'] = () => {
    const s = GM.cur;
    if (!s || s.phase === 'done' || !s.answers.length) { GM.abandon(); stopTimer(); KG.setTab(KG.ui.tab || 'home'); return; }
    KG.confirm({
      title: 'לצאת מהמשחק?', text: s.mode === 'h2h' ? 'משחק ראש בראש לא נשמר.' : 'המשחק נשמר, ואפשר להמשיך אותו מאיפה שעצרת ממסך הבית.', yes: 'יציאה',
      run: () => { stopTimer(); if (s.mode === 'h2h') GM.abandon(); else { GM.cur = null; KG.saveProgress(true); } KG.setTab('home'); }
    });
  };

  // ---- Results ----
  function celebrateResult(r) {
    const good = r.mode === 'h2h' || (r.stars >= 2) || (r.total && r.correct / r.total >= 0.7);
    if (good) { KG.confetti(); KG.sound.play('win'); }
    if (r.unlocked && r.unlocked.length) setTimeout(() => KG.celebrate(r.unlocked), 600);
  }
  KG.V.result = () => {
    const s = GM.cur;
    const r = (s && s.summary) || lastResult;
    if (!r) return KG.errorBox('אין תוצאה להצגה');
    let h = '';
    if (r.mode === 'h2h') {
      const win = r.players.filter((p) => p.win);
      h += '<div class="result-hero"><div class="lbl">ראש בראש · מנצח' + (win.length > 1 ? 'ים' : '') + '</div><div class="big">' + esc(win.map((p) => p.name).join(' ו')) + '</div><div class="lbl">' + (win.length > 1 ? 'תיקו בצמרת!' : 'כל הכבוד!') + '</div></div>';
      h += '<div class="podium">' + r.players.slice().sort((a, b) => b.score - a.score).map((p, i) => '<div class="p' + (p.win ? ' win' : '') + '"><span class="tile ' + (p.win ? 'gold' : 'gray') + '">' + (p.win ? icon('crown') : '<b>' + (i + 1) + '</b>') + '</span><span class="grow"><b>' + esc(p.name) + '</b><span class="s" style="display:block;font-size:13px;color:var(--muted)">' + p.correct + ' תשובות נכונות</span></span><span class="sc num">' + fmt(p.score) + '</span></div>').join('') + '</div>';
    } else {
      h += '<div class="result-hero"><div class="lbl">' + esc(r.title) + '</div>';
      if (r.mode === 'journey') h += '<div class="stars">' + [1, 2, 3].map((k) => icon('star', k <= r.stars ? '' : 'off')).join('') + '</div><div class="lbl">' + (r.passed ? 'עברת את השלב!' : 'צריך 3 תשובות נכונות כדי לעבור') + '</div>';
      if (r.mode === 'journey' && !r.passed) h += '<div class="lbl">הנקודות שצברת נשמרו, ובנסיון הבא יהיו 5 שאלות חדשות.</div>';
      h += '<div class="big num">' + fmt(r.score) + '</div><div class="lbl">נקודות במשחק · ' + r.correct + ' מתוך ' + r.total + ' נכונות</div>';
      h += '<div class="chips"><span class="chip sm">' + icon('star', 'sm') + '+' + fmt(r.career) + ' לסך הכל</span>' + (r.best >= 3 ? '<span class="chip sm">' + icon('flame', 'sm') + r.best + ' ברצף</span>' : '') +
        r.records.map((x) => '<span class="chip sm">' + icon('trophy', 'sm') + esc(x) + '</span>').join('') + '</div></div>';
      if (r.mode === 'daily' && !r.reward) h += '<div class="notice gold">' + icon('info', 'sm') + '<span class="grow">' + (GM.clockBack() ? 'התאריך בטלפון מוקדם מהתאריך האחרון ששיחקת בו, ולכן האתגר נספר בלי ניקוד.' : 'כבר שיחקת את האתגר של היום, ולכן הפעם זה בלי ניקוד. מחר יחכה אתגר חדש.') + '</span></div>';
    }
    h += '<div class="btn-row">';
    if (r.mode === 'journey' && r.passed) h += '<button type="button" class="btn" data-action="next-stage">השלב הבא' + icon('chevL') + '</button>';
    else if (r.mode === 'journey') h += '<button type="button" class="btn" data-action="again">' + icon('refresh') + 'לנסות שוב</button>';
    else if (r.mode !== 'daily') h += '<button type="button" class="btn" data-action="again">' + icon('refresh') + 'עוד משחק</button>';
    h += '<button type="button" class="btn secondary" data-action="result-home">' + icon('home') + 'בית</button></div>';
    if (s && s.answers.length) {
      h += '<span class="section-label">השאלות במשחק</span><div class="card review">';
      s.answers.forEach((a) => {
        const q = KG.C.q(a.qid);
        if (!q) return;
        const right = q.type === 'tf' ? (q.a ? 'נכון' : 'לא נכון') : q.type === 'order' ? q.items.map((x) => x.t).join(' ← ') : q.a;
        h += '<div class="r ' + (a.ok ? 'ok' : 'no') + '">' + icon(a.ok ? 'check' : 'close', 'sm') + '<span class="grow">' + esc(q.q) + '<br><span class="fine">' + esc(right) + (s.players ? ' · ' + esc(s.players[a.p].name) : '') + '</span></span>' + (a.ok ? '<b class="num" style="color:var(--gold)">+' + fmt(a.pts) + '</b>' : '') + '</div>';
      });
      h += '</div>';
    }
    return h;
  };
  KG.A['result-home'] = () => { GM.cur = null; KG.setTab('home'); };
  KG.A['next-stage'] = () => { const n = (GM.cur && GM.cur.stage || 0) + 1; GM.cur = null; KG.startGame(() => KG.game.startJourney(Math.min(n, KG.pick.journeyTotal()))); };
  KG.A['again'] = () => {
    const s = GM.cur;
    if (!s) return KG.setTab('play');
    const m = s.mode;
    GM.cur = null;
    if (m === 'journey') KG.startGame(() => GM.startJourney(s.stage));
    else if (m === 'survival') KG.startGame(() => GM.startSurvival());
    else if (m === 'team') KG.startGame(() => GM.startTeam(s.team, 10));
    else if (m === 'h2h') { KG.setTab('play'); KG.openSheet('h2h'); }
    else if (m === 'crest') KG.startGame(() => GM.startImages('crest', s.fx));
    else if (m === 'image') KG.startGame(() => GM.startImages('image'));
    else KG.startGame(() => GM.startFree(s.filters || {}, s.ids.length || 10, s.title));
  };

  // ---- Report a mistake ----
  KG.SHEETS.report = {
    title: () => 'דיווח על טעות',
    init: (d) => { const p = KG.P.profile; d.name = p.name; d.email = p.email; d.note = ''; d.q = GM.q() || KG.C.q(d.qid); },
    render: (d) => {
      const q = d.q;
      return '<div class="notice">' + icon('flag', 'sm') + '<span class="grow">' + esc(q ? q.q : '') + '</span></div>' +
        '<div class="field"><label for="rp-note">מה לא נכון?</label><textarea id="rp-note" class="input" data-scope="report" data-bind="note" placeholder="למשל: התשובה הנכונה היא… כי…">' + esc(d.note) + '</textarea></div>' +
        '<div class="field"><label for="rp-name">שם (כדי שנוכל לחזור אליך)</label><input id="rp-name" class="input" data-scope="report" data-bind="name" value="' + esc(d.name) + '"></div>' +
        '<div class="field"><label for="rp-mail">אימייל</label><input id="rp-mail" class="input ltr" style="text-align:left" type="email" data-scope="report" data-bind="email" value="' + esc(d.email) + '"></div>' +
        '<button type="button" class="btn" data-action="report-send">' + icon('message') + 'שליחת הדיווח</button>' +
        '<p class="fine center">הדיווח נשמר גם בטלפון (מצב עורך ← שאלות שדווחו). אם אין אינטרנט, הוא יישלח לבד כשהחיבור יחזור.</p>';
    }
  };
  KG.onInput.report = (el) => { if (KG.ui.sheet) KG.ui.sheet.data[el.dataset.bind] = el.value; };
  KG.A['report'] = () => { const q = GM.q(); if (q) KG.openSheet('report', { qid: q.id }); };
  KG.A['report-send'] = async () => {
    const d = KG.ui.sheet.data, q = d.q;
    if (String(d.note || '').trim().length < 3) { KG.toast('כתבו בכמה מילים מה לא נכון'); return; }
    KG.P.reports.push({ id: KG.uid(), qid: q.id, rev: q.rev, ts: Date.now(), note: d.note.trim(), q: q.q, a: q.type === 'tf' ? String(q.a) : q.a || '' });
    if (String(d.name || '').trim().length >= 2 && KG.isEmail(d.email)) {
      KG.P.profile = { name: d.name.trim(), email: d.email.trim() };
      KG.queueFeedback('bug', 'דיווח על טעות בשאלה ' + q.id + ' (rev ' + q.rev + ')\nהשאלה: ' + q.q + '\nהתשובה באפליקציה: ' + (q.type === 'tf' ? (q.a ? 'נכון' : 'לא נכון') : q.a || '') + '\nההערה: ' + d.note.trim());
    }
    KG.saveProgress();
    KG.closeSheet(true);
    KG.toast('תודה! הדיווח נשמר');
  };
})(typeof window !== 'undefined' ? window : globalThis);
