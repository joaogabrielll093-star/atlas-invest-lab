/* ATLAS INVEST LAB — service worker.
 * Estratégia "rede primeiro": sempre tenta buscar a versão mais nova e só usa a cópia
 * local quando está sem conexão. Requisições para APIs externas não são interceptadas. */
const CACHE = 'atlas-v2.1.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/css/app.css',
  'assets/js/core.js', 'assets/js/indicators.js', 'assets/js/backtest.js', 'assets/js/journal.js',
  'assets/js/chart.js', 'assets/js/data.js', 'assets/js/app.js',
  'assets/icons/icon.svg', 'assets/icons/icon-180.png', 'assets/icons/icon-192.png', 'assets/fonts/archivo-var.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const isData = url.pathname.endsWith('/data/market.json');
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        // O snapshot é guardado sem parâmetros, para servir de reserva offline.
        caches.open(CACHE).then((c) => c.put(isData ? new Request(url.origin + url.pathname) : req, copy));
      }
      return res;
    }).catch(() => caches.match(isData ? url.origin + url.pathname : req).then((r) => r || caches.match('index.html'))),
  );
});
