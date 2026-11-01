import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers.mjs';

const KG = await loadApp();

test('points by level, wrong answer gives nothing', () => {
  assert.equal(KG.score({ correct: true, diff: 1, streak: 1, firstSolve: true }).pts, 100);
  assert.equal(KG.score({ correct: true, diff: 6, streak: 1, firstSolve: true }).pts, 600);
  const w = KG.score({ correct: false, diff: 5, streak: 0, firstSolve: true });
  assert.equal(w.pts, 0);
  assert.equal(w.career, 0);
});

test('the 50:50 hint makes the question worth half', () => {
  assert.equal(KG.score({ correct: true, diff: 3, hints: 0, streak: 1, firstSolve: true }).pts, 200);
  assert.equal(KG.score({ correct: true, diff: 3, hints: 1, streak: 1, firstSolve: true }).pts, 100);
  assert.equal(KG.score({ correct: true, diff: 3, hints: 9, streak: 1, firstSolve: true }).pts, 100);
});

test('streak bonus from the 3rd answer, capped at +50%', () => {
  assert.equal(KG.score({ correct: true, diff: 1, streak: 2, firstSolve: true }).pts, 100);
  assert.equal(KG.score({ correct: true, diff: 1, streak: 3, firstSolve: true }).pts, 110);
  assert.equal(KG.score({ correct: true, diff: 1, streak: 50, firstSolve: true }).pts, 150);
});

test('speed bonus only in timed games', () => {
  const fast = KG.score({ correct: true, diff: 2, streak: 1, firstSolve: true, timed: true, timeLeftFrac: 1 });
  assert.equal(fast.pts, 150 + 75);
  const slow = KG.score({ correct: true, diff: 2, streak: 1, firstSolve: true, timed: true, timeLeftFrac: 0.2 });
  assert.equal(slow.pts, 150);
  const untimed = KG.score({ correct: true, diff: 2, streak: 1, firstSolve: true, timed: false, timeLeftFrac: 1 });
  assert.equal(untimed.pts, 150);
});

test('no endless farming: a question solved before adds only 10% to the total', () => {
  const first = KG.score({ correct: true, diff: 4, streak: 1, firstSolve: true });
  const again = KG.score({ correct: true, diff: 4, streak: 1, firstSolve: false });
  assert.equal(first.career, 300);
  assert.equal(again.career, 30);
  assert.equal(again.pts, 300, 'the game score itself stays full');
});

test('head to head never changes the owner\'s total; daily counts ×1.5 once', () => {
  assert.equal(KG.score({ correct: true, diff: 2, streak: 1, firstSolve: true, mode: 'h2h' }).career, 0);
  assert.equal(KG.score({ correct: true, diff: 2, streak: 1, firstSolve: true, mode: 'daily', dailyReward: true }).career, 225);
  assert.equal(KG.score({ correct: true, diff: 2, streak: 1, firstSolve: true, mode: 'daily', dailyReward: false, noReward: true }).career, 0);
});

test('ranks follow the config thresholds', () => {
  assert.equal(KG.CFG.rank(0).cur.name, 'אוהד מתחיל');
  assert.equal(KG.CFG.rank(1500).cur.name, 'אוהד ותיק');
  assert.equal(KG.CFG.rank(999999).cur.name, 'היכל התהילה');
  assert.equal(KG.CFG.rank(999999).next, null);
});
