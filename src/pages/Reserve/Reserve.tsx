import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Sheet } from '../../components/Sheet'
import { useFinance } from '../../store/FinanceContext'
import { formatCNY, toCents } from '../../utils/money'
import { todayISO, daysUntil, fmtMonthDay } from '../../utils/date'

function goalCurrent(log: { date: string; amount: number }[]): number {
  return log.reduce((s, x) => s + x.amount, 0)
}

type GoalState = 'normal' | 'warn' | 'over'

function Ring({ pct, state }: { pct: number; state: GoalState }) {
  const color = state === 'over' ? '#dc2626' : state === 'warn' ? '#f59e0b' : '#2563eb'
  const r = 15
  const c = 2 * Math.PI * r
  const off = c * (1 - pct / 100)
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#eef2f7" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c.toFixed(2)}
        strokeDashoffset={off.toFixed(2)}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" fontSize="11" fontWeight={700} textAnchor="middle" fill={color}>
        {Math.round(pct)}
      </text>
    </svg>
  )
}

function stateOf(target: number, deadline: string, current: number): GoalState {
  if (target > 0 && current >= target) return 'over'
  if (deadline) {
    const d = daysUntil(deadline)
    if (d < 0) return 'over'
    if (d <= 7) return 'warn'
  }
  return 'normal'
}

export function ReservePage() {
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useFinance()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [addError, setAddError] = useState('')

  const [progressId, setProgressId] = useState<string | null>(null)
  const [pAmount, setPAmount] = useState('')
  const [pDate, setPDate] = useState(todayISO())
  const [progressError, setProgressError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  async function handleAdd() {
    setAddError('')
    const targetCents = toCents(target)
    if (!name.trim()) {
      setAddError('请填写目标名称')
      return
    }
    if (targetCents <= 0) {
      setAddError('请填写大于 0 的目标金额')
      return
    }
    try {
      await addGoal({ name: name.trim(), target: targetCents, deadline })
      setName('')
      setTarget('')
      setDeadline('')
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '添加失败')
    }
  }

  async function handleProgress() {
    setProgressError('')
    const amtCents = toCents(pAmount)
    if (!(amtCents > 0)) {
      setProgressError('请输入大于 0 的存入金额')
      return
    }
    if (progressId) {
      try {
        await updateGoalProgress(progressId, amtCents, pDate)
        setProgressId(null)
        setPAmount('')
        setPDate(todayISO())
      } catch (e) {
        setProgressError(e instanceof Error ? e.message : '操作失败')
      }
    }
  }

  const progressGoal = goals.find((g) => g.id === progressId) ?? null

  return (
    <>
      <PageHeader title="备用金" />
      <div className="page">
        {/* 目标进度 */}
        <div className="card">
          <h3 className="card__title">备用金进度</h3>
          {goals.length === 0 ? (
            <div className="empty" style={{ padding: '20px 0' }}>
              还没有备用金目标，在下方添加一个吧。
            </div>
          ) : (
            goals.map((g) => {
              const cur = goalCurrent(g.log)
              const pct = g.target > 0 ? Math.min(100, (cur / g.target) * 100) : 0
              const st = stateOf(g.target, g.deadline, cur)
              const last = g.log.length ? g.log[g.log.length - 1] : null
              const tag =
                st === 'over' && cur >= g.target
                  ? { cls: 'ok', text: '已达成' }
                  : st === 'over'
                    ? { cls: 'over', text: '已逾期' }
                    : st === 'warn'
                      ? { cls: 'soon', text: '将截止' }
                      : null
              return (
                <div className="goal" key={g.id}>
                  <div className="goal__ring">
                    <Ring pct={pct} state={st} />
                  </div>
                  <div className="goal__info">
                    <div className="goal__name">
                      {g.name}
                      {tag && <span className={`tag tag--${tag.cls}`}>{tag.text}</span>}
                    </div>
                    <div className="goal__meta">
                      已存 {formatCNY(cur)} / 目标 {formatCNY(g.target)}
                      {g.deadline ? ` · 截止 ${fmtMonthDay(g.deadline)}` : ''}
                      {last ? ` · 最近 ${fmtMonthDay(last.date)} 存 ${formatCNY(last.amount)}` : ''}
                    </div>
                    <div className={`bar ${st === 'normal' ? '' : st === 'warn' ? 'bar--warn' : 'bar--over'}`}>
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="goal__ops">
                    <button className="btn btn--ghost btn--sm" onClick={() => { setProgressId(g.id); setPDate(todayISO()) }}>
                      更新进度
                    </button>
                    <button className="btn btn--danger btn--sm" onClick={() => setDeleteTarget(g.id)}>
                      删除
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 新增目标 */}
        <div className="card">
          <h3 className="card__title">新增备用金目标</h3>
          <div className="form-grid">
            <div className="field full">
              <label className="field__label">目标名称</label>
              <input className="input" placeholder="如：旅游基金 / 应急备用金" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">目标金额（元）</label>
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
              <label className="field__label">截止日期</label>
              <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          {addError && <div className="form-error">{addError}</div>}
          <button className="btn btn--primary" style={{ marginTop: 4 }} onClick={handleAdd}>
            添加目标
          </button>
        </div>
      </div>

      {/* 更新进度弹窗 */}
      <Sheet open={!!progressId} title="更新备用金进度" onClose={() => setProgressId(null)}>
        {progressGoal && (
          <div className="kv" style={{ marginBottom: 12 }}>
            <span className="kv__key">当前已存</span>
            <span className="kv__val">{formatCNY(goalCurrent(progressGoal.log))}</span>
          </div>
        )}
        <div className="field">
          <label className="field__label">本次存入（元）</label>
          <div className="amount-line">
            <span className="amount-prefix">¥</span>
            <input
              className="input input--amount"
              inputMode="decimal"
              placeholder="0.00"
              value={pAmount}
              onChange={(e) => setPAmount(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </div>
        </div>
        <div className="field">
          <label className="field__label">存入日期</label>
          <input className="input" type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} />
        </div>
        {progressError && <div className="form-error">{progressError}</div>}
        <div className="btn-row">
          <button className="btn btn--muted" onClick={() => setProgressId(null)}>
            取消
          </button>
          <button className="btn btn--primary" onClick={handleProgress}>
            保存进度
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除备用金目标"
        text="删除后不可恢复，确定要删除这个目标吗？"
        confirmText="删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteGoal(deleteTarget)
          setDeleteTarget(null)
        }}
      />
    </>
  )
}
