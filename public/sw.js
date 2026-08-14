// 极简 Service Worker：保证 PWA 可安装、可离线使用。
// 策略：导航请求网络优先、失败回退缓存；静态资源缓存优先并在命中后回填缓存。
// 适配任意子路径（如 GitHub Pages 的 /finance-pwa/），不使用以 "/" 开头的绝对路径。

// 根据 sw.js 自身位置推导站点基础路径，例如 /finance-pwa/
const BASE = self.location.pathname.replace(/sw\.js$/, '')
const CACHE = 'pf-cache-v2'
const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'favicon.svg',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'apple-touch-icon.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req.url, copy))
          return res
        })
        .catch(() => caches.match(req.url).then((m) => m || caches.match(BASE + 'index.html')))
    )
    return
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
    })
  )
})
