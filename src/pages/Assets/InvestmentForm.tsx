import { useState } from 'react'
import { useFinance } from '../../store/FinanceContext'
import { Sheet } from '../../components/Sheet'
import { INVESTMENT_TYPES, type Investment, type InvestmentInput } from '../../types'
import { toCents } from '../../utils/money'
import { todayISO } from '../../utils/date'

export function InvestmentForm({
  open,
  mode,
  initial,
  onClose
}: {
  open: boolean
  mode: 'add' | 'edit'
  initial?: Investment | null
  onClose: () => void
}) {
  const { accounts, addInvestment, updateInvestment, defaultAccountId } = useFinance()
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [type, setType] = useState<string>(initial?.type ?? INVESTMENT_TYPES[0])
  const [invested, setInvested] = useState(initial ? String(initial.investedAmount / 100) : '')
  const [current, setCurrent] = useState(initial ? String(initial.currentValue / 100) : '')
  const [realized, setRealized] = useState(initial ? String(initial.realizedProfit / 100) : '0')
  const [unrealized, setUnrealized] = useState(initial ? String(initial.unrealizedProfit / 100) : '0')
  const [fee, setFee] = useState(initial ? String(initial.fee / 100) : '0')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? todayISO())
  const [note, setNote] = useState(initial?.note ?? '')
  const [sourceAccountId, setSourceAccountId] = useState(initial ? '' : defaultAccountId ?? '')
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    const investedCents = toCents(invested)
    const currentCents = toCents(current)
    if (!name.trim()) {
      setError('请填写产品名称')
      return
    }
    if (investedCents <= 0) {
      setError('请填写大于 0 的累计投入')
      return
    }
    if (currentCents < 0) {
      setError('当前市值不能为负')
      return
    }
    const input: InvestmentInput = {
      name: name.trim(),
      code: code.trim(),
      type,
      investedAmount: investedCents,
      currentValue: currentCents,
      realizedProfit: toCents(realized || '0'),
      unrealizedProfit: toCents(unrealized || '0'),
      fee: toCents(fee || '0'),
      purchaseDate,
      note: note.trim(),
      sourceAccountId: mode === 'add' ? sourceAccountId || undefined : undefined
    }
    try {
      if (mode === 'edit' && initial) await updateInvestment(initial.id, input)
      else await addInvestment(input)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <Sheet open={open} title={mode === 'edit' ? '编辑理财' : '新增理财'} onClose={onClose}>
      <div className="field">
        <label className="field__label">产品名称</label>
        <input className="input" placeholder="如：沪深300指数基金" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label">产品代码（可选）</label>
        <input className="input" placeholder="如：110011" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label">类型</label>
        <div className="chips">
          {INVESTMENT_TYPES.map((t) => (
            <button key={t} className={`chip${type === t ? ' chip--active' : ''}`} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field__label">累计投入</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={invested}
            onChange={(e) => setInvested(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">当前市值（手动维护）</label>
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
        <label className="field__label">已实现收益</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={realized}
            onChange={(e) => setRealized(e.target.value.replace(/[^\d.-]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">未实现收益（可选）</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={unrealized}
            onChange={(e) => setUnrealized(e.target.value.replace(/[^\d.-]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">手续费（可选）</label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder="0.00"
            value={fee}
            onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label">买入日期</label>
        <input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
      </div>
      {mode === 'add' && (
        <div className="field">
          <label className="field__label">资金来源账户（将从余额中扣除累计投入）</label>
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
