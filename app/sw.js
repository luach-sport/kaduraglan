/* כדורגלן's offline copy for the web version and for iPhone (added to the home screen from Safari).
   The Android app never uses it. When the website is built, scripts/web-app.mjs writes the list of the
   app's files and a version made from their contents into VERSION and FILES below; a new version is
   downloaded in full in the background and only then replaces the old one, so the app always opens.
   Question packages (../content/) and the feedback service go straight to the internet. */
const VERSION = "4104ecc6207a";
const FILES = ["cap-runtime.js","data/content/comps.json","data/content/images.json","data/content/manifest.json","data/content/nations.json","data/content/players.json","data/content/questions.json","data/content/stadiums.json","data/content/teams.json","fonts/Rubik-var.ttf","icon-180.png","icon-512.png","icon-maskable-512.png","icon.png","index.html","js/app.js","js/content/gen.js","js/content/images.js","js/content/merge.js","js/content/online.js","js/content/packages.js","js/content/repo.js","js/content/schema.js","js/core/base.js","js/core/brand.js","js/core/db.js","js/core/icons.js","js/core/native.js","js/core/progress.js","js/game/config.js","js/game/picker.js","js/game/scoring.js","js/game/session.js","js/install-ios.js","js/share-app.js","js/ui/cats.js","js/ui/data.js","js/ui/editor.js","js/ui/feedback.js","js/ui/files.js","js/ui/home.js","js/ui/library.js","js/ui/play.js","js/ui/profile.js","js/ui/quiz.js","js/ui/shell.js","js/update.js","js/version.js","js/web-app.js","js/web-share.js","logo.svg","manifest.webmanifest","styles/base.css","styles/components.css","styles/quiz.css","styles/screens.css","styles/tokens.css","vendor/fflate.min.js"];
const CACHE = 'kaduraglan-' + VERSION;
const DEV = VERSION === 'dev';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    if (!DEV) {
      const cache = await caches.open(CACHE);
      await cache.addAll(['./'].concat(FILES).map((f) => new Request(f, { cache: 'reload' })));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('kaduraglan-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.location).pathname)) return;
  event.respondWith(DEV ? fromNetwork(req) : fromCache(req));
});

async function fromCache(req) {
  const cache = await caches.open(CACHE);
  const key = req.mode === 'navigate' ? './' : req;
  const hit = await cache.match(key, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (e) {
    return Response.error();
  }
}

async function fromNetwork(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: true })) || Response.error();
  }
}
