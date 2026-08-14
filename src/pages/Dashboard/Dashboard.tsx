import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { DoughnutChart } from '../../components/DoughnutChart'
import { TransactionItem } from '../../components/TransactionItem'
import { useFinance } from '../../store/FinanceContext'
import { formatCNY, formatSignedCNY } from '../../utils/money'
import { percent } from '../../services/calc'
import { ASSET_COLORS } from '../../types'
import type { Transaction } from '../../types'

export function Dashboard() {
  const navigate = useNavigate()
  const { totals, monthChange, transactions, loading } = useFinance()

  const recent = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
  }, [transactions])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of recent) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    return Array.from(map.entries())
  }, [recent])

  const slices = [
    { label: '活期', value: totals.current, color: ASSET_COLORS.current },
    { label: '存款', value: totals.deposit, color: ASSET_COLORS.deposit },
    { label: '理财', value: totals.investment, color: ASSET_COLORS.investment },
    { label: '备用金', value: totals.reserve, color: ASSET_COLORS.reserve }
  ].filter((s) => s.value !== 0)

  const rows = [
    { label: '活期', value: totals.current, color: ASSET_COLORS.current },
    { label: '存款', value: totals.deposit, color: ASSET_COLORS.deposit },
    { label: '理财', value: totals.investment, color: ASSET_COLORS.investment },
    { label: '备用金', value: totals.reserve, color: ASSET_COLORS.reserve }
  ]

  const up = monthChange >= 0

  if (loading) {
    return (
      <>
        <PageHeader title="工作台" />
        <div className="page">
          <EmptyState icon="⏳" text="加载中…" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="工作台"
        right={
          <button className="app-header__action" onClick={() => navigate('/settings')} aria-label="设置">
            ⚙️
          </button>
        }
      />
      <div className="page">
        {/* 总资产 */}
        <div className="total-asset">
          <div className="total-asset__label">总资产</div>
          <div className="total-asset__amount">{formatCNY(totals.total)}</div>
          <div className={`total-asset__delta ${up ? 'total-asset__delta--up' : 'total-asset__delta--down'}`}>
            较上月 {formatSignedCNY(monthChange)}
          </div>
        </div>

        {/* 资产结构环形图 */}
        <div className="card">
          <h3 className="card__title">资产结构</h3>
          {slices.length === 0 ? (
            <EmptyState icon="🥧" text="暂无资产数据" />
          ) : (
            <DoughnutChart data={slices} centerLabel={formatCNY(totals.total)} centerSub="总资产" />
          )}
          <div className="asset-rows mt16">
            {rows.map((r) => (
              <div className="asset-row" key={r.label}>
                <div className="asset-row__name">
                  <span className="dot" style={{ background: r.color }} />
                  {r.label}
                </div>
                <div className="asset-row__right">
                  <div className="asset-row__amount">{formatCNY(r.value)}</div>
                  <div className="asset-row__pct">{percent(r.value, totals.total).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 最近记录 */}
        <div className="card">
          <h3 className="card__title">最近记录</h3>
          {grouped.length === 0 ? (
            <EmptyState icon="📝" text="还没有记录，点击下方按钮开始记账" />
          ) : (
            grouped.map(([date, items]) => (
              <div key={date}>
                <div className="record-group__date">{date}</div>
                {items.map((t) => (
                  <TransactionItem key={t.id} tx={t} onClick={() => navigate('/transaction')} />
                ))}
              </div>
            ))
          )}
        </div>

        {/* 快捷操作 */}
        <div className="quick-actions">
          <button className="quick-btn" onClick={() => navigate('/transaction')}>
            <span className="quick-btn__plus">＋</span>
            记一笔
          </button>
          <button className="quick-btn" onClick={() => navigate('/assets')}>
            <span className="quick-btn__plus">＋</span>
            新增存款/理财
          </button>
          <button className="quick-btn" onClick={() => navigate('/reserve')}>
            <span className="quick-btn__plus">＋</span>
            新增备用金
          </button>
        </div>
      </div>
    </>
  )
}
