// 日期工具：统一以 YYYY-MM-DD 字符串在业务中流转

/** 当前日期 YYYY-MM-DD（本地时区） */
export function todayISO(): string {
  const d = new Date()
  return toISO(d)
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** YYYY-MM-DD → Date（本地零点） */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 是否同一天 */
export function isSameDay(a: string, b: string): boolean {
  return a === b
}

/** M月D日，用于首页分组展示 */
export function fmtMonthDay(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}月${Number(d)}日`
}

/** YYYY年MM月DD日 */
export function fmtFull(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

/** 月份键 YYYY-MM */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

/** 是否当前月 */
export function isThisMonth(iso: string): boolean {
  return monthKey(iso) === monthKey(todayISO())
}

/** 距离目标日期还有多少天（正数=未来，负数=已过） */
export function daysUntil(iso: string): number {
  const target = parseISO(iso).getTime()
  const now = parseISO(todayISO()).getTime()
  return Math.round((target - now) / 86400000)
}

/** 两个日期之间相隔的天数（b - a，整数，带符号；a 晚于 b 则为负） */
export function daysBetween(startISO: string, endISO: string): number {
  const a = parseISO(startISO).getTime()
  const b = parseISO(endISO).getTime()
  if (!isFinite(a) || !isFinite(b)) return 0
  return Math.round((b - a) / 86400000)
}

/** 两个日期之间相隔的年数（用于存款利息计算）
 *  采用日历算法（年 + 月 + 日），避免闰年多出一天导致的误差，
 *  例如 2026-08-14 ~ 2029-08-14 精确为 3.0 年。 */
export function yearsBetween(startISO: string, endISO: string): number {
  const a = parseISO(startISO)
  const b = parseISO(endISO)
  if (b.getTime() <= a.getTime()) return 0
  let years = b.getFullYear() - a.getFullYear()
  let months = b.getMonth() - a.getMonth()
  let days = b.getDate() - a.getDate()
  if (days < 0) {
    months -= 1
    const prevMonth = new Date(b.getFullYear(), b.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return years + (months + days / 30) / 12
}

/** 宽松解析多种日期写法为 YYYY-MM-DD；无法识别返回 null。
 *  支持：2026-08-05 / 2026/8/5 / 2026.8.5 / 2026年8月5日 / 8/5/2026 / 2026-08-05 12:00:00 */
export function parseDate(input: string | null | undefined): string | null {
  if (input == null) return null
  let s = String(input).trim()
  if (!s) return null
  // 去掉尾随时间部分
  s = s.replace(/\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*$/, '')
  s = s.replace(/[日号]/g, '')
  const toYMD = (y: number, m: number, d: number): string | null => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    const dt = new Date(y, m - 1, d)
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  let m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
  if (m) return toYMD(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})/)
  if (m) return toYMD(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
  if (m) return toYMD(+m[3], +m[1], +m[2])
  return null
}
