// 急診物語 Service Worker：離線可玩；先回快取、背景更新（stale-while-revalidate）
const CACHE = 'erquest-v0.4.1';
const CORE = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'lib/phaser.min.js', 'fonts/Cubic_11.woff2',
  'src/main.js', 'src/input.js', 'src/audio.js', 'src/art.js', 'src/ui.js', 'src/save.js', 'src/config.js', 'src/mapData.js',
  'src/progress.js', 'src/cosmetics.js', 'src/petArt.js', 'src/ecg.js',
  'src/engine/caseEngine.js',
  'src/engine/clerkEngine.js', 'src/engine/clerkMenus.js',
  'src/scenes/BootScene.js', 'src/scenes/TitleScene.js', 'src/scenes/MapScene.js', 'src/scenes/BattleScene.js', 'src/scenes/ReportScene.js',
  'src/scenes/ClerkBattleScene.js', 'src/scenes/IpassScene.js', 'src/scenes/DayReportScene.js', 'src/scenes/EvolutionScene.js',
  'data/cases/tension-ptx.json',
  ...['c01-af', 'c02-hf', 'c03-cap', 'c04-asthma', 'c05-pud', 'c06-panc', 'c07-pyelo', 'c08-aki', 'c09-appy', 'c10-chole', 'boss-imi']
    .map(id => `data/cases/clerk/${id}.json`),
  ...['p01-urosepsis', 'p02-dka', 'p03-ugib', 'p04-copd', 'p05-hyperk', 'p06-stroke', 'p07-hypogly', 'p08-anaphylaxis', 'p09-adhf', 'p10-cellulitis', 'boss-dissection']
    .map(id => `data/cases/pgy/${id}.json`),
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
