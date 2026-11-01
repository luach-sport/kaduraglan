// Makes an update package for the question bank from a folder on the computer.
//
//   node scripts/make-package.mjs updates/src/football-update-002
//
// The folder holds:
//   package.json    { "id": "football-update-002", "title": "…", "contentVersion": 2, "notes": "…" }   (+ "maintenance": true to allow remove)
//   questions.json  { "add": [...], "update": [...], "remove": [...] }      (any part may be missing)
//   entities.json   { "teams": { "add": [...], "update": [...] }, "players": {…}, … }
//   images.json     { "add": [{ "id", "kind", "for", "file": "images/x.jpg", "source", "license", "credit" }] }
//   images/…        the pictures (any size: they are shrunk to WebP here, like the app does)
//
// Every record is checked with the app's own rules before the package is written. The result is
// updates/<id>.zip and an updated updates/index.json; after a push, installed apps download it by themselves.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
if (!dir || !existsSync(join(dir, 'package.json'))) { console.error('usage: node scripts/make-package.mjs <folder with package.json>'); process.exit(1); }

globalThis.window = globalThis;
for (const f of ['vendor/fflate.min.js', 'js/core/base.js', 'js/content/schema.js']) vm.runInThisContext(readFileSync(join(ROOT, 'www', f), 'utf8'), { filename: f });
const S = globalThis.KG.schema;
const fflate = globalThis.fflate;
const read = (n) => (existsSync(join(dir, n)) ? JSON.parse(readFileSync(join(dir, n), 'utf8')) : null);

const meta = read('package.json');
const questions = read('questions.json');
const entities = read('entities.json');
const images = read('images.json');
const errors = [];
for (const q of (questions && questions.add) || []) S.checkQuestion(q).forEach((e) => errors.push('add ' + q.id + ': ' + e));
for (const q of (questions && questions.update) || []) if (!q.patch) S.checkQuestion(q).forEach((e) => errors.push('update ' + q.id + ': ' + e));
if (questions && questions.remove && questions.remove.length && !meta.maintenance) errors.push('remove needs "maintenance": true in package.json');
for (const [kind, part] of Object.entries(entities || {})) for (const x of part.add || []) S.checkEntity(kind, x).forEach((e) => errors.push(kind + ' ' + x.id + ': ' + e));
for (const m of [].concat((images && images.add) || [], (images && images.update) || [])) {
  S.checkImage(m).forEach((e) => errors.push('image ' + m.id + ': ' + e));
  if (!m.file || !existsSync(join(dir, m.file))) errors.push('image ' + m.id + ': file missing ' + m.file);
}
if (errors.length) { console.error(errors.length + ' errors:\n  ' + errors.join('\n  ')); process.exit(1); }

let sharp = null;
try { sharp = createRequire(process.env.SHARP_FROM || '/opt/npm-tools/node_modules/')('sharp'); } catch (e) { console.log('sharp not found: pictures are packed as they are'); }
const MAX = { crest: 480, 'shirt-home': 560, 'shirt-away': 560, player: 640, stadium: 960, trophy: 560, photo: 900 };

const files = {};
const enc = (o) => new TextEncoder().encode(JSON.stringify(o, null, 1));
if (questions) files['questions.json'] = enc(questions);
if (entities) files['entities.json'] = enc(entities);
if (images) {
  const out = { add: [], update: [] };
  for (const key of ['add', 'update']) {
    for (const m of images[key] || []) {
      let bytes = readFileSync(join(dir, m.file));
      let name = 'images/' + m.id + '.' + basename(m.file).split('.').pop().toLowerCase();
      if (sharp) {
        const max = MAX[m.kind] || 800;
        bytes = await sharp(bytes).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        name = 'images/' + m.id + '.webp';
      }
      files[name] = new Uint8Array(bytes);
      out[key].push(Object.assign({}, m, { file: name }));
    }
  }
  files['images.json'] = enc(out);
}
const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const listed = {};
for (const [n, u8] of Object.entries(files)) listed[n] = { size: u8.length, sha256: sha(u8) };
const manifest = { format: 1, app: 'kaduraglan', id: meta.id, title: meta.title || meta.id, contentVersion: meta.contentVersion || 0, created: new Date().toISOString(), notes: meta.notes || '', files: listed };
if (meta.maintenance) manifest.maintenance = true;
files['manifest.json'] = enc(manifest);
const zip = fflate.zipSync(files, { level: 6 });

const updates = join(ROOT, 'updates');
mkdirSync(updates, { recursive: true });
const file = meta.id + '.zip';
writeFileSync(join(updates, file), zip);
const idxFile = join(updates, 'index.json');
const idx = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, 'utf8')) : { format: 1, packages: [] };
idx.packages = idx.packages.filter((p) => p.id !== meta.id).concat([{ id: meta.id, file, title: manifest.title, contentVersion: manifest.contentVersion, sha256: sha(zip), size: zip.length, date: manifest.created.slice(0, 10), notes: manifest.notes }]);
idx.packages.sort((a, b) => (a.contentVersion || 0) - (b.contentVersion || 0));
writeFileSync(idxFile, JSON.stringify(idx, null, 1) + '\n');
console.log('package', file, Math.round(zip.length / 1024) + ' KB', '| questions +' + (((questions && questions.add) || []).length) + ' ~' + (((questions && questions.update) || []).length), '| pictures', (images && (images.add || []).length) || 0);
