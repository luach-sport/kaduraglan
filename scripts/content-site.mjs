// Publishes the question packages (updates/*.zip and updates/index.json) on the website at /kaduraglan/content/,
// where installed apps look for new questions when they have internet.
// Run after the kit build:  node scripts/content-site.mjs _site/content
import { readdirSync, mkdirSync, copyFileSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const out = process.argv[2] || join(process.cwd(), '_site', 'content');
const src = join(process.cwd(), 'updates');
mkdirSync(out, { recursive: true });
const idxFile = join(src, 'index.json');
const idx = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, 'utf8')) : { format: 1, packages: [] };
for (const p of idx.packages) {
  const f = join(src, p.file);
  if (!existsSync(f)) throw new Error('missing package file ' + p.file);
  const sha = createHash('sha256').update(readFileSync(f)).digest('hex');
  if (sha !== p.sha256) throw new Error('checksum mismatch for ' + p.file + ' (run scripts/make-package.mjs again)');
  copyFileSync(f, join(out, p.file));
}
writeFileSync(join(out, 'index.json'), JSON.stringify(idx) + '\n');
console.log('content packages:', idx.packages.length, readdirSync(out).join(', '));
