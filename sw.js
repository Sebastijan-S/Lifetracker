const CACHE_NAME = 'life-v1';
const URLS_TO_CACHE = ['./index.html','./app.js','./manifest.json'];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then(resp => {
      if (resp) return resp;
      return fetch(evt.request).then(res => {
        return caches.open(CACHE_NAME).then(cache => { cache.put(evt.request, res.clone()); return res; });
        }).catch(()=> caches.match('./index.html'));
    })
  );
});
