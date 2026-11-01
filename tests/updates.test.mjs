import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers.mjs';

const KG = await loadApp();
const PK = KG.pkg;
const baseCount = KG.C.active.length;
const existing = KG.C.active.find((q) => q.type === 'mc' && !q.generated);

const newQ = (id, extra) => Object.assign({ id, rev: 1, type: 'mc', cat: 'israel', diff: 2, q: 'שאלת בדיקה ' + id + '?', a: 'נכון', w: ['שגוי 1', 'שגוי 2', 'שגוי 3'], explain: 'הסבר', src: 'בדיקה', ver: '2026-11-01', il: true }, extra || {});
const zip = (o) => PK.buildPackage(Object.assign({ contentVersion: 2 }, o));

test('a new package adds questions and leaves everything else as it was', async () => {
  const bytes = await zip({ id: 'test-001', title: 'בדיקה', questions: { add: [newQ('t-a'), newQ('t-b')] } });
  const rep = await PK.importBytes(bytes, 'file');
  assert.equal(rep.added, 2);
  assert.equal(rep.updated, 0);
  assert.equal(rep.rejected.length, 0);
  assert.equal(KG.C.active.length, baseCount + 2);
  assert.ok(KG.C.q(existing.id), 'old questions still there');
  assert.equal(KG.C.meta.contentVersion, 2);
  assert.ok(rep.backup, 'a backup was taken before the import');
});

test('importing the same package again changes nothing (no duplicates)', async () => {
  const bytes = await zip({ id: 'test-001', title: 'בדיקה', questions: { add: [newQ('t-a'), newQ('t-b')] } });
  const rep = await PK.importBytes(bytes, 'file');
  assert.equal(rep.already, true);
  assert.equal(KG.C.active.length, baseCount + 2);
});

test('"add" with an id that exists is rejected; an existing question changes only by "update" with a higher rev', async () => {
  const bytes = await zip({ id: 'test-002', questions: {
    add: [newQ(existing.id)],
    update: [{ id: existing.id, rev: existing.rev + 1, patch: { explain: 'הסבר מעודכן' } }, { id: 't-a', rev: 1, patch: { a: 'אחר' } }]
  } });
  const rep = await PK.importBytes(bytes, 'file');
  assert.equal(rep.added, 0);
  assert.equal(rep.updated, 1);
  assert.equal(rep.rejected.length, 2, 'duplicate add + same rev update');
  assert.equal(KG.C.q(existing.id).explain, 'הסבר מעודכן');
  assert.equal(KG.C.q(existing.id).rev, existing.rev + 1);
  assert.equal(KG.C.q('t-a').a, 'נכון', 'unchanged without a higher rev');
});

test('progress is kept when a question is updated', async () => {
  KG.P.q[existing.id] = { a: 3, c: 2, s: 123, l: 456 };
  const bytes = await zip({ id: 'test-003', questions: { update: [{ id: existing.id, rev: existing.rev + 2, patch: { diff: 5 } }] } });
  await PK.importBytes(bytes, 'file');
  assert.equal(KG.C.q(existing.id).diff, 5);
  assert.deepEqual(KG.P.q[existing.id], { a: 3, c: 2, s: 123, l: 456 });
});

test('a normal package cannot delete; a maintenance package hides the question but keeps a marker', async () => {
  const r1 = await PK.importBytes(await zip({ id: 'test-004', questions: { remove: ['t-b'] } }), 'file');
  assert.equal(r1.removed, 0);
  assert.equal(r1.rejected.length, 1);
  assert.ok(KG.C.q('t-b'));
  const r2 = await PK.importBytes(await zip({ id: 'test-005', maintenance: true, questions: { remove: ['t-b'] } }), 'file');
  assert.equal(r2.removed, 1);
  assert.equal(KG.C.q('t-b'), null);
  assert.ok(KG.C.overlay.removed['t-b']);
});

test('invalid records are rejected with a reason, the valid ones still go in', async () => {
  const bad = newQ('t-bad', { w: ['נכון', 'x', 'y'] });
  const bytes = await zip({ id: 'test-006', questions: { add: [bad, newQ('t-good')] } });
  const rep = await PK.importBytes(bytes, 'file');
  assert.equal(rep.added, 1);
  assert.equal(rep.rejected.length, 1);
  assert.match(rep.rejected[0].reason, /התשובה הנכונה/);
});

