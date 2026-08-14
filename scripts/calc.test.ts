import {
  computeTotals,
  depositExpectedInterest,
  depositMaturityAmount,
  investmentTotalProfit,
  investmentRate,
  monthlyChange
} from '../src/services/calc'
import type { Account, Deposit, Investment, ReserveFund, Transaction } from '../src/types'

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed++
  } else {
    console.log('ok:', msg)
  }
}

const accounts: Account[] = [
  { id: 'a', name: '活期', type: 'current', balance: 80000, currency: 'CNY', createdAt: '', updatedAt: '' }
]
const deposits: Deposit[] = [
  {
    id: 'd',
    bank: '招行',
    name: '三年定期',
    type: '定期存款',
    principal: 100000,
    annualRate: 2.5,
    startDate: '2026-08-14',
    endDate: '2029-08-14',
    note: '',
    createdAt: '',
    updatedAt: ''
  }
]
const investments: Investment[] = [
  {
    id: 'i',
    name: '基金',
    code: '',
    type: '基金',
    investedAmount: 112000,
    currentValue: 120580,
    realizedProfit: 0,
    unrealizedProfit: 0,
    fee: 0,
    purchaseDate: '',
    note: '',
    createdAt: '',
    updatedAt: ''
  }
]
const reserves: ReserveFund[] = [
  { id: 'r', name: '应急', targetAmount: 50000, currentAmount: 20000, accountId: 'a', note: '', createdAt: '', updatedAt: '' }
]

const t = computeTotals(accounts, deposits, investments, reserves)
// 80000 + 100000 + 120580 + 20000 = 320580
assert(t.total === 320580, `总资产 = ${t.total} (期望 320580)`)
assert(t.current === 80000, '活期 = 80000')
assert(t.deposit === 100000, '存款 = 100000')
assert(t.investment === 120580, '理财 = 120580')
assert(t.reserve === 20000, '备用金 = 20000')

// 同一笔资金只计算一次：活期 100000 转 20000 到备用金
const acc2: Account[] = [
  { id: 'a', name: '活期', type: 'current', balance: 80000, currency: 'CNY', createdAt: '', updatedAt: '' }
]
const t2 = computeTotals(acc2, [], [], [{ id: 'r', name: '应急', targetAmount: 50000, currentAmount: 20000, accountId: 'a', note: '', createdAt: '', updatedAt: '' }])
assert(t2.total === 100000, `转账后总资产不变 = ${t2.total} (期望 100000)`)

assert(depositExpectedInterest(deposits[0]) === 7500, `预计利息 = ${depositExpectedInterest(deposits[0])} (期望 7500)`)
assert(depositMaturityAmount(deposits[0]) === 107500, `到期本息 = ${depositMaturityAmount(deposits[0])} (期望 107500)`)
assert(investmentTotalProfit(investments[0]) === 8580, `总收益 = ${investmentTotalProfit(investments[0])} (期望 8580)`)
assert(Math.abs(investmentRate(investments[0]) - 7.66) < 0.01, `收益率 = ${investmentRate(investments[0]).toFixed(2)}% (期望 7.66%)`)

const txs: Transaction[] = [
  { id: '1', type: 'income', amount: 2000000, category: '工资', accountId: 'a', date: '2026-08-14', note: '', createdAt: '', updatedAt: '' },
  { id: '2', type: 'expense', amount: 8500, category: '餐饮', accountId: 'a', date: '2026-08-14', note: '', createdAt: '', updatedAt: '' },
  { id: '3', type: 'transfer', amount: 500000, category: '转账', from: { kind: 'account', id: 'a' }, to: { kind: 'reserve', id: 'r' }, date: '2026-08-14', note: '', createdAt: '', updatedAt: '' }
]
// 本月变动 = 收入 - 支出 = 2000000 - 8500 = 1991500（转账不影响）
assert(monthlyChange(txs) === 1991500, `本月变动 = ${monthlyChange(txs)} (期望 1991500)`)

if (failed === 0) console.log('\n✅ 所有资产计算测试通过')
else {
  console.error(`\n❌ ${failed} 个测试失败`)
  process.exit(1)
}
