import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { DoughnutChart } from '../../components/DoughnutChart'
import { AssetForm } from '../Assets/AssetForm'
import { useFinance } from '../../store/FinanceContext'
import { formatCNY, formatSignedCNY } from '../../utils/money'
import { percent } from '../../services/calc'

function Metric({
  label,
  value,
  sub,
  positive
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className={`metric__value${positive === true ? ' metric__value--up' : positive === false ? ' metric__value--down' : ''}`}>
        {value}
      </div>
      {sub && <div className="metric__sub">{sub}</div>}
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { portfolio, loading } = useFinance()
  const [savedToast, setSavedToast] = useState(false)

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

  const marketTotal = portfolio.depositCurrent + portfolio.wealthCurrent
  const slices = portfolio.categories

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
        {/* 记一笔：放在首页最上方，存款/理财 一键入账 */}
        <div className="card record-card">
          <div className="record-card__head">
            <h3 className="card__title" style={{ margin: 0 }}>
              记一笔
            </h3>
            <span className="muted">存款 / 理财 入账</span>
          </div>
          <AssetForm
            variant="inline"
            mode="add"
            kind="deposit"
            onClose={() => {}}
            onSaved={() => {
              setSavedToast(true)
              window.setTimeout(() => setSavedToast(false), 1500)
            }}
          />
        </div>

        {/* 总资产 */}
        <div className="total-asset">
          <div className="total-asset__label">总资产（存款 + 理财 + 备用金）</div>
          <div className="total-asset__amount">{formatCNY(portfolio.totalAsset)}</div>
          <div className="total-asset__delta">存款当前 {formatCNY(portfolio.depositCurrent)} · 理财市值 {formatCNY(portfolio.wealthCurrent)}</div>
        </div>

        {/* 收益指标：当前收益 / 总收益 / 当前年化率 / 总年化率 */}
        <div className="card">
          <h3 className="card__title">收益概览</h3>
          <div className="metrics-grid">
            <Metric
              label="当前收益"
              value={formatSignedCNY(portfolio.currentGain)}
              sub={`当前年化 ${portfolio.currentAnnualized.toFixed(2)}%`}
              positive={portfolio.currentGain >= 0}
            />
            <Metric
              label="总收益"
              value={formatSignedCNY(portfolio.totalGain)}
              sub="到期 / 累计"
              positive={portfolio.totalGain >= 0}
            />
            <Metric label="当前年化率" value={`${portfolio.currentAnnualized.toFixed(2)}%`} />
            <Metric label="总年化率" value={`${portfolio.totalAnnualized.toFixed(2)}%`} />
          </div>
        </div>

        {/* 存款 / 理财 分类 */}
        <div className="card">
          <h3 className="card__title">存款 / 理财 · 分类</h3>
          {slices.length === 0 ? (
            <EmptyState icon="🥧" text="还没有存款或理财，先记一笔吧" />
          ) : (
            <>
              <DoughnutChart
                data={slices.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
                centerLabel={formatCNY(marketTotal)}
                centerSub="市值合计"
              />
              <div className="asset-rows mt16">
                {slices.map((s) => (
                  <div className="asset-row" key={`${s.kind}:${s.label}`}>
                    <div className="asset-row__name">
                      <span className="dot" style={{ background: s.color }} />
                      {s.label}
                    </div>
                    <div className="asset-row__right">
                      <div className="asset-row__amount">{formatCNY(s.value)}</div>
                      <div className="asset-row__pct">{percent(s.value, marketTotal).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 备用金概览 */}
        <div className="card">
          <h3 className="card__title">备用金</h3>
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span className="muted">当前合计</span>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{formatCNY(portfolio.reserveTotal)}</span>
          </div>
          <button className="link-btn link-btn--inline" onClick={() => navigate('/reserve')}>
            管理备用金 →
          </button>
        </div>

        {/* 快捷跳转 */}
        <div className="quick-actions">
          <button className="quick-btn" onClick={() => navigate('/assets')}>
            <span className="quick-btn__plus">¥</span>
            存款理财
          </button>
          <button className="quick-btn" onClick={() => navigate('/reserve')}>
            <span className="quick-btn__plus">🧰</span>
            备用金
          </button>
        </div>

        {savedToast && <div className="toast">已保存 ✓</div>}
      </div>
    </>
  )
}
