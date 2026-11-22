// Service worker: permite instalar o jogo como app e jogar sem internet.
//
// Estratégia "rede primeiro": sempre tenta baixar a versão mais nova do arquivo
// (assim, enquanto você desenvolve, as mudanças aparecem na hora). Se não houver
// internet, usa a cópia guardada da última vez. Cada arquivo é guardado na
// primeira vez que o jogo o usa.
//
// Mudou algo grande e quer forçar todos a baixarem de novo? Troque o número abaixo.

const CACHE = 'ecos-de-lumora-v2'; // v2 = versão 1.4 (5 regiões)
const CORE = ['./', './index.html', './css/style.css', './js/main.js', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
