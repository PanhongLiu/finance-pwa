import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Account,
  Deposit,
  DepositInput,
  ExpenseInput,
  IncomeInput,
  Investment,
  InvestmentInput,
  LocationRef,
  ReserveFund,
  ReserveInput,
  Transaction,
  TransferInput
} from '../types'
import * as finance from '../services/finance'
import type { AllData } from '../services/finance'
import { computeTotals, monthlyChange, type AssetTotals } from '../services/calc'

interface FinanceContextValue {
  loading: boolean
  accounts: Account[]
  transactions: Transaction[]
  deposits: Deposit[]
  investments: Investment[]
  reserveFunds: ReserveFund[]
  totals: AssetTotals
  monthChange: number
  defaultAccountId: string | undefined
  reload: () => Promise<void>
  // 记一笔
  addIncome: (i: IncomeInput) => Promise<void>
  addExpense: (i: ExpenseInput) => Promise<void>
  addTransfer: (i: TransferInput) => Promise<void>
  updateTransaction: (id: string, input: IncomeInput | ExpenseInput | TransferInput, type: Transaction['type']) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  // 存款
  addDeposit: (i: DepositInput) => Promise<void>
  updateDeposit: (id: string, i: DepositInput) => Promise<void>
  deleteDeposit: (id: string) => Promise<void>
  // 理财
  addInvestment: (i: InvestmentInput) => Promise<void>
  updateInvestment: (id: string, i: InvestmentInput) => Promise<void>
  deleteInvestment: (id: string) => Promise<void>
  // 备用金
  addReserve: (i: ReserveInput) => Promise<void>
  updateReserve: (id: string, i: ReserveInput) => Promise<void>
  deleteReserve: (id: string) => Promise<void>
  reserveTransferIn: (reserveId: string, from: LocationRef, amount: number, date: string, note?: string) => Promise<void>
  reserveTransferOut: (reserveId: string, to: LocationRef, amount: number, date: string, note?: string) => Promise<void>
  reserveAdjust: (reserveId: string, newAmount: number, date: string, note: string) => Promise<void>
  // 数据
  exportAll: () => Promise<finance.BackupFile>
  importAll: (file: finance.BackupFile) => Promise<void>
  clearAllData: () => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AllData>({
    accounts: [],
    transactions: [],
    deposits: [],
    investments: [],
    reserveFunds: []
  })

  const reload = useCallback(async () => {
    const d = await finance.loadAll()
    setData(d)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await finance.seedIfEmpty()
      const d = await finance.loadAll()
      if (mounted) {
        setData(d)
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const totals = useMemo(
    () => computeTotals(data.accounts, data.deposits, data.investments, data.reserveFunds),
    [data]
  )
  const monthChange = useMemo(() => monthlyChange(data.transactions), [data.transactions])
  const defaultAccountId = useMemo(() => {
    const cur = data.accounts.find((a) => a.type === 'current')
    return (cur ?? data.accounts[0])?.id
  }, [data.accounts])

  const wrap = useCallback(async (fn: () => Promise<void>) => {
    await fn()
    await reload()
  }, [reload])

  const value: FinanceContextValue = {
    loading,
    accounts: data.accounts,
    transactions: data.transactions,
    deposits: data.deposits,
    investments: data.investments,
    reserveFunds: data.reserveFunds,
    totals,
    monthChange,
    defaultAccountId,
    reload,
    addIncome: (i) => wrap(() => finance.addIncome(i)),
    addExpense: (i) => wrap(() => finance.addExpense(i)),
    addTransfer: (i) => wrap(() => finance.addTransfer(i)),
    updateTransaction: (id, input, type) => wrap(() => finance.updateTransaction(id, input, type)),
    deleteTransaction: (id) => wrap(() => finance.deleteTransaction(id)),
    addDeposit: (i) => wrap(() => finance.addDeposit(i)),
    updateDeposit: (id, i) => wrap(() => finance.updateDeposit(id, i)),
    deleteDeposit: (id) => wrap(() => finance.deleteDeposit(id)),
    addInvestment: (i) => wrap(() => finance.addInvestment(i)),
    updateInvestment: (id, i) => wrap(() => finance.updateInvestment(id, i)),
    deleteInvestment: (id) => wrap(() => finance.deleteInvestment(id)),
    addReserve: (i) => wrap(() => finance.addReserve(i)),
    updateReserve: (id, i) => wrap(() => finance.updateReserve(id, i)),
    deleteReserve: (id) => wrap(() => finance.deleteReserve(id)),
    reserveTransferIn: (rid, from, amount, date, note) => wrap(() => finance.reserveTransferIn(rid, from, amount, date, note)),
    reserveTransferOut: (rid, to, amount, date, note) => wrap(() => finance.reserveTransferOut(rid, to, amount, date, note)),
    reserveAdjust: (rid, newAmount, date, note) => wrap(() => finance.reserveAdjust(rid, newAmount, date, note)),
    exportAll: () => finance.exportAll(),
    importAll: (file) => wrap(() => finance.importAll(file)),
    clearAllData: async () => {
      await finance.clearAllData()
      await finance.seedIfEmpty()
      await reload()
    }
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance 必须在 FinanceProvider 内使用')
  return ctx
}
