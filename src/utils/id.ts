// ID 生成
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

// 当前时间戳（ISO 字符串）
export function nowISO(): string {
  return new Date().toISOString()
}
