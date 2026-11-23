// App: rete prima (così gli aggiornamenti arrivano), cache se offline. Font: cache prima.
const SHELL = 'tsf-shell-v1', FONTS = 'tsf-fonts-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => (await c.match(r, { ignoreVary: true })) ||
      fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; })));
  } else if (u.hostname === 'fonts.googleapis.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(r, { ignoreVary: true });
      const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => hit || Response.error());
      return hit || net;
    }));
  } else if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true })));
  }
});
