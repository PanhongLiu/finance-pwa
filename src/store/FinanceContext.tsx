import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GoalInput, Position, RecordInput, ReserveGoal, DepositRecord } from '../types'
import * as finance from '../services/finance'
import type { AllData } from '../services/finance'
import { computePortfolio, type PortfolioSummary } from '../services/calc'

interface FinanceContextValue {
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  positions: Position[]
  goals: ReserveGoal[]
  records: DepositRecord[]
  portfolio: PortfolioSummary
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
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AllData>({ positions: [], goals: [], records: [] })

  const reload = useCallback(async () => {
    const d = await finance.loadAll()
    setData(d)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await finance.migrateLegacy()
        await finance.seedIfEmpty()
        const d = await finance.loadAll()
        if (mounted) {
          setData(d)
          setError(null)
        }
      } catch (e) {
        console.error('[FinanceContext] 数据加载失败', e)
        if (mounted) setError(e instanceof Error ? e.message : '数据加载失败')
      } finally {
        // 无论成功或失败都结束加载，避免首页永远显示「加载中」
        if (mounted) setLoading(false)
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
    error,
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
