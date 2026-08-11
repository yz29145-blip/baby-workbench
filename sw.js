/* 宝宝育儿工作台 · 离线缓存 */
const CACHE = 'baby-wb-v6.44';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

// 安装：逐个缓存，单个失败不影响整体；保证 SW 能激活
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(
        ASSETS.map(url =>
          c.add(url).catch(err => console.warn('[SW] 预缓存失败:', url, err))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

// 激活：清旧缓存并立即接管页面
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 命中缓存后回源更新（stale-while-revalidate），导航请求优先用缓存实现秒开
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return; // 外部接口（Gist 同步）直接走网络

  const isNavigation = e.request.mode === 'navigate';

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);

      // 1) 导航请求：先给缓存，后台再 fetch 一次检查更新
      if (isNavigation) {
        const network = fetch(e.request)
          .then(r => { cache.put(e.request, r.clone()); return r; })
          .catch(() => cached);
        return cached || network;
      }

      // 2) 静态资源：优先用缓存，同时后台更新
      if (cached) {
        fetch(e.request)
          .then(r => cache.put(e.request, r.clone()))
          .catch(() => {});
        return cached;
      }

      // 3) 缓存未命中：走网络，失败则尝试回退首页
      return fetch(e.request)
        .then(r => { cache.put(e.request, r.clone()); return r; })
        .catch(() => caches.match('./index.html'));
    })
  );
});

// 支持主线程触发立即接管
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
