// Writes the signed update.json for this release. Unlike a web-only update, every new version of
// כדורגלן is a full APK: after updating, the installed app itself is the newest version, so sharing the
// app as a file and backing it up from a file manager always give the latest version.
// The app checks the signature with the public key it was built with before it offers the download.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const root = process.cwd();
const env = process.env;
const repo = env.GITHUB_REPOSITORY || 'luach-sport/kaduraglan';
const build = parseInt(env.GITHUB_RUN_NUMBER || '0', 10);
const version = env.APP_VERSION || '1.02';
const tag = env.TAG;
const keyDir = env.UPDATE_KEY_DIR;
const apk = join(root, 'kaduraglan.apk');
if (!tag || !build || !keyDir) throw new Error('TAG, GITHUB_RUN_NUMBER and UPDATE_KEY_DIR are required');
if (!existsSync(apk)) throw new Error('kaduraglan.apk is missing');
const out = join(root, 'dist');
mkdirSync(out, { recursive: true });

const bytes = readFileSync(apk);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const notes = existsSync(join(root, 'release-notes.txt'))
  ? readFileSync(join(root, 'release-notes.txt'), 'utf8').split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 8)
  : [];

const payload = JSON.stringify({
  app: 'com.luachsport.kaduraglan', version, build,
  url: `https://github.com/${repo}/releases/download/${tag}/kaduraglan.apk`,
  sha256, size: bytes.length, notes, date: new Date().toISOString()
});
const priv = createPrivateKey(readFileSync(join(keyDir, 'key.pem')));
const sig = sign('sha256', Buffer.from(payload), { key: priv, dsaEncoding: 'ieee-p1363' }).toString('base64');
const pub = createPublicKey(readFileSync(join(keyDir, 'pub.pem')));
if (!verify('sha256', Buffer.from(payload), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64'))) throw new Error('signature self-check failed');
writeFileSync(join(out, 'update.json'), JSON.stringify({ payload, sig }) + '\n');
console.log('update', version, 'build', build, 'apk', bytes.length, 'bytes', sha256);
