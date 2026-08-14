import { useEffect, useState } from 'react'
import { useFinance } from '../../store/FinanceContext'
import { Sheet } from '../../components/Sheet'
import { DEPOSIT_TYPES, INVESTMENT_TYPES, type Deposit, type Investment } from '../../types'
import { toCents, formatYuan } from '../../utils/money'
import { todayISO, daysBetween } from '../../utils/date'

interface AssetFormProps {
  open?: boolean
  mode: 'add' | 'edit'
  kind: 'deposit' | 'wealth'
  initial?: Deposit | Investment | null
  variant?: 'inline' | 'sheet'
  onClose: () => void
  onSaved?: () => void
}

function isDeposit(a: Deposit | Investment): a is Deposit {
  return 'bank' in a && 'endDate' in a
}

export function AssetForm({ open, mode, kind: kindProp, initial, variant = 'sheet', onClose, onSaved }: AssetFormProps) {
  const { addDeposit, updateDeposit, addInvestment, updateInvestment } = useFinance()
  const [kind, setKind] = useState<'deposit' | 'wealth'>(kindProp)

  // 存款字段
  const [bank, setBank] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<string>(DEPOSIT_TYPES[1])
  const [principal, setPrincipal] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [annualRate, setAnnualRate] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  // 理财字段
  const [code, setCode] = useState('')
  const [realized, setRealized] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setKind(kindProp)
    if (initial) {
      if (isDeposit(initial)) {
        setBank(initial.bank)
        setName(initial.name)
        setType(initial.type)
        setPrincipal(String(initial.principal / 100))
        setCurrentAmount(String(initial.currentAmount / 100))
        setAnnualRate(String(initial.annualRate))
        setStartDate(initial.startDate)
        setEndDate(initial.endDate)
        setCode('')
        setRealized('0')
      } else {
        setBank('')
        setName(initial.name)
        setType(initial.type)
        setPrincipal(String(initial.investedAmount / 100))
        setCurrentAmount(String(initial.currentValue / 100))
        setAnnualRate(initial.annualRate ? String(initial.annualRate) : '')
        setStartDate(initial.purchaseDate)
        setEndDate('')
        setCode(initial.code)
        setRealized(String(initial.realizedProfit / 100))
      }
      setNote(initial.note)
    } else {
      setBank('')
      setName('')
      setType(kindProp === 'deposit' ? DEPOSIT_TYPES[1] : INVESTMENT_TYPES[0])
      setPrincipal('')
      setCurrentAmount('')
      setAnnualRate('')
      setStartDate(todayISO())
      setEndDate('')
      setCode('')
      setRealized('0')
      setNote('')
    }
    setError('')
  }, [initial, mode, kindProp, open])

  function accruedCents(): number {
    if (kind !== 'deposit') return 0
    const p = toCents(principal)
    const rate = parseFloat(annualRate) || 0
    const held = Math.max(0, daysBetween(startDate, todayISO()))
    return Math.round(p * (rate / 100) * (held / 365))
  }

  async function handleSave() {
    setError('')
    const principalCents = toCents(principal)
    const currentCents = currentAmount.trim() === '' ? undefined : toCents(currentAmount)
    const rate = parseFloat(annualRate)
    if (!name.trim()) {
      setError(kind === 'deposit' ? '请填写产品名称' : '请填写产品名称')
      return
    }
    if (kind === 'deposit' && !bank.trim()) {
      setError('请填写银行/机构名称')
      return
    }
    if (principalCents <= 0) {
      setError('请填写大于 0 的本金')
      return
    }
    if (currentCents !== undefined && currentCents < 0) {
      setError('当前金额不能为负')
      return
    }
    if (!isFinite(rate) || rate < 0) {
      setError('请填写正确的年利率')
      return
    }
    if (!startDate) {
      setError('请选择起息/买入日期')
      return
    }

    try {
      if (kind === 'deposit') {
        const input = {
          bank: bank.trim(),
          name: name.trim(),
          type,
          principal: principalCents,
          annualRate: rate,
          startDate,
          endDate: endDate.trim(),
          currentAmount: currentCents,
          note: note.trim()
        }
        if (mode === 'edit' && initial) await updateDeposit(initial.id, input)
        else await addDeposit(input)
      } else {
        const input = {
          name: name.trim(),
          code: code.trim(),
          type,
          investedAmount: principalCents,
          currentValue: currentCents ?? principalCents,
          realizedProfit: toCents(realized || '0'),
          unrealizedProfit: 0,
          fee: 0,
          annualRate: isFinite(rate) && rate > 0 ? rate : undefined,
          purchaseDate: startDate,
          note: note.trim()
        }
        if (mode === 'edit' && initial) await updateInvestment(initial.id, input)
        else await addInvestment(input)
      }
      if (variant === 'inline') {
        // 连续记一笔：重置表单
        setBank('')
        setName('')
        setPrincipal('')
        setCurrentAmount('')
        setAnnualRate('')
        setEndDate('')
        setCode('')
        setRealized('0')
        setNote('')
        setStartDate(todayISO())
        setError('')
        onSaved?.()
      } else {
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  const types = kind === 'deposit' ? DEPOSIT_TYPES : INVESTMENT_TYPES

  const fields = (
    <>
      {mode === 'add' && (
        <div className="segment" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`segment__item${kind === 'deposit' ? ' segment__item--active' : ''}`}
            onClick={() => {
              setKind('deposit')
              setType(DEPOSIT_TYPES[1])
            }}
          >
            存款
          </button>
          <button
            type="button"
            className={`segment__item${kind === 'wealth' ? ' segment__item--active' : ''}`}
            onClick={() => {
              setKind('wealth')
              setType(INVESTMENT_TYPES[0])
            }}
          >
            理财
          </button>
        </div>
      )}

      <div className="field">
        <label className="field__label">{kind === 'deposit' ? '银行 / 机构' : '产品名称'}</label>
        {kind === 'deposit' ? (
          <input className="input" placeholder="如：招商银行" value={bank} onChange={(e) => setBank(e.target.value)} />
        ) : (
          <input className="input" placeholder="如：沪深300指数基金" value={name} onChange={(e) => setName(e.target.value)} />
        )}
      </div>

      <div className="field">
        <label className="field__label">分类</label>
        <div className="chips">
          {types.map((t) => (
            <button key={t} type="button" className={`chip${type === t ? ' chip--active' : ''}`} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">{kind === 'deposit' ? '本金' : '累计投入'}</label>
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
        <label className="field__label">
          当前金额{kind === 'deposit' ? '（默认=本金，利息到账后可更新）' : '（市值，可随时更新）'}
        </label>
        <div className="amount-line">
          <span className="amount-prefix">¥</span>
          <input
            className="input input--amount"
            inputMode="decimal"
            placeholder={principal ? formatYuan(toCents(principal)) : '0.00'}
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </div>
        {kind === 'deposit' && (
          <button type="button" className="link-btn link-btn--inline" onClick={() => setCurrentAmount(formatYuan(toCents(principal) + accruedCents()))}>
            填入应计利息（至今 ¥{formatYuan(accruedCents())}）
          </button>
        )}
      </div>

      <div className="field">
        <label className="field__label">年利率（%）{kind === 'wealth' ? '（约定年化/业绩比较基准，可选）' : ''}</label>
        <input
          className="input"
          inputMode="decimal"
          placeholder="如 2.5"
          value={annualRate}
          onChange={(e) => setAnnualRate(e.target.value.replace(/[^\d.]/g, ''))}
        />
      </div>

      {kind === 'wealth' && (
        <div className="field">
          <label className="field__label">产品代码（可选）</label>
          <input className="input" placeholder="如：110011" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      )}

      <div className="field">
        <label className="field__label">{kind === 'deposit' ? '起息日期' : '买入日期'}</label>
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>

      {kind === 'deposit' && (
        <div className="field">
          <label className="field__label">到期日期（活期/大额可留空）</label>
          <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      )}

      {kind === 'wealth' && (
        <div className="field">
          <label className="field__label">已实现收益（可选）</label>
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
      )}

      <div className="field">
        <label className="field__label">备注</label>
        <input className="input" placeholder="可选" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div className={variant === 'inline' ? 'btn-row' : 'btn-row'}>
        {variant === 'sheet' && (
          <button className="btn btn--muted" type="button" onClick={onClose}>
            取消
          </button>
        )}
        <button className="btn btn--primary" type="button" onClick={handleSave}>
          {variant === 'inline' ? '保存这笔' : mode === 'edit' ? '保存' : '添加'}
        </button>
      </div>
    </>
  )

  if (variant === 'inline') {
    return <div className="record-form">{fields}</div>
  }

  return (
    <Sheet open={open ?? false} title={mode === 'edit' ? '编辑' : '新增存款 / 理财'} onClose={onClose}>
      {fields}
    </Sheet>
  )
}
