import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Sheet } from '../../components/Sheet'
import { useFinance } from '../../store/FinanceContext'
import { formatCNY } from '../../utils/money'
import { toCents } from '../../utils/money'
import { todayISO } from '../../utils/date'
import { RESERVE_TYPES, type LocationRef, type ReserveFund } from '../../types'

export function ReservePage() {
  const {
    reserveFunds,
    accounts,
    investments,
    addReserve,
    updateReserve,
    deleteReserve,
    reserveTransferIn,
    reserveTransferOut,
    reserveAdjust
  } = useFinance()

  const [addEditor, setAddEditor] = useState<{ open: boolean; mode: 'add' | 'edit'; initial?: ReserveFund | null }>({
    open: false,
    mode: 'add'
  })
  const [op, setOp] = useState<{ mode: 'in' | 'out'; reserveId: string } | null>(null)
  const [adjustId, setAdjustId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const locOptions = [
    ...accounts.map((a) => ({ ref: { kind: 'account' as const, id: a.id }, label: `💳 ${a.name}` })),
    ...investments.map((i) => ({ ref: { kind: 'investment' as const, id: i.id }, label: `📊 ${i.name}` }))
  ]

  function accountName(id: string) {
    return accounts.find((a) => a.id === id)?.name ?? '-'
  }

  return (
    <>
      <PageHeader title="备用金" />
      <div className="page">
        {reserveFunds.length === 0 ? (
          <EmptyState icon="🧰" text="还没有备用金账户，点击右下角添加" />
        ) : (
          reserveFunds.map((r) => {
            const pct = r.targetAmount > 0 ? (r.currentAmount / r.targetAmount) * 100 : 0
            const shown = Math.max(0, Math.min(100, pct))
            return (
              <div className="list-card" key={r.id}>
                <div className="list-card__top">
                  <span className="list-card__name">{r.name}</span>
                  <span className="list-card__tag">所属：{accountName(r.accountId)}</span>
                </div>
                <div className="progress">
                  <div className="progress__bar" style={{ width: `${shown}%` }} />
                </div>
                <div className="progress__meta">
                  <span>
                    {formatCNY(r.currentAmount)} / {formatCNY(r.targetAmount)}
                  </span>
                  <span className="progress__pct">{pct.toFixed(0)}%</span>
                </div>
                <div className="list-card__actions">
                  <button className="link-btn" onClick={() => setOp({ mode: 'in', reserveId: r.id })}>
                    转入
                  </button>
                  <button className="link-btn" onClick={() => setOp({ mode: 'out', reserveId: r.id })}>
                    转出
                  </button>
                  <button className="link-btn" onClick={() => setAdjustId(r.id)}>
                    调整
                  </button>
                </div>
                <div className="list-card__actions">
                  <button className="link-btn" onClick={() => setAddEditor({ open: true, mode: 'edit', initial: r })}>
                    编辑
                  </button>
                  <button
                    className="link-btn"
                    style={{ color: 'var(--red)' }}
                    onClick={() => setDeleteTarget(r.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <button className="fab" aria-label="新增备用金" onClick={() => setAddEditor({ open: true, mode: 'add' })}>
        ＋
      </button>

      {/* 新增/编辑备用金 */}
      <ReserveForm
        open={addEditor.open}
        mode={addEditor.mode}
        initial={addEditor.initial}
        onClose={() => setAddEditor({ open: false, mode: 'add' })}
        onSave={async (input) => {
          if (addEditor.mode === 'edit' && addEditor.initial) await updateReserve(addEditor.initial.id, input)
          else await addReserve(input)
          setAddEditor({ open: false, mode: 'add' })
        }}
      />

      {/* 转入 / 转出 */}
      <OperationSheet
        op={op}
        locOptions={locOptions}
        onClose={() => setOp(null)}
        onConfirm={async (other, amount, date) => {
          if (!op) return
          if (op.mode === 'in') {
            const from: LocationRef = { kind: other.kind, id: other.id }
            await reserveTransferIn(op.reserveId, from, amount, date)
          } else {
            const to: LocationRef = { kind: other.kind, id: other.id }
            await reserveTransferOut(op.reserveId, to, amount, date)
          }
          setOp(null)
        }}
      />

      {/* 调整余额 */}
      <AdjustSheet
        open={!!adjustId}
        reserve={reserveFunds.find((r) => r.id === adjustId) ?? null}
        onClose={() => setAdjustId(null)}
        onConfirm={async (amount, date, note) => {
          if (adjustId) await reserveAdjust(adjustId, amount, date, note)
          setAdjustId(null)
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除备用金"
        text="删除后不可恢复，确定要删除这个备用金账户吗？"
        confirmText="删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteReserve(deleteTarget)
          setDeleteTarget(null)
        }}
      />
    </>
  )
}

// ---------------- 新增/编辑表单 ----------------
function ReserveForm({
  open,
  mode,
  initial,
  onClose,
  onSave
}: {
  open: boolean
  mode: 'add' | 'edit'
  initial?: ReserveFund | null
  onClose: () => void
  onSave: (input: {
    name: string
    targetAmount: number
    currentAmount: number
    accountId: string
    note: string
  }) => Promise<void>
}) {
  const { accounts, defaultAccountId } = useFinance()
  const [name, setName] = useState(initial?.name ?? RESERVE_TYPES[0])
  const [target, setTarget] = useState(initial ? String(initial.targetAmount / 100) : '')
  const [current, setCurrent] = useState(initial ? String(initial.currentAmount / 100) : '')
  const [accountId, setAccountId] = useState(initial?.accountId ?? defaultAccountId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    const targetCents = toCents(target)
    const currentCents = toCents(current)
    if (!name.trim()) {
      setError('请填写名称')
      return
    }
    if (targetCents <= 0) {
      setError('请填写大于 0 的目标金额')
      return
    }
    if (currentCents < 0) {
      setError('当前金额不能为负')
      return
    }
    try {
      await onSave({
        name: name.trim(),
        targetAmount: targetCents,
        currentAmount: currentCents,
        accountId,
        note: note.trim()
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <Sheet open={open} title={mode === 'edit' ? '编辑备用金' : '新增备用金'} onClose={onClose}>
      <div className="field">
        <label className="field__label">名称</label>
        <div className="chips">
          {RESERVE_TYPES.map((t) => (
            <button key={t} className={`chip${name === t ? ' chip--active' : ''}`} onClick={() => setName(t)}>
              {t}
            </button>
          ))}
        </div>
        <input
          className="input mt8"
          placeholder="自定义名称（可选）"
          value={name && !RESERVE_TYPES.includes(name as never) ? name : ''}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label">目标金额</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">当前金额</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={current}
            onChange={(e) => setCurrent(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">所属账户</label>
        <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label">备注</label>
        <input className="input" placeholder="可选" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div className="btn-row">
        <button className="btn btn--muted" onClick={onClose}>
          取消
        </button>
        <button className="btn btn--primary" onClick={handleSave}>
          {mode === 'edit' ? '保存' : '添加'}
        </button>
      </div>
    </Sheet>
  )
}

// ---------------- 转入/转出 ----------------
function OperationSheet({
  op,
  locOptions,
  onClose,
  onConfirm
}: {
  op: { mode: 'in' | 'out'; reserveId: string } | null
  locOptions: { ref: LocationRef; label: string }[]
  onClose: () => void
  onConfirm: (other: LocationRef, amount: number, date: string) => Promise<void>
}) {
  const [other, setOther] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')

  function parseRef(v: string): LocationRef | undefined {
    if (!v) return undefined
    const [kind, id] = v.split(':')
    return { kind: kind as LocationRef['kind'], id }
  }

  async function handleConfirm() {
    setError('')
    const cents = toCents(amount)
    const ref = parseRef(other)
    if (cents <= 0) {
      setError('请输入大于 0 的金额')
      return
    }
    if (!ref) {
      setError('请选择对方账户')
      return
    }
    try {
      await onConfirm(ref, cents, date)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    }
  }

  return (
    <Sheet open={!!op} title={op?.mode === 'in' ? '转入备用金' : '转出备用金'} onClose={onClose}>
      <div className="field">
        <label className="field__label">金额</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">{op?.mode === 'in' ? '从（账户/理财）转出' : '转入到（账户/理财）'}</label>
        <select className="select" value={other} onChange={(e) => setOther(e.target.value)}>
          <option value="">请选择</option>
          {locOptions.map((o) => (
            <option key={`${o.ref.kind}:${o.ref.id}`} value={`${o.ref.kind}:${o.ref.id}`}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label">日期</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div className="btn-row">
        <button className="btn btn--muted" onClick={onClose}>
          取消
        </button>
        <button className="btn btn--primary" onClick={handleConfirm}>
          确定
        </button>
      </div>
    </Sheet>
  )
}

// ---------------- 调整余额 ----------------
function AdjustSheet({
  open,
  reserve,
  onClose,
  onConfirm
}: {
  open: boolean
  reserve: ReserveFund | null
  onClose: () => void
  onConfirm: (amount: number, date: string, note: string) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  async function handleConfirm() {
    setError('')
    const cents = toCents(amount)
    if (cents < 0) {
      setError('金额不能为负')
      return
    }
    try {
      await onConfirm(cents, date, note.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    }
  }

  return (
    <Sheet open={open} title="调整余额" onClose={onClose}>
      {reserve && (
        <div className="kv" style={{ marginBottom: 12 }}>
          <span className="kv__key">当前余额</span>
          <span className="kv__val">{formatCNY(reserve.currentAmount)}</span>
        </div>
      )}
      <div className="field">
        <label className="field__label">调整为（新余额）</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">日期</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label">备注</label>
        <input className="input" placeholder="可选" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div className="btn-row">
        <button className="btn btn--muted" onClick={onClose}>
          取消
        </button>
        <button className="btn btn--primary" onClick={handleConfirm}>
          确定
        </button>
      </div>
    </Sheet>
  )
}
