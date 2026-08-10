/* 宝宝育儿工作台 · 离线缓存 */
const CACHE = 'baby-wb-v6.37';
const ASSETS = ['./','./index.html','./style.css','./data.js','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return; // 同步接口直接走网络
  // 联网优先 + 强制绕过 HTTP 缓存（cache:'reload'），保证每次部署新版本都能到达用户；
  // 离线时回退到缓存，保证 PWA 仍可用。
  e.respondWith(
    fetch(e.request, {cache:'reload'}).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
