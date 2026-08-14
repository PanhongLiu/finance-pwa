import { useState } from 'react'
import { useFinance } from '../../store/FinanceContext'
import { POSITION_CATEGORIES, type PositionCategory } from '../../types'
import { toCents } from '../../utils/money'
import { todayISO } from '../../utils/date'

export function RecordForm({ onSaved }: { onSaved?: () => void }) {
  const { positions, addRecord } = useFinance()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [category, setCategory] = useState<PositionCategory>('定期')
  const [project, setProject] = useState('')
  const [app, setApp] = useState('')
  const [expiry, setExpiry] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const projectList = Array.from(new Set(positions.map((p) => p.project).filter(Boolean))).slice(0, 30)
  const appList = Array.from(new Set(positions.map((p) => p.app).filter(Boolean))).slice(0, 30)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amtCents = toCents(amount)
    if (!(amtCents > 0)) {
      setError('请输入大于 0 的金额')
      return
    }
    if (!project.trim()) {
      setError('请填写项目')
      return
    }
    try {
      await addRecord({
        amount: amtCents,
        date,
        category,
        project: project.trim(),
        app: app.trim(),
        expiry,
        note: note.trim()
      })
      setAmount('')
      setProject('')
      setApp('')
      setExpiry('')
      setNote('')
      setDate(todayISO())
      setError('')
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  return (
    <form className="record-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label className="field__label">金额（元）</label>
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
        <div className="field full">
          <label className="field__label">分类</label>
          <div className="chips">
            {POSITION_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip${category === c ? ' chip--active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label className="field__label">项目</label>
          <input
            className="input"
            list="rec-project-list"
            placeholder="如：旅游基金 / 稳健理财A"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          />
          <datalist id="rec-project-list">
            {projectList.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div className="field full">
          <label className="field__label">APP / 银行</label>
          <input
            className="input"
            list="rec-app-list"
            placeholder="如：工商银行 / 支付宝"
            value={app}
            onChange={(e) => setApp(e.target.value)}
          />
          <datalist id="rec-app-list">
            {appList.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="field full">
          <label className="field__label">到期时间（选填）</label>
          <input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        <div className="field full">
          <label className="field__label">备注（选填）</label>
          <input className="input" placeholder="选填" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button className="btn btn--primary" type="submit" style={{ marginTop: 4 }}>
        保存这笔
      </button>
    </form>
  )
}
