import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useFinance } from '../../store/FinanceContext'
import { DepositForm } from './DepositForm'
import { InvestmentForm } from './InvestmentForm'
import { formatCNY, formatSignedCNY } from '../../utils/money'
import {
  depositExpectedInterest,
  depositMaturityAmount,
  depositDaysToMaturity,
  investmentTotalProfit,
  investmentRate
} from '../../services/calc'
import type { Deposit, Investment } from '../../types'

type Tab = 'deposit' | 'investment'

export function AssetsPage() {
  const { deposits, investments, deleteDeposit, deleteInvestment } = useFinance()
  const [tab, setTab] = useState<Tab>('deposit')
  const [depEditor, setDepEditor] = useState<{ open: boolean; mode: 'add' | 'edit'; initial?: Deposit | null }>({
    open: false,
    mode: 'add'
  })
  const [invEditor, setInvEditor] = useState<{
    open: boolean
    mode: 'add' | 'edit'
    initial?: Investment | null
  }>({ open: false, mode: 'add' })
  const [deleteTarget, setDeleteTarget] = useState<{ kind: Tab; id: string } | null>(null)

  const invTotalValue = investments.reduce((s, i) => s + i.currentValue, 0)
  const invTotalProfit = investments.reduce((s, i) => s + investmentTotalProfit(i), 0)
  const invTotalInvested = investments.reduce((s, i) => s + i.investedAmount, 0)
  const invRate = invTotalInvested === 0 ? 0 : (invTotalProfit / invTotalInvested) * 100

  return (
    <>
      <PageHeader title="存款 / 理财" />
      <div className="page">
        <div className="tabs-inline">
          <button
            className={`tabs-inline__item${tab === 'deposit' ? ' tabs-inline__item--active' : ''}`}
            onClick={() => setTab('deposit')}
          >
            存款
          </button>
          <button
            className={`tabs-inline__item${tab === 'investment' ? ' tabs-inline__item--active' : ''}`}
            onClick={() => setTab('investment')}
          >
            理财
          </button>
        </div>

        {tab === 'deposit' ? (
          <>
            {deposits.length === 0 ? (
              <EmptyState icon="🏦" text="还没有存款记录，点击右下角添加" />
            ) : (
              deposits.map((d) => {
                const interest = depositExpectedInterest(d)
                const maturity = depositMaturityAmount(d)
                const days = depositDaysToMaturity(d)
                return (
                  <div className="list-card" key={d.id}>
                    <div className="list-card__top">
                      <span className="list-card__name">{d.name}</span>
                      <span className="list-card__tag">{d.type}</span>
                    </div>
                    <div className="list-card__row">
                      <span>{d.bank}</span>
                      <span>
                        本金 <b>{formatCNY(d.principal)}</b>
                      </span>
                    </div>
                    <div className="list-card__row">
                      <span>年利率</span>
                      <span>
                        <b>{d.annualRate}%</b>
                      </span>
                    </div>
                    <div className="list-card__row">
                      <span>预计利息</span>
                      <span style={{ color: 'var(--green)' }}>
                        <b>+{formatCNY(interest)}</b>
                      </span>
                    </div>
                    <div className="list-card__row">
                      <span>到期本息</span>
                      <span>
                        <b>{formatCNY(maturity)}</b>
                      </span>
                    </div>
                    <div className="list-card__row">
                      <span>
                        {d.startDate} ~ {d.endDate}
                      </span>
                      <span>{days >= 0 ? `还有 ${days} 天` : `已到期 ${-days} 天`}</span>
                    </div>
                    {d.note && (
                      <div className="list-card__row">
                        <span className="muted">{d.note}</span>
                      </div>
                    )}
                    <div className="list-card__actions">
                      <button className="link-btn" onClick={() => setDepEditor({ open: true, mode: 'edit', initial: d })}>
                        编辑
                      </button>
                      <button
                        className="link-btn"
                        style={{ color: 'var(--red)' }}
                        onClick={() => setDeleteTarget({ kind: 'deposit', id: d.id })}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </>
        ) : (
          <>
            {investments.length > 0 && (
              <div className="card">
                <h3 className="card__title">理财总览</h3>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="muted">当前市值</span>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>{formatCNY(invTotalValue)}</span>
                </div>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="muted">总收益</span>
                  <span style={{ fontWeight: 700, color: invTotalProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {formatSignedCNY(invTotalProfit)}
                  </span>
                </div>
                <div className="row-between">
                  <span className="muted">收益率</span>
                  <span style={{ fontWeight: 700, color: invRate >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {invRate >= 0 ? '+' : ''}
                    {invRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            {investments.length === 0 ? (
              <EmptyState icon="📊" text="还没有理财记录，点击右下角添加" />
            ) : (
              investments.map((i) => {
                const profit = investmentTotalProfit(i)
                const rate = investmentRate(i)
                return (
                  <div className="list-card" key={i.id}>
                    <div className="list-card__top">
                      <span className="list-card__name">{i.name}</span>
                      <span className="list-card__tag">{i.type}</span>
                    </div>
                    {i.code && (
                      <div className="list-card__row">
                        <span className="muted">代码</span>
                        <span>{i.code}</span>
                      </div>
                    )}
                    <div className="list-card__row">
                      <span>当前市值</span>
                      <span>
                        <b>{formatCNY(i.currentValue)}</b>
                      </span>
                    </div>
                    <div className="list-card__row">
                      <span>累计投入</span>
                      <span>{formatCNY(i.investedAmount)}</span>
                    </div>
                    <div className="list-card__row">
                      <span>总收益</span>
                      <span style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        <b>{formatSignedCNY(profit)}</b>
                      </span>
                    </div>
                    <div className="list-card__row">
                      <span>收益率</span>
                      <span style={{ color: rate >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        <b>
                          {rate >= 0 ? '+' : ''}
                          {rate.toFixed(2)}%
                        </b>
                      </span>
                    </div>
                    {i.note && (
                      <div className="list-card__row">
                        <span className="muted">{i.note}</span>
                      </div>
                    )}
                    <div className="list-card__actions">
                      <button className="link-btn" onClick={() => setInvEditor({ open: true, mode: 'edit', initial: i })}>
                        市值调整 / 编辑
                      </button>
                      <button
                        className="link-btn"
                        style={{ color: 'var(--red)' }}
                        onClick={() => setDeleteTarget({ kind: 'investment', id: i.id })}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}
      </div>

      <button
        className="fab"
        aria-label="新增"
        onClick={() => (tab === 'deposit' ? setDepEditor({ open: true, mode: 'add' }) : setInvEditor({ open: true, mode: 'add' }))}
      >
        ＋
      </button>

      <DepositForm
        open={depEditor.open}
        mode={depEditor.mode}
        initial={depEditor.initial}
        onClose={() => setDepEditor({ open: false, mode: 'add' })}
      />
      <InvestmentForm
        open={invEditor.open}
        mode={invEditor.mode}
        initial={invEditor.initial}
        onClose={() => setInvEditor({ open: false, mode: 'add' })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除"
        text="删除后不可恢复，确定要删除这条记录吗？"
        confirmText="删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            if (deleteTarget.kind === 'deposit') await deleteDeposit(deleteTarget.id)
            else await deleteInvestment(deleteTarget.id)
          }
          setDeleteTarget(null)
        }}
      />
    </>
  )
}
