// 金额工具：所有金额以「整数分」为单位存储，避免浮点误差

/** 元（可带小数或字符串）→ 分（整数） */
export function toCents(yuan: number | string): number {
  const n = typeof yuan === 'string' ? parseFloat(yuan) : yuan
  if (!isFinite(n) || n < 0) return 0
  // 乘以 100 用整数运算，避免 0.1+0.2 类误差
  return Math.round((n + Number.EPSILON) * 100)
}

/** 分 → 元（浮点，仅用于展示计算） */
export function fromCents(cents: number): number {
  return cents / 100
}

function thousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 分 → ¥1,234.50 */
export function formatCNY(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(Math.round(cents))
  const yuan = Math.floor(abs / 100)
  const frac = abs % 100
  const s = `${thousands(String(yuan))}.${frac.toString().padStart(2, '0')}`
  return `${negative ? '-' : ''}¥${s}`
}

/** 带符号：+¥1,234.50 / -¥1,234.50 */
export function formatSignedCNY(cents: number): string {
  const sign = cents >= 0 ? '+' : '-'
  return `${sign}${formatCNY(Math.abs(cents))}`
}

/** 不带符号的纯数字（用于输入框回显等） */
export function formatYuan(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(Math.round(cents))
  const yuan = Math.floor(abs / 100)
  const frac = abs % 100
  return `${negative ? '-' : ''}${thousands(String(yuan))}.${frac.toString().padStart(2, '0')}`
}

/** 百分比格式化，自动补正负号与 %，如 +2.35% / -1.20% / 0.00% */
export function formatPercent(rate: number): string {
  const sign = rate > 0 ? '+' : ''
  return `${sign}${rate.toFixed(2)}%`
}
