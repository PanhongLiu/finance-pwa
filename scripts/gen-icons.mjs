import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
function makePNG(size, draw) {
  const w = size
  const h = size
  const stride = 1 + w * 4
  const raw = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const off = y * stride
    raw[off] = 0
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = draw(x, y, size)
      const p = off + 1 + x * 4
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
      raw[p + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function inRoundRect(x, y, size, r) {
  const rx = Math.min(x, size - 1 - x)
  const ry = Math.min(y, size - 1 - y)
  if (rx >= r || ry >= r) return true
  const dx = r - rx
  const dy = r - ry
  return dx * dx + dy * dy <= r * r
}
function inRoundRectCentered(x, y, s, r, cxc, cyc, half) {
  const left = cxc - half
  const right = cxc + half
  const top = cyc - half
  const bottom = cyc + half
  if (!(x >= left && x <= right && y >= top && y <= bottom)) return false
  const rx = Math.min(x - left, right - x)
  const ry = Math.min(y - top, bottom - y)
  if (rx >= r || ry >= r) return true
  const dx = r - rx
  const dy = r - ry
  return dx * dx + dy * dy <= r * r
}
function inCircle(x, y, cx, cy, rad) {
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= rad * rad
}

function drawIcon(size) {
  const r = Math.floor(size * 0.22)
  const brand = [10, 132, 255]
  const white = [255, 255, 255]
  const half = size * 0.30
  const wr = Math.floor(size * 0.16)
  const cxc = size / 2
  const cyc = size / 2
  return (x, y, s) => {
    if (!inRoundRect(x, y, s, r)) return [0, 0, 0, 0]
    if (inRoundRectCentered(x, y, s, wr, cxc, cyc, half)) {
      if (inCircle(x, y, cxc, cyc - s * 0.02, s * 0.16)) return brand
      const bx = cxc - s * 0.16
      const by = cyc + s * 0.12
      const bw = s * 0.32
      const bh = s * 0.07
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return brand
      return [255, 255, 255, 255]
    }
    return [brand[0], brand[1], brand[2], 255]
  }
}

writeFileSync(join(outDir, 'icon-192.png'), makePNG(192, drawIcon(192)))
writeFileSync(join(outDir, 'icon-512.png'), makePNG(512, drawIcon(512)))
writeFileSync(join(outDir, 'apple-touch-icon.png'), makePNG(180, drawIcon(180)))
console.log('icons generated: icon-192.png, icon-512.png, apple-touch-icon.png')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="42" fill="#0a84ff"/><rect x="48" y="62" width="96" height="68" rx="14" fill="#ffffff"/><circle cx="96" cy="92" r="20" fill="#0a84ff"/><rect x="70" y="116" width="52" height="11" rx="5" fill="#0a84ff"/></svg>`
writeFileSync(join(outDir, 'favicon.svg'), svg)
console.log('favicon.svg generated')
