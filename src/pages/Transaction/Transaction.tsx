import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { TransactionItem } from '../../components/TransactionItem'
import { TransactionEditor } from './TransactionEditor'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Sheet } from '../../components/Sheet'
import { useFinance } from '../../store/FinanceContext'
import { formatCNY } from '../../utils/money'
import { fmtFull } from '../../utils/date'
import type { Transaction } from '../../types'

export function TransactionPage() {
  const { transactions, accounts, reserveFunds, investments, deleteTransaction } = useFinance()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [detail, setDetail] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      ),
    [transactions]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of sorted) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    return Array.from(map.entries())
  }, [sorted])

  function nameOf(kind: string, id: string): string {
    if (kind === 'account') return accounts.find((a) => a.id === id)?.name ?? '账户'
    if (kind === 'reserve') return reserveFunds.find((r) => r.id === id)?.name ?? '备用金'
    if (kind === 'investment') return investments.find((i) => i.id === id)?.name ?? '理财'
    if (kind === 'deposit') return '存款'
    return ''
  }

  function openEdit(t: Transaction) {
    setDetail(null)
    setEditing(t)
    setEditorOpen(true)
  }

  function openAdd() {
    setEditing(null)
    setEditorOpen(true)
  }

  return (
    <>
      <PageHeader title="记一笔" />
      <div className="page">
        {grouped.length === 0 ? (
          <EmptyState icon="📝" text="还没有记账，点击右下角按钮记一笔" />
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="record-group__date">{date}</div>
              {items.map((t) => (
                <TransactionItem key={t.id} tx={t} onClick={() => setDetail(t)} />
              ))}
            </div>
          ))
        )}
      </div>

      <button className="fab" onClick={openAdd} aria-label="记一笔">
        ＋
      </button>

      {/* 新增/编辑 */}
      <TransactionEditor
        open={editorOpen}
        mode={editing ? 'edit' : 'add'}
        initial={editing}
        defaultType="expense"
        onClose={() => {
          setEditorOpen(false)
          setEditing(null)
        }}
      />

      {/* 详情 */}
      <Sheet open={!!detail} title="记录详情" onClose={() => setDetail(null)}>
        {detail && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color:
                    detail.type === 'income'
                      ? 'var(--green)'
                      : detail.type === 'expense'
                        ? 'var(--red)'
                        : 'var(--text)'
                }}
              >
                {detail.type === 'income'
                  ? `+${formatCNY(detail.amount)}`
                  : detail.type === 'expense'
                    ? `-${formatCNY(detail.amount)}`
                    : formatCNY(detail.amount)}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                {detail.category} · {fmtFull(detail.date)}
              </div>
            </div>
            <div className="kv">
              <span className="kv__key">类型</span>
              <span className="kv__val">
                {detail.type === 'income' ? '收入' : detail.type === 'expense' ? '支出' : '转账'}
              </span>
            </div>
            {detail.type === 'transfer' ? (
              <>
                <div className="kv">
                  <span className="kv__key">转出</span>
                  <span className="kv__val">
                    {detail.from ? nameOf(detail.from.kind, detail.from.id) : '-'}
                  </span>
                </div>
                <div className="kv">
                  <span className="kv__key">转入</span>
                  <span className="kv__val">{detail.to ? nameOf(detail.to.kind, detail.to.id) : '-'}</span>
                </div>
              </>
            ) : (
              <div className="kv">
                <span className="kv__key">账户</span>
                <span className="kv__val">
                  {accounts.find((a) => a.id === detail.accountId)?.name ?? '-'}
                </span>
              </div>
            )}
            {detail.note && (
              <div className="kv">
                <span className="kv__key">备注</span>
                <span className="kv__val">{detail.note}</span>
              </div>
            )}
            <div className="btn-row">
              <button className="btn btn--ghost" onClick={() => openEdit(detail)}>
                编辑
              </button>
              <button className="btn btn--danger" onClick={() => setDeleteTarget(detail)}>
                删除
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除记录"
        text="删除后不可恢复，确定要删除这条记录吗？"
        confirmText="删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteTransaction(deleteTarget.id)
          setDeleteTarget(null)
          setDetail(null)
        }}
      />
    </>
  )
}
