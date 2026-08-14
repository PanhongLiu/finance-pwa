// 全局类型定义与常量

// ===================== 实体类型 =====================

export interface Account {
  id: string
  name: string
  type: string // 'current' | 自定义
  balance: number // 单位：分（整数）
  currency: string
  createdAt: string
  updatedAt: string
}

export type TxType = 'income' | 'expense' | 'transfer'

export type LocationKind = 'account' | 'reserve' | 'investment' | 'deposit'

export interface LocationRef {
  kind: LocationKind
  id: string
}

export interface Transaction {
  id: string
  type: TxType
  amount: number // 分，始终为正
  category: string
  // 收入/支出影响的账户
  accountId?: string
  // 转账的源/目标（可为账户、备用金、理财、存款）
  from?: LocationRef
  to?: LocationRef
  date: string // YYYY-MM-DD
  note: string
  createdAt: string
  updatedAt: string
}

export type AssetKind = 'deposit' | 'wealth'

export interface Deposit {
  id: string
  bank: string
  name: string
  type: string // 活期存款 | 定期存款 | 大额存单 | 其他存款
  principal: number // 本金，分
  annualRate: number // 年利率，如 2.5 表示 2.5%
  startDate: string
  endDate: string
  currentAmount: number // 当前金额（分，可手动更新，默认等于本金）
  note: string
  createdAt: string
  updatedAt: string
}

export interface Investment {
  id: string
  name: string
  code: string
  type: string // 基金 | ETF | 股票 | 债券 | 银行理财 | 其他投资
  investedAmount: number // 累计投入，分
  currentValue: number // 当前市值，分（手动维护）
  realizedProfit: number // 已实现收益，分
  unrealizedProfit: number // 未实现收益，分
  fee: number // 手续费，分
  annualRate: number // 约定年化 / 业绩比较基准（%，可选，默认 0）
  purchaseDate: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface ReserveFund {
  id: string
  name: string
  targetAmount: number // 目标金额，分
  currentAmount: number // 当前金额，分
  accountId?: string // 所属现金账户（仅用于展示/归类，已弃用）
  note: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  id: string
  dbVersion: number
  seeded: boolean
  [key: string]: unknown
}

// ===================== 输入类型（表单用） =====================

export interface IncomeInput {
  amount: number
  category: string
  accountId: string
  date: string
  note: string
}

export interface ExpenseInput {
  amount: number
  category: string
  accountId: string
  date: string
  note: string
}

export interface TransferInput {
  from: LocationRef
  to: LocationRef
  amount: number
  date: string
  note: string
}

export interface DepositInput {
  bank: string
  name: string
  type: string
  principal: number
  annualRate: number
  startDate: string
  endDate: string
  currentAmount?: number // 当前金额，不填则等于本金
  note: string
}

export interface InvestmentInput {
  name: string
  code: string
  type: string
  investedAmount: number
  currentValue: number
  realizedProfit: number
  unrealizedProfit: number
  fee: number
  annualRate?: number // 约定年化，不填则 0
  purchaseDate: string
  note: string
}

export interface ReserveInput {
  name: string
  targetAmount: number
  currentAmount: number
  accountId?: string
  note: string
}

// ===================== 常量 =====================

export const INCOME_CATEGORIES = [
  '工资',
  '奖金',
  '利息',
  '投资收益',
  '其他收入'
] as const

export const EXPENSE_CATEGORIES = [
  '餐饮',
  '交通',
  '购物',
  '房租',
  '娱乐',
  '旅行',
  '医疗',
  '日用品',
  '其他支出'
] as const

export const DEPOSIT_TYPES = ['活期存款', '定期存款', '大额存单', '其他存款'] as const

export const INVESTMENT_TYPES = ['基金', 'ETF', '股票', '债券', '银行理财', '其他投资'] as const

export const RESERVE_TYPES = ['应急备用金', '旅行备用金', '日常备用金', '其他专项现金储备'] as const

export const DEFAULT_ACCOUNT_NAME = '活期'

// 资产结构配色（克制、专业）
export const ASSET_COLORS = {
  current: '#0a84ff',
  deposit: '#30b0c7',
  investment: '#ff9f0a',
  reserve: '#34c759'
} as const
