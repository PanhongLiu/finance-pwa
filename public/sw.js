// 极简 Service Worker：保证 PWA 可安装、可离线使用。
// 策略：导航请求网络优先、失败回退缓存；静态资源缓存优先并在命中后回填缓存。
// 适配任意子路径（如 GitHub Pages 的 /finance-pwa/），不使用以 "/" 开头的绝对路径。
// v3 加固：绝不缓存 404（避免主屏幕图标在根域名解析异常时把 404 永久缓存）。

// 根据 sw.js 自身位置推导站点基础路径，例如 /finance-pwa/ 或根域名 /
const BASE = self.location.pathname.replace(/sw\.js$/, '')
const CACHE = 'pf-cache-v3'
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
    // 导航：网络优先；仅缓存 2xx；离线或失败一律回退到 index.html（绝不缓存 404）
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req.url, copy))
          }
          return res
        })
        .catch(() => caches.match(req.url).then((m) => m || caches.match(BASE + 'index.html')))
    )
    return
  }

  // 静态资源：缓存优先；未命中再网络，仅回填 2xx 的响应
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
