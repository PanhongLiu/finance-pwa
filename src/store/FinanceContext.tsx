import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Deposit, DepositInput, Investment, InvestmentInput, ReserveFund, ReserveInput } from '../types'
import * as finance from '../services/finance'
import type { AllData } from '../services/finance'
import { computePortfolio, type PortfolioSummary } from '../services/calc'

interface FinanceContextValue {
  loading: boolean
  deposits: Deposit[]
  investments: Investment[]
  reserveFunds: ReserveFund[]
  portfolio: PortfolioSummary
  reload: () => Promise<void>
  // 存款 / 理财（由「记一笔」同步写入）
  addDeposit: (i: DepositInput) => Promise<void>
  updateDeposit: (id: string, i: DepositInput) => Promise<void>
  deleteDeposit: (id: string) => Promise<void>
  addInvestment: (i: InvestmentInput) => Promise<void>
  updateInvestment: (id: string, i: InvestmentInput) => Promise<void>
  deleteInvestment: (id: string) => Promise<void>
  // 备用金
  addReserve: (i: ReserveInput) => Promise<void>
  updateReserve: (id: string, i: ReserveInput) => Promise<void>
  deleteReserve: (id: string) => Promise<void>
  reserveSetAmount: (reserveId: string, newAmount: number, date: string, note: string) => Promise<void>
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

  const portfolio = useMemo(
    () => computePortfolio(data.deposits, data.investments, data.reserveFunds),
    [data.deposits, data.investments, data.reserveFunds]
  )

  const wrap = useCallback(async (fn: () => Promise<void>) => {
    await fn()
    await reload()
  }, [reload])

  const value: FinanceContextValue = {
    loading,
    deposits: data.deposits,
    investments: data.investments,
    reserveFunds: data.reserveFunds,
    portfolio,
    reload,
    addDeposit: (i) => wrap(() => finance.addDeposit(i)),
    updateDeposit: (id, i) => wrap(() => finance.updateDeposit(id, i)),
    deleteDeposit: (id) => wrap(() => finance.deleteDeposit(id)),
    addInvestment: (i) => wrap(() => finance.addInvestment(i)),
    updateInvestment: (id, i) => wrap(() => finance.updateInvestment(id, i)),
    deleteInvestment: (id) => wrap(() => finance.deleteInvestment(id)),
    addReserve: (i) => wrap(() => finance.addReserve(i)),
    updateReserve: (id, i) => wrap(() => finance.updateReserve(id, i)),
    deleteReserve: (id) => wrap(() => finance.deleteReserve(id)),
    reserveSetAmount: (rid, amount, date, note) => wrap(() => finance.reserveAdjust(rid, amount, date, note)),
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
