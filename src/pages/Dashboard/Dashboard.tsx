import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { DoughnutChart } from '../../components/DoughnutChart'
import { RecordForm } from './RecordForm'
import { useFinance } from '../../store/FinanceContext'
import { formatCNY, formatSignedCNY, formatPercent } from '../../utils/money'
import { percent, monthlyTrend } from '../../services/calc'

function Metric({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
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
  const { portfolio, records, loading, error, reload } = useFinance()
  const [savedToast, setSavedToast] = useState(false)

  if (loading) {
    return (
      <>
        <PageHeader title="存款·理财工作台" />
        <div className="page">
          <EmptyState icon={<Icon name="spinner" spin size={40} />} text="加载中…" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="存款·理财工作台" />
        <div className="page">
          <div className="card error-card">
            <div className="error-card__icon">
              <Icon name="alert" size={38} />
            </div>
            <div className="error-card__title">数据加载失败</div>
            <div className="error-card__text">{error}</div>
            <button className="btn btn--primary" onClick={() => void reload()}>
              重试
            </button>
          </div>
        </div>
      </>
    )
  }

  const slices = portfolio.categories
  const trend = monthlyTrend(records, 6)
  const maxTrend = trend.reduce((m, t) => Math.max(m, t.amount), 0)

  return (
    <>
      <PageHeader
        title="存款·理财工作台"
        right={
          <button className="app-header__action" onClick={() => navigate('/settings')} aria-label="设置">
            <Icon name="settings" size={22} />
          </button>
        }
      />
      <div className="page">
        {/* 记一笔：放在首页最上方 */}
        <div className="card">
          <h3 className="card__title">记一笔</h3>
          <RecordForm
            onSaved={() => {
              setSavedToast(true)
              window.setTimeout(() => setSavedToast(false), 1500)
            }}
          />
        </div>

        {/* 存款汇总：分类环形图 + 月度趋势（等高） */}
        <div className="card">
          <h3 className="card__title">存款汇总</h3>
          <div className="charts">
            <div className="chart-box">
              <div className="chart-box__title">月度存款趋势</div>
              <div className="chart-box__body">
                {trend.length === 0 ? (
                  <div className="empty" style={{ padding: '30px 0' }}>
                    暂无存款记录
                  </div>
                ) : (
                  <div className="trend">
                    {trend.map((t) => (
                      <div className="trend__col" key={t.month}>
                        <div className="trend__bar" style={{ height: `${maxTrend > 0 ? (t.amount / maxTrend) * 100 : 0}%` }} />
                        <div className="trend__label">{t.month.slice(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="chart-box">
              <div className="chart-box__title">账户分布（按分类）</div>
              <div className="chart-box__body">
                {slices.length === 0 ? (
                  <div className="empty" style={{ padding: '30px 0' }}>
                    暂无数据
                  </div>
                ) : (
                  <>
                    <DoughnutChart
                      data={slices.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
                      centerLabel={formatCNY(portfolio.totalMarket)}
                      centerSub="持仓总市值"
                    />
                    <div className="legend">
                      {slices.map((s) => (
                        <div className="legend__li" key={s.label}>
                          <span className="legend__dot" style={{ background: s.color }} />
                          <span className="legend__name">{s.label}</span>
                          <span className="legend__amt">
                            {formatCNY(s.value)} · {percent(s.value, portfolio.totalMarket).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 收益概览 */}
        <div className="card">
          <h3 className="card__title">收益概览</h3>
          <div className="metrics-grid">
            <Metric
              label="累计收益"
              value={formatSignedCNY(portfolio.cumulativeGain)}
              sub="标记收益合计"
              positive={portfolio.cumulativeGain >= 0}
            />
            <Metric label="综合年化率" value={formatPercent(portfolio.portfolioAnnualized)} />
            <Metric label="持仓项目数" value={`${portfolio.projectCount}`} />
            <Metric label="持仓总市值" value={formatCNY(portfolio.totalMarket)} />
          </div>
        </div>

        {savedToast && (
          <div className="toast">
            <Icon name="check" size={15} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            已保存
          </div>
        )}
      </div>
    </>
  )
}
