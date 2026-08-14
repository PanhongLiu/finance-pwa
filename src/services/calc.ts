// 持仓 / 收益 / 组合计算（业务与 UI 分离）
import type { DepositRecord, Position } from '../types'
import { CATEGORY_COLORS } from '../types'
import { daysBetween } from '../utils/date'

/** 距上次年化率（%）：仅「理财/更新」类（market）可计算，按复利折算到一年 */
export function annualized(pos: Position): number | null {
  if (pos.gainType !== 'market') return null
  const days = Math.max(0, daysBetween(pos.prevDate, pos.date))
  if (days <= 0 || pos.prevAmount <= 0) return null
  const gain = pos.amount - pos.prevAmount - (pos.lastDeposit || 0)
  return (gain / pos.prevAmount / days) * 365 * 100
}

export interface CategorySlice {
  label: string
  value: number // 分
  color: string
}

export interface PortfolioSummary {
  totalMarket: number // 持仓总市值（分）
  projectCount: number // 持仓项目数
  cumulativeGain: number // 累计收益（分，market 类 lastGain 合计）
  portfolioAnnualized: number // 综合年化率（%）
  categories: CategorySlice[] // 按分类的当前市值（环形图）
}

/** 组合汇总：基于统一持仓模型 */
export function computePortfolio(positions: Position[]): PortfolioSummary {
  let total = 0
  let cumulativeGain = 0
  let wGainNum = 0 // Σ(收益 × 上次金额) 用于综合年化分子
  let wDaysNum = 0 // Σ(上次金额 × 天数) 用于综合年化分母
  const catMap = new Map<string, number>()

  for (const p of positions) {
    total += p.amount
    if (p.gainType === 'market') {
      cumulativeGain += p.lastGain
      const days = Math.max(1, daysBetween(p.prevDate, p.date))
      const gain = p.amount - p.prevAmount - (p.lastDeposit || 0)
      if (p.prevAmount > 0) {
        wGainNum += gain
        wDaysNum += p.prevAmount * days
      }
    }
    catMap.set(p.category, (catMap.get(p.category) || 0) + p.amount)
  }

  const categories: CategorySlice[] = Array.from(catMap.entries())
    .map(([label, value]) => ({ label, value, color: CATEGORY_COLORS[label] || '#94a3b8' }))
    .filter((c) => c.value !== 0)
    .sort((a, b) => b.value - a.value)

  const portfolioAnnualized = wDaysNum > 0 ? (wGainNum / wDaysNum) * 365 * 100 : 0

  return { totalMarket: total, projectCount: positions.length, cumulativeGain, portfolioAnnualized, categories }
}

export interface MonthBar {
  month: string // YYYY-MM
  amount: number // 分
}

/** 月度存款趋势（取最近 N 个月） */
export function monthlyTrend(records: DepositRecord[], months = 6): MonthBar[] {
  const map = new Map<string, number>()
  for (const r of records) {
    const m = r.date.slice(0, 7)
    map.set(m, (map.get(m) || 0) + r.amount)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-months)
    .map(([month, amount]) => ({ month, amount }))
}

export function percent(part: number, total: number): number {
  if (total === 0) return 0
  return (part / total) * 100
}