test('a damaged package is rejected as a whole', async () => {
  const bytes = await zip({ id: 'test-007', questions: { add: [newQ('t-damaged')] } });
  const files = KG.window ? null : globalThis.fflate.unzipSync(bytes);
  files['questions.json'][20] ^= 0xff;
  const broken = globalThis.fflate.zipSync(files);
  await assert.rejects(() => PK.importBytes(broken, 'file'), /פגום/);
  assert.equal(KG.C.q('t-damaged'), null);
  await assert.rejects(() => PK.importBytes(new Uint8Array([1, 2, 3, 4]), 'file'), /חבילה/);
  const extra = globalThis.fflate.unzipSync(bytes);
  extra['evil.json'] = new TextEncoder().encode('{}');
  await assert.rejects(() => PK.importBytes(globalThis.fflate.zipSync(extra), 'file'), /לא רשום/);
});

test('if saving fails in the middle, the bank stays exactly as before', async () => {
  const before = JSON.stringify(KG.C.overlay);
  const count = KG.C.active.length;
  const realAtomic = KG.db.atomic;
  KG.db.atomic = (ops) => realAtomic(ops.concat([{ store: 'kv', op: 'put', key: 'x', val: 1, fail: true }]));
  const bytes = await zip({ id: 'test-008', questions: { add: [newQ('t-fail')] } });
  await assert.rejects(() => PK.importBytes(bytes, 'file'), /נשאר בדיוק כמו שהיה/);
  KG.db.atomic = realAtomic;
  assert.equal(JSON.stringify(KG.C.overlay), before);
  assert.equal(KG.C.active.length, count);
  assert.equal(await KG.db.get('kv', 'x'), undefined);
  assert.equal(KG.C.q('t-fail'), null);
});

test('one-file JSON packages work too', async () => {
  const data = { questions: { add: [newQ('t-json')] } };
  const manifest = { format: 1, app: 'kaduraglan', id: 'test-json', contentVersion: 3, checksum: await PK.sha256(new TextEncoder().encode(JSON.stringify(data))) };
  const rep = await PK.importBytes(new TextEncoder().encode(JSON.stringify({ manifest, data })), 'file');
  assert.equal(rep.added, 1);
  const tampered = { manifest, data: { questions: { add: [newQ('t-json2')] } } };
  await assert.rejects(() => PK.importBytes(new TextEncoder().encode(JSON.stringify(tampered)), 'file'), /פגומה/);
});

test('pictures in a package create picture questions', async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/webp' });
  const mk = (id) => ({ meta: { id: 'crest-' + id, kind: 'crest', for: id, source: 'בדיקה', license: 'בדיקה' }, blob });
  const bytes = await zip({ id: 'test-img', images: ['barcelona', 'real-madrid', 'atletico', 'valencia'].map(mk) });
  const rep = await PK.importBytes(bytes, 'file');
  assert.equal(rep.images, 4);
  const gen = KG.C.q('gen-crest-barcelona');
  assert.ok(gen);
  assert.equal(gen.a, 'ברצלונה');
  assert.equal(gen.w.length, 3);
  assert.ok(await KG.db.get('images', 'crest-barcelona'));
  assert.equal(KG.pick.pool({ images: 'only', sub: 'crest' }).length, 4);
});

test('restore a backup: the bank goes back, progress is untouched', async () => {
  const list = await PK.listBackups();
  assert.ok(list.length > 0);
  const xp = KG.P.xp;
  const oldest = list[list.length - 1];
  await PK.restoreBackup(oldest.key);
  assert.equal(KG.P.xp, xp);
  assert.ok(KG.C.active.length < baseCount + 10);
});

test('content backup file round trip', async () => {
  const bytes = await PK.exportContent();
  const bk = await PK.readContentBackup(bytes);
  assert.deepEqual(Object.keys(bk.overlay.questions).sort(), Object.keys(KG.C.overlay.questions).sort());
  await PK.restoreContent(bk);
  assert.deepEqual(Object.keys(KG.C.overlay.questions).sort(), Object.keys(bk.overlay.questions).sort());
});
