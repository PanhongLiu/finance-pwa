import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GoalInput, Position, RecordInput, ReserveGoal, DepositRecord } from '../types'
import * as finance from '../services/finance'
import type { AllData } from '../services/finance'
import { computePortfolio, type PortfolioSummary } from '../services/calc'

interface FinanceContextValue {
  loading: boolean
  positions: Position[]
  goals: ReserveGoal[]
  records: DepositRecord[]
  portfolio: PortfolioSummary
  reload: () => Promise<void>
  // 记一笔
  addRecord: (i: RecordInput) => Promise<void>
  // 持仓
  updatePositionAmount: (id: string, newAmount: number, deposit: number, date: string) => Promise<void>
  deletePosition: (id: string) => Promise<void>
  // 备用金目标
  addGoal: (i: GoalInput) => Promise<void>
  updateGoalProgress: (id: string, amount: number, date: string) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  // 数据
  exportAll: () => Promise<finance.BackupFile>
  importAll: (file: finance.BackupFile) => Promise<void>
  clearAllData: () => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AllData>({ positions: [], goals: [], records: [] })

  const reload = useCallback(async () => {
    const d = await finance.loadAll()
    setData(d)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await finance.migrateLegacy()
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

  const portfolio = useMemo(() => computePortfolio(data.positions), [data.positions])

  const wrap = useCallback(async (fn: () => Promise<void>) => {
    await fn()
    await reload()
  }, [reload])

  const value: FinanceContextValue = {
    loading,
    positions: data.positions,
    goals: data.goals,
    records: data.records,
    portfolio,
    reload,
    addRecord: (i) => wrap(() => finance.addRecord(i)),
    updatePositionAmount: (id, newAmount, deposit, date) => wrap(() => finance.updatePositionAmount(id, newAmount, deposit, date)),
    deletePosition: (id) => wrap(() => finance.deletePosition(id)),
    addGoal: (i) => wrap(() => finance.addGoal(i)),
    updateGoalProgress: (id, amount, date) => wrap(() => finance.updateGoalProgress(id, amount, date)),
    deleteGoal: (id) => wrap(() => finance.deleteGoal(id)),
    exportAll: () => finance.exportAll(),
    importAll: (file) => wrap(() => finance.importAll(file)),
    clearAllData: async () => {
      await finance.clearAllData()
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
