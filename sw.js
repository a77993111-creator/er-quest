// 急診物語 Service Worker：離線可玩；先回快取、背景更新（stale-while-revalidate）
const CACHE = 'erquest-v0.1.0';
const CORE = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'lib/phaser.min.js', 'fonts/Cubic_11.woff2',
  'src/main.js', 'src/input.js', 'src/audio.js', 'src/art.js', 'src/ui.js', 'src/save.js', 'src/config.js', 'src/mapData.js',
  'src/engine/caseEngine.js',
  'src/scenes/BootScene.js', 'src/scenes/TitleScene.js', 'src/scenes/MapScene.js', 'src/scenes/BattleScene.js', 'src/scenes/ReportScene.js',
  'data/cases/tension-ptx.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
