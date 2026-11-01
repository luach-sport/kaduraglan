// Builds the question bank that ships inside the app (www/data/content/*.json) from content-src/,
// and checks every record with the same rules the app uses (www/js/content/schema.js):
// unique ids, valid answers, references to teams and players that exist, picture files that exist.
// Any error stops the build. Run: node scripts/build-content.mjs  (CI runs it before every APK).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'content-src');
const OUT = join(ROOT, 'www', 'data', 'content');
const CONTENT_VERSION = 1;
const CONTENT_DATE = '2026-11-01';

// Load the app's own schema (same checks as in the app).
globalThis.window = globalThis;
for (const f of ['core/base.js', 'content/schema.js']) vm.runInThisContext(readFileSync(join(ROOT, 'www', 'js', f), 'utf8'), { filename: f });
const S = globalThis.KG.schema;

const errors = [];
const warn = [];
const err = (m) => errors.push(m);

const qFiles = readdirSync(join(SRC, 'questions')).filter((f) => f.endsWith('.mjs')).sort();
const questions = [];
for (const f of qFiles) {
  const mod = await import(pathToFileURL(join(SRC, 'questions', f)).href);
  for (const q of mod.default) { q._file = f; questions.push(q); }
}
const teams = (await import(pathToFileURL(join(SRC, 'entities', 'teams.mjs')).href)).default;
const players = (await import(pathToFileURL(join(SRC, 'entities', 'players.mjs')).href)).default;
const others = await import(pathToFileURL(join(SRC, 'entities', 'others.mjs')).href);
const { nations, comps, stadiums } = others;
const imagesFile = join(SRC, 'images.json');
const images = existsSync(imagesFile) ? JSON.parse(readFileSync(imagesFile, 'utf8')) : [];

// Entities
const ents = { teams, players, nations, comps, stadiums };
const allIds = new Map();
for (const [kind, list] of Object.entries(ents)) {
  for (const x of list) {
    for (const e of S.checkEntity(kind, x)) err(kind + ' ' + x.id + ': ' + e);
    if (allIds.has(x.id)) err('duplicate entity id ' + x.id + ' (' + kind + ', ' + allIds.get(x.id) + ')');
    allIds.set(x.id, kind);
    for (const k of Object.keys(x)) if (x[k] === null) delete x[k];
  }
}
for (const t of teams) {
  if (t.stadium && !stadiums.some((s) => s.id === t.stadium)) err('team ' + t.id + ': unknown stadium ' + t.stadium);
  if (t.league && !comps.some((c) => c.id === t.league)) err('team ' + t.id + ': unknown league ' + t.league);
}
for (const s of stadiums) for (const t of s.teams || []) if (!teams.some((x) => x.id === t)) err('stadium ' + s.id + ': unknown team ' + t);
for (const p of players) for (const c of p.clubs || []) if (/^[a-z0-9-]+$/.test(c) && !teams.some((x) => x.id === c)) err('player ' + p.id + ': unknown club id ' + c);

// Questions
const seen = new Map();
const teamOrNation = new Set(teams.map((t) => t.id).concat(nations.map((n) => n.id)));
const playerIds = new Set(players.map((p) => p.id));
for (const q of questions) {
  const where = q._file + ' ' + q.id;
  for (const e of S.checkQuestion(q)) err(where + ': ' + e);
  if (seen.has(q.id)) err('duplicate question id ' + q.id + ' (' + seen.get(q.id) + ' and ' + q._file + ')');
  seen.set(q.id, q._file);
  for (const t of q.teams || []) if (!teamOrNation.has(t)) err(where + ': unknown team / nation ' + t);
  for (const p of q.players || []) if (!playerIds.has(p)) err(where + ': unknown player ' + p);
  if (q.img && !images.some((m) => m.id === q.img)) err(where + ': unknown picture ' + q.img);
  if (q.explain && q.explain.length < 8) warn.push(where + ': very short explanation');
  delete q._file;
}
// Same question text twice is almost always a mistake.
const texts = new Map();
for (const q of questions) {
  const k = q.q + '|' + (q.a === undefined ? '' : String(q.a));
  if (texts.has(k)) err('same question twice: ' + q.id + ' and ' + texts.get(k));
  texts.set(k, q.id);
}
// Pictures that ship with the app
for (const m of images) {
  for (const e of S.checkImage(m)) err('image ' + m.id + ': ' + e);
  if (!m.file || !existsSync(join(ROOT, 'www', 'data', 'images', m.file))) err('image ' + m.id + ': file missing www/data/images/' + m.file);
  if (m.for && !allIds.has(m.for)) err('image ' + m.id + ': unknown ' + m.for);
}

// Summary
const byCat = {}, byDiff = {}, byType = {};
let il = 0;
for (const q of questions) {
  byCat[q.cat] = (byCat[q.cat] || 0) + 1;
  byDiff[q.diff] = (byDiff[q.diff] || 0) + 1;
  byType[q.type] = (byType[q.type] || 0) + 1;
  if (q.il || q.cat === 'israel') il++;
}
console.log('questions', questions.length, '| israeli', il, '(' + Math.round((il / questions.length) * 100) + '%)');
console.log('by category', byCat);
console.log('by level', byDiff);
console.log('by type', byType);
console.log('entities', Object.fromEntries(Object.entries(ents).map(([k, v]) => [k, v.length])), '| pictures', images.length);
const barca = questions.filter((q) => (q.teams || []).includes('barcelona')).length;
console.log('barcelona questions', barca);
if (warn.length) console.log('warnings:\n  ' + warn.join('\n  '));
if (errors.length) {
  console.error('\n' + errors.length + ' ERRORS:\n  ' + errors.join('\n  '));
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const write = (name, data) => writeFileSync(join(OUT, name + '.json'), JSON.stringify(data) + '\n');
write('questions', questions);
write('teams', teams);
write('players', players);
write('nations', nations);
write('comps', comps);
write('stadiums', stadiums);
write('images', images);
write('manifest', { format: 1, contentVersion: CONTENT_VERSION, date: CONTENT_DATE, questions: questions.length, israeli: il, files: ['questions', 'teams', 'players', 'nations', 'comps', 'stadiums', 'images'] });
console.log('written to www/data/content (version ' + CONTENT_VERSION + ')');
