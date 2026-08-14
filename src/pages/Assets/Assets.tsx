import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { AssetForm } from './AssetForm'
import { useFinance } from '../../store/FinanceContext'
import { formatCNY, formatSignedCNY, formatPercent } from '../../utils/money'
import {
  depositToRow,
  investmentToRow,
  assetGainNow,
  assetGainTotal,
  assetAnnualizedNow,
  assetAnnualizedTotal
} from '../../services/calc'
import type { Deposit, Investment } from '../../types'

type Tab = 'deposit' | 'wealth'

export function AssetsPage() {
  const { deposits, investments, deleteDeposit, deleteInvestment } = useFinance()
  const [tab, setTab] = useState<Tab>('deposit')
  const [editor, setEditor] = useState<{
    open: boolean
    kind: 'deposit' | 'wealth'
    initial?: Deposit | Investment | null
  }>({ open: false, kind: 'deposit', initial: null })
  const [deleteTarget, setDeleteTarget] = useState<{ kind: Tab; id: string } | null>(null)

  const list = tab === 'deposit' ? deposits : investments

  return (
    <>
      <PageHeader title="存款 / 理财" />
      <div className="page">
        <div className="tabs-inline">
          <button
            className={`tabs-inline__item${tab === 'deposit' ? ' tabs-inline__item--active' : ''}`}
            onClick={() => setTab('deposit')}
          >
            存款（{deposits.length}）
          </button>
          <button
            className={`tabs-inline__item${tab === 'wealth' ? ' tabs-inline__item--active' : ''}`}
            onClick={() => setTab('wealth')}
          >
            理财（{investments.length}）
          </button>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={tab === 'deposit' ? '🏦' : '📊'}
            text={`还没有${tab === 'deposit' ? '存款' : '理财'}记录，点击右下角添加`}
          />
        ) : (
          list.map((item) => {
            const row =
              tab === 'deposit'
                ? depositToRow(item as Deposit)
                : investmentToRow(item as Investment)
            const gainNow = assetGainNow(row)
            const gainTotal = assetGainTotal(row)
            const annNow = assetAnnualizedNow(row)
            const annTotal = assetAnnualizedTotal(row)
            const isDeposit = tab === 'deposit'
            return (
              <div className="list-card" key={row.id}>
                <div className="list-card__top">
                  <span className="list-card__name">{row.name}</span>
                  <span className="list-card__tag">{row.category}</span>
                </div>
                {isDeposit ? (
                  <div className="list-card__row">
                    <span className="muted">{row.institution}</span>
                    <span>
                      {row.startDate}
                      {row.termDays != null && row.termDays > 0 ? ` · 期限 ${row.termDays} 天` : ' · 活期'}
                    </span>
                  </div>
                ) : (
                  row.institution && (
                    <div className="list-card__row">
                      <span className="muted">{row.institution}</span>
                    </div>
                  )
                )}

                <div className="metrics-grid">
                  <div className="metric">
                    <span className="metric__label">{isDeposit ? '当前金额' : '当前市值'}</span>
                    <span className="metric__value">{formatCNY(row.currentValue)}</span>
                  </div>
                  <div className="metric">
                    <span className="metric__label">本金 / 投入</span>
                    <span className="metric__value">{formatCNY(row.principal)}</span>
                  </div>
                  <div className="metric">
                    <span className="metric__label">当前收益</span>
                    <span className="metric__value" style={{ color: gainNow >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {formatSignedCNY(gainNow)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric__label">{isDeposit ? '到期总利息' : '总收益'}</span>
                    <span className="metric__value" style={{ color: gainTotal >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {formatSignedCNY(gainTotal)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric__label">当前年化率</span>
                    <span className="metric__value" style={{ color: annNow >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {gainNow >= 0 || annNow >= 0 ? '+' : ''}
                      {formatPercent(annNow)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric__label">总年化率</span>
                    <span className="metric__value" style={{ color: annTotal >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {annTotal >= 0 ? '+' : ''}
                      {formatPercent(annTotal)}
                    </span>
                  </div>
                </div>

                {(item as Deposit | Investment).note && (
                  <div className="list-card__row">
                    <span className="muted">{(item as Deposit | Investment).note}</span>
                  </div>
                )}

                <div className="list-card__actions">
                  <button
                    className="link-btn"
                    onClick={() => setEditor({ open: true, kind: tab, initial: item as Deposit | Investment })}
                  >
                    更新金额 / 编辑
                  </button>
                  <button
                    className="link-btn"
                    style={{ color: 'var(--red)' }}
                    onClick={() => setDeleteTarget({ kind: tab, id: row.id })}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <button
        className="fab"
        aria-label="新增"
        onClick={() => setEditor({ open: true, kind: tab, initial: null })}
      >
        ＋
      </button>

      <AssetForm
        open={editor.open}
        mode={editor.initial ? 'edit' : 'add'}
        kind={editor.kind}
        initial={editor.initial}
        onClose={() => setEditor({ open: false, kind: editor.kind, initial: null })}
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
