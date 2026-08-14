// 资产与收益计算逻辑（业务与 UI 分离）
import type { Deposit, Investment, ReserveFund } from '../types'
import { daysBetween, todayISO } from '../utils/date'

// 分类配色（克制、专业，按顺序循环使用）
export const CATEGORY_PALETTE = [
  '#0a84ff',
  '#30b0c7',
  '#34c759',
  '#ff9f0a',
  '#ff3b30',
  '#af52de',
  '#5e5ce6',
  '#ff6482'
]

/** 统一资产行：存款与理财共用一套计算口径 */
export interface AssetRow {
  id: string
  kind: 'deposit' | 'wealth'
  category: string // 分类/类型
  name: string
  institution: string // 银行/机构（存款用）
  principal: number // 本金 / 累计投入（分）
  currentValue: number // 当前金额 / 市值（分，可编辑）
  annualRate: number // 约定年化（%）
  startDate: string
  termDays: number | null // 期限天数（理财/活期为 null）
  realized: number // 已实现收益（分）
}

export function depositToRow(d: Deposit): AssetRow {
  const currentValue = typeof d.currentAmount === 'number' ? d.currentAmount : d.principal
  const termDays = d.endDate ? Math.max(0, daysBetween(d.startDate, d.endDate)) : null
  return {
    id: d.id,
    kind: 'deposit',
    category: d.type,
    name: d.name,
    institution: d.bank,
    principal: d.principal,
    currentValue,
    annualRate: d.annualRate,
    startDate: d.startDate,
    termDays,
    realized: 0
  }
}

export function investmentToRow(i: Investment): AssetRow {
  return {
    id: i.id,
    kind: 'wealth',
    category: i.type,
    name: i.name,
    institution: '',
    principal: i.investedAmount,
    currentValue: i.currentValue,
    annualRate: typeof i.annualRate === 'number' ? i.annualRate : 0,
    startDate: i.purchaseDate,
    termDays: null,
    realized: i.realizedProfit
  }
}

/** 当前收益 = 当前金额 + 已实现收益 − 本金 */
export function assetGainNow(r: AssetRow): number {
  return r.currentValue + r.realized - r.principal
}

/** 总收益 = 有固定期限时按约定利率算到期总利息；活期/理财按当前收益（开放式无到期概念） */
export function assetGainTotal(r: AssetRow): number {
  if (r.termDays != null && r.termDays > 0) {
    return Math.round(r.principal * (r.annualRate / 100) * (r.termDays / 365))
  }
  return assetGainNow(r)
}

/** 已持有天数（>=0） */
export function assetHeldDays(r: AssetRow): number {
  return Math.max(0, daysBetween(r.startDate, todayISO()))
}

/** 单笔当前年化率 = 当前收益/本金 折算到一年 */
export function assetAnnualizedNow(r: AssetRow): number {
  const held = assetHeldDays(r)
  if (r.principal <= 0 || held <= 0) return 0
  return (assetGainNow(r) / r.principal) * (365 / held)
}

/** 单笔总年化率：有固定期限按到期口径；开放式按已持有天数折算 */
export function assetAnnualizedTotal(r: AssetRow): number {
  if (r.principal <= 0) return 0
  const gTotal = assetGainTotal(r)
  if (r.termDays != null && r.termDays > 0) {
    return (gTotal / r.principal) * (365 / r.termDays)
  }
  const held = assetHeldDays(r)
  if (held <= 0) return 0
  return (gTotal / r.principal) * (365 / held)
}

export interface CategorySlice {
  label: string
  value: number
  color: string
  kind: 'deposit' | 'wealth'
}

export interface PortfolioSummary {
  totalPrincipal: number // 存款本金 + 理财累计投入
  depositPrincipal: number // 存款本金合计
  wealthInvested: number // 理财累计投入合计
  depositCurrent: number // 存款当前金额合计
  wealthCurrent: number // 理财当前市值合计
  reserveTotal: number // 备用金当前金额合计
  totalAsset: number // 存款当前 + 理财当前 + 备用金
  currentGain: number // 当前收益
  totalGain: number // 总收益
  currentAnnualized: number // 当前年化率（%）
  totalAnnualized: number // 总年化率（%）
  depositCount: number
  wealthCount: number
  reserveCount: number
  categories: CategorySlice[] // 按分类/类型的当前价值占比（环形图）
}

/** 组合汇总：跨存款 + 理财 + 备用金 */
export function computePortfolio(
  deposits: Deposit[],
  investments: Investment[],
  reserveFunds: ReserveFund[]
): PortfolioSummary {
  const rows = [...deposits.map(depositToRow), ...investments.map(investmentToRow)]
  let totalPrincipal = 0
  let depositPrincipal = 0
  let wealthInvested = 0
  let depositCurrent = 0
  let wealthCurrent = 0
  let currentGain = 0
  let totalGain = 0
  let weightedRateNum = 0 // Σ(本金 × 年化)，用于总年化率（仅统计有年化的）
  let weightedRateDen = 0
  let weightedHeldNum = 0 // Σ(本金 × 持有天数)，用于当前年化率分母
  const catMap = new Map<string, { value: number; kind: 'deposit' | 'wealth' }>()

  for (const r of rows) {
    totalPrincipal += r.principal
    if (r.kind === 'deposit') {
      depositPrincipal += r.principal
      depositCurrent += r.currentValue
    } else {
      wealthInvested += r.principal
      wealthCurrent += r.currentValue
    }
    const gNow = assetGainNow(r)
    const gTotal = assetGainTotal(r)
    currentGain += gNow
    totalGain += gTotal
    const held = assetHeldDays(r)
    weightedHeldNum += r.principal * held
    if (r.annualRate > 0) {
      weightedRateNum += r.principal * r.annualRate
      weightedRateDen += r.principal
    }
    const key = `${r.kind}:${r.category}`
    const prev = catMap.get(key) ?? { value: 0, kind: r.kind }
    prev.value += r.currentValue
    catMap.set(key, prev)
  }

  const reserveTotal = reserveFunds.reduce((s, r) => s + r.currentAmount, 0)
  const totalAsset = depositCurrent + wealthCurrent + reserveTotal
  const totalAnnualized = weightedRateDen > 0 ? weightedRateNum / weightedRateDen : 0
  const currentAnnualized = weightedHeldNum > 0 ? (currentGain * 365) / weightedHeldNum : 0
  const categories: CategorySlice[] = Array.from(catMap.entries())
    .map(([key, v], idx) => {
      const [kind, label] = key.split(':') as ['deposit' | 'wealth', string]
      return { label, value: v.value, kind: v.kind, color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length] }
    })
    .filter((c) => c.value !== 0)
    .sort((a, b) => b.value - a.value)

  return {
    totalPrincipal,
    depositPrincipal,
    wealthInvested,
    depositCurrent,
    wealthCurrent,
    reserveTotal,
    totalAsset,
    currentGain,
    totalGain,
    currentAnnualized,
    totalAnnualized,
    depositCount: deposits.length,
    wealthCount: investments.length,
    reserveCount: reserveFunds.length,
    categories
  }
}

export function percent(part: number, total: number): number {
  if (total === 0) return 0
  return (part / total) * 100
}
