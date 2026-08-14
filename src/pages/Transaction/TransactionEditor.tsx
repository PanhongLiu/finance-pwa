import { useState } from 'react'
import { useFinance } from '../../store/FinanceContext'
import { Sheet } from '../../components/Sheet'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type LocationRef, type Transaction, type TxType } from '../../types'
import { toCents } from '../../utils/money'
import { todayISO } from '../../utils/date'

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  initial?: Transaction | null
  defaultType?: TxType
  onClose: () => void
}

export function TransactionEditor({ open, mode, initial, defaultType = 'expense', onClose }: Props) {
  const { accounts, reserveFunds, investments, addIncome, addExpense, addTransfer, updateTransaction, defaultAccountId } =
    useFinance()

  const [type, setType] = useState<TxType>(initial?.type ?? defaultType)
  const [amount, setAmount] = useState(initial ? String(initial.amount / 100) : '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [category, setCategory] = useState(initial?.category ?? EXPENSE_CATEGORIES[0])
  const [accountId, setAccountId] = useState(initial?.accountId ?? defaultAccountId ?? '')
  const [fromVal, setFromVal] = useState(refToString(initial?.from))
  const [toVal, setToVal] = useState(refToString(initial?.to))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')

  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const locationOptions = [
    ...accounts.map((a) => ({ ref: { kind: 'account' as const, id: a.id }, label: `💳 ${a.name}` })),
    ...reserveFunds.map((r) => ({ ref: { kind: 'reserve' as const, id: r.id }, label: `🧰 ${r.name}` })),
    ...investments.map((i) => ({ ref: { kind: 'investment' as const, id: i.id }, label: `📊 ${i.name}` }))
  ]

  function parseRef(v: string): LocationRef | undefined {
    if (!v) return undefined
    const [kind, id] = v.split(':')
    return { kind: kind as LocationRef['kind'], id }
  }

  async function handleSave() {
    setError('')
    const cents = toCents(amount)
    if (cents <= 0) {
      setError('请输入大于 0 的金额')
      return
    }
    if (!date) {
      setError('请选择日期')
      return
    }
    try {
      if (type === 'income') {
        const input = { amount: cents, category, accountId: accountId || (defaultAccountId ?? ''), date, note }
        if (mode === 'edit' && initial) await updateTransaction(initial.id, input, 'income')
        else await addIncome(input)
      } else if (type === 'expense') {
        const input = { amount: cents, category, accountId: accountId || (defaultAccountId ?? ''), date, note }
        if (mode === 'edit' && initial) await updateTransaction(initial.id, input, 'expense')
        else await addExpense(input)
      } else {
        const from = parseRef(fromVal)
        const to = parseRef(toVal)
        if (!from || !to) {
          setError('请选择转出和转入账户')
          return
        }
        if (from.kind === to.kind && from.id === to.id) {
          setError('转出和转入不能是同一个')
          return
        }
        const input = { from, to, amount: cents, date, note }
        if (mode === 'edit' && initial) await updateTransaction(initial.id, input, 'transfer')
        else await addTransfer(input)
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <Sheet
      open={open}
      title={mode === 'edit' ? '编辑记录' : type === 'transfer' ? '转账' : type === 'income' ? '记收入' : '记支出'}
      onClose={onClose}
    >
      {/* 类型切换 */}
      <div className="segment" style={{ marginBottom: 16 }}>
        {(['expense', 'income', 'transfer'] as TxType[]).map((t) => (
          <button
            key={t}
            className={`segment__item${type === t ? ' segment__item--active' : ''}`}
            onClick={() => setType(t)}
          >
            {t === 'income' ? '收入' : t === 'expense' ? '支出' : '转账'}
          </button>
        ))}
      </div>

      {/* 金额 */}
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

      {/* 日期 */}
      <div className="field">
        <label className="field__label">日期</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {type === 'transfer' ? (
        <>
          <div className="field">
            <label className="field__label">转出</label>
            <select className="select" value={fromVal} onChange={(e) => setFromVal(e.target.value)}>
              <option value="">请选择</option>
              <optgroup label="账户">
                {accounts.map((a) => (
                  <option key={a.id} value={`account:${a.id}`}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="备用金">
                {reserveFunds.map((r) => (
                  <option key={r.id} value={`reserve:${r.id}`}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="理财">
                {investments.map((i) => (
                  <option key={i.id} value={`investment:${i.id}`}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="field">
            <label className="field__label">转入</label>
            <select className="select" value={toVal} onChange={(e) => setToVal(e.target.value)}>
              <option value="">请选择</option>
              <optgroup label="账户">
                {accounts.map((a) => (
                  <option key={a.id} value={`account:${a.id}`}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="备用金">
                {reserveFunds.map((r) => (
                  <option key={r.id} value={`reserve:${r.id}`}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="理财">
                {investments.map((i) => (
                  <option key={i.id} value={`investment:${i.id}`}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label className="field__label">分类</label>
            <div className="chips">
              {cats.map((c) => (
                <button
                  key={c}
                  className={`chip${category === c ? ' chip--active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              className="input mt8"
              placeholder="自定义分类（可选）"
              value={category && !cats.includes(category as never) ? category : ''}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label">账户</label>
            <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* 备注 */}
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

function refToString(ref?: LocationRef): string {
  if (!ref) return ''
  return `${ref.kind}:${ref.id}`
}
