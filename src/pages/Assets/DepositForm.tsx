import { useState } from 'react'
import { useFinance } from '../../store/FinanceContext'
import { Sheet } from '../../components/Sheet'
import { DEPOSIT_TYPES, type Deposit, type DepositInput } from '../../types'
import { toCents } from '../../utils/money'
import { todayISO } from '../../utils/date'

export function DepositForm({
  open,
  mode,
  initial,
  onClose
}: {
  open: boolean
  mode: 'add' | 'edit'
  initial?: Deposit | null
  onClose: () => void
}) {
  const { accounts, addDeposit, updateDeposit, defaultAccountId } = useFinance()
  const [bank, setBank] = useState(initial?.bank ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<string>(initial?.type ?? DEPOSIT_TYPES[1])
  const [principal, setPrincipal] = useState(initial ? String(initial.principal / 100) : '')
  const [annualRate, setAnnualRate] = useState(initial ? String(initial.annualRate) : '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO())
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [sourceAccountId, setSourceAccountId] = useState(initial ? '' : defaultAccountId ?? '')
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    const principalCents = toCents(principal)
    if (!bank.trim()) {
      setError('请填写银行名称')
      return
    }
    if (!name.trim()) {
      setError('请填写产品名称')
      return
    }
    if (principalCents <= 0) {
      setError('请填写大于 0 的本金')
      return
    }
    const rate = parseFloat(annualRate)
    if (!isFinite(rate) || rate < 0) {
      setError('请填写正确的年利率')
      return
    }
    if (!startDate || !endDate) {
      setError('请选择起息和到期日期')
      return
    }
    const input: DepositInput = {
      bank: bank.trim(),
      name: name.trim(),
      type,
      principal: principalCents,
      annualRate: rate,
      startDate,
      endDate,
      note: note.trim(),
      sourceAccountId: mode === 'add' ? sourceAccountId || undefined : undefined
    }
    try {
      if (mode === 'edit' && initial) await updateDeposit(initial.id, input)
      else await addDeposit(input)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <Sheet open={open} title={mode === 'edit' ? '编辑存款' : '新增存款'} onClose={onClose}>
      <div className="field">
        <label className="field__label">银行名称</label>
        <input className="input" placeholder="如：招商银行" value={bank} onChange={(e) => setBank(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label">产品名称</label>
        <input className="input" placeholder="如：三年定期" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label">类型</label>
        <div className="chips">
          {DEPOSIT_TYPES.map((t) => (
            <button key={t} className={`chip${type === t ? ' chip--active' : ''}`} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field__label">本金</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">年利率（%）</label>
        <input
          className="input"
          inputMode="decimal"
          placeholder="如 2.5"
          value={annualRate}
          onChange={(e) => setAnnualRate(e.target.value.replace(/[^\d.]/g, ''))}
        />
      </div>
      <div className="field">
        <label className="field__label">起息日期</label>
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label">到期日期</label>
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      {mode === 'add' && (
        <div className="field">
          <label className="field__label">资金来源账户（将从余额中扣除本金）</label>
          <select className="select" value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}
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
