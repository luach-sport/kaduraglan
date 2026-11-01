// Loads the app's own scripts into Node (no browser), with the shipped question bank and an
// in-memory database, so the tests check the real code.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WWW = join(ROOT, 'www');
const SCRIPTS = [
  'vendor/fflate.min.js', 'js/core/brand.js', 'js/core/base.js', 'js/core/icons.js', 'js/core/native.js', 'js/core/db.js', 'js/core/progress.js',
  'js/content/schema.js', 'js/content/merge.js', 'js/content/gen.js', 'js/content/repo.js', 'js/content/images.js', 'js/content/packages.js', 'js/content/online.js',
  'js/game/config.js', 'js/game/scoring.js', 'js/game/picker.js', 'js/game/session.js'
];

export async function loadApp() {
  globalThis.window = globalThis;
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
  delete globalThis.KG;
  for (const f of SCRIPTS) vm.runInThisContext(readFileSync(join(WWW, f), 'utf8'), { filename: f });
  const KG = globalThis.KG;
  KG.C.loadBase = async () => {
    const get = (n) => JSON.parse(readFileSync(join(WWW, 'data', 'content', n + '.json'), 'utf8'));
    const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
    return {
      manifest: get('manifest'), questions: byId(get('questions')),
      entities: { teams: byId(get('teams')), players: byId(get('players')), nations: byId(get('nations')), comps: byId(get('comps')), stadiums: byId(get('stadiums')) },
      images: byId(get('images'))
    };
  };
  KG.saveProgress = ((orig) => (now) => orig(true))(KG.saveProgress);
  await KG.loadProgress();
  await KG.C.init();
  return KG;
}

export const ROOT_DIR = ROOT;
