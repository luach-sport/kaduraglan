/* Points for one answer. Pure function, tested in tests/scoring.test.mjs.
   pts    = points in this game (shown on screen, used for records)
   career = what is added to the player's total: full the first time a question is solved, 10% after that,
            nothing in head to head (several people share the phone), ×1.5 in the daily challenge (once a day). */
(function (G) {
  'use strict';
  const KG = G.KG;

  KG.score = (o) => {
    const C = KG.CFG;
    const diff = KG.clamp(o.diff | 0 || 1, 1, 6);
    if (!o.correct) return { pts: 0, career: 0, base: C.BASE[diff], hintFactor: 1, speed: 0, streakBonus: 0 };
    const base = C.BASE[diff];
    const hints = Math.max(0, o.hints | 0);
    const hintFactor = Math.max(C.MIN_FACTOR, 1 - hints * C.HINT_COST);
    let speed = 0;
    if (o.timed && isFinite(o.timeLeftFrac)) speed = Math.round(base * C.SPEED_MAX * KG.clamp((o.timeLeftFrac - 0.3) / 0.7, 0, 1));
    const streakNow = Math.max(1, o.streak | 0); // including this answer
    const streakBonus = Math.min(C.STREAK_MAX, Math.max(0, streakNow - 2) * C.STREAK_STEP);
    const pts = Math.round((base * hintFactor + speed) * (1 + streakBonus));
    let career = 0;
    if (o.mode !== 'h2h') {
      career = o.firstSolve ? pts : Math.max(1, Math.round(pts * C.REPEAT_FACTOR));
      if (o.mode === 'daily' && o.dailyReward) career = Math.round(career * C.DAILY_FACTOR);
      if (o.noReward) career = 0;
    }
    return { pts, career, base, hintFactor, speed, streakBonus };
  };
})(typeof window !== 'undefined' ? window : globalThis);
