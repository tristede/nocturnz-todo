// Service worker minimal : l'appli s'ouvre hors ligne (les données, elles, sont gardées par le cache Firestore).
const CACHE = 'todo-v3';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/__/') || u.pathname === '/version.json') return;
  // plan du parc : gardé pour l'ouvrir sans réseau (avant la règle des pages, sinon il écraserait l'accueil en cache)
  if (u.pathname.startsWith('/maps/')) {
    e.respondWith(caches.match(u.pathname).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(u.pathname, c)); } return r; })));
    return;
  }
  if (e.request.mode === 'navigate') {
    // page : réseau d'abord, cache si hors ligne
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('/', c)); return r; }).catch(() => caches.match('/')));
    return;
  }
  // fichiers versionnés (assets/…) : cache d'abord
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok && (u.pathname.startsWith('/assets/') || SHELL.includes(u.pathname))) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); }
    return r;
  })));
});
