// 资产计算逻辑（统一工具函数，业务与 UI 分离）
import type { Account, Deposit, Investment, ReserveFund, Transaction } from '../types'
import { yearsBetween, daysUntil, isThisMonth } from '../utils/date'

export interface AssetBreakdown {
  current: number // 活期/现金账户余额合计
  deposit: number // 存款本金合计
  investment: number // 理财当前市值合计
  reserve: number // 备用金当前金额合计
}

export interface AssetTotals extends AssetBreakdown {
  total: number
}

/**
 * 总资产 = 所有账户现金余额 + 存款本金 + 理财当前市值 + 备用金余额
 * 由于转账/分配操作在扣减账户余额的同时增加对应资产，同一笔资金只计算一次。
 */
export function computeTotals(
  accounts: Account[],
  deposits: Deposit[],
  investments: Investment[],
  reserveFunds: ReserveFund[]
): AssetTotals {
  const current = accounts.reduce((s, a) => s + a.balance, 0)
  const deposit = deposits.reduce((s, d) => s + d.principal, 0)
  const investment = investments.reduce((s, i) => s + i.currentValue, 0)
  const reserve = reserveFunds.reduce((s, r) => s + r.currentAmount, 0)
  return { current, deposit, investment, reserve, total: current + deposit + investment + reserve }
}

export function percent(part: number, total: number): number {
  if (total === 0) return 0
  return (part / total) * 100
}

/** 本月资产变动 = 本月收入 - 本月支出（转账为内部划转，不影响总额） */
export function monthlyChange(transactions: Transaction[]): number {
  let change = 0
  for (const t of transactions) {
    if (!isThisMonth(t.date)) continue
    if (t.type === 'income') change += t.amount
    else if (t.type === 'expense') change -= t.amount
  }
  return change
}

/** 存款预计利息 = 本金 × 年利率 × 持有年数（按 365 天近似） */
export function depositExpectedInterest(d: Deposit): number {
  const years = yearsBetween(d.startDate, d.endDate)
  return Math.round((d.principal * (d.annualRate / 100) * years))
}

/** 存款到期本息 */
export function depositMaturityAmount(d: Deposit): number {
  return d.principal + depositExpectedInterest(d)
}

/** 距到期天数（负数表示已过到期日） */
export function depositDaysToMaturity(d: Deposit): number {
  return daysUntil(d.endDate)
}

/** 理财总收益 = 当前市值 + 已实现收益 - 累计投入 */
export function investmentTotalProfit(i: Investment): number {
  return i.currentValue + i.realizedProfit - i.investedAmount
}

/** 理财收益率 = 总收益 / 累计投入 × 100% */
export function investmentRate(i: Investment): number {
  if (i.investedAmount === 0) return 0
  return (investmentTotalProfit(i) / i.investedAmount) * 100
}
