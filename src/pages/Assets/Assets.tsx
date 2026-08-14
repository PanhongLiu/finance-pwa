import { useMemo, useRef, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Sheet } from '../../components/Sheet'
import { useFinance } from '../../store/FinanceContext'
import { formatCNY, formatSignedCNY, toCents, formatYuan } from '../../utils/money'
import { fmtMonthDay } from '../../utils/date'
import { annualized, type PortfolioSummary } from '../../services/calc'
import { bulkSavePositions } from '../../services/finance'
import type { Position } from '../../types'

type SortKey = 'project' | 'category' | 'app' | 'amount' | 'expiry' | 'gain' | 'ann' | 'date'
type SortDir = 'asc' | 'desc'

function gainText(p: Position): string {
  if (p.gainType !== 'market') return '—'
  return formatSignedCNY(p.lastGain)
}

export function AssetsPage() {
  const { positions, updatePositionAmount, deletePosition, clearAllData, portfolio, reload } = useFinance()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [editId, setEditId] = useState<string | null>(null)
  const [eAmount, setEAmount] = useState('')
  const [eDeposit, setEDeposit] = useState('0')
  const [eDate, setEDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sorted = useMemo(() => {
    const arr = positions.slice()
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortKey) {
        case 'project':
          return dir * a.project.localeCompare(b.project, 'zh')
        case 'category':
          return dir * a.category.localeCompare(b.category, 'zh')
        case 'app':
          return dir * (a.app || '').localeCompare(b.app || '', 'zh')
        case 'amount':
          return dir * (a.amount - b.amount)
        case 'expiry':
          return dir * (a.expiry || '').localeCompare(b.expiry || '')
        case 'gain':
          return dir * (a.lastGain - b.lastGain)
        case 'ann': {
          const xa = annualized(a) ?? -1e9
          const xb = annualized(b) ?? -1e9
          return dir * (xa - xb)
        }
        case 'date':
        default:
          return dir * a.date.localeCompare(b.date)
      }
    })
    return arr
  }, [positions, sortKey, sortDir])

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir('desc')
    }
  }

  const editPos = positions.find((p) => p.id === editId) ?? null
  const editGain = toCents(eAmount) - toCents(eDeposit) - (editPos?.amount ?? 0)

  async function handleEditSave() {
    if (!editPos) return
    const newAmt = toCents(eAmount)
    const dep = toCents(eDeposit)
    if (!(newAmt >= 0)) return
    await updatePositionAmount(editPos.id, newAmt, dep, eDate || editPos.date)
    setEditId(null)
  }

  // CSV 导出
  function exportCsv() {
    const rows = [['项目', '分类', 'APP', '当前金额', '到期时间', '距上次收益', '距上次年化', '更新日期']]
    for (const p of sorted) {
      const ann = annualized(p)
      rows.push([
        p.project,
        p.category,
        p.app || '',
        String(p.amount / 100),
        p.expiry || '',
        p.gainType === 'market' ? String(p.lastGain / 100) : '',
        ann == null ? '' : ann.toFixed(2),
        p.date
      ])
    }
    const csv = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `存款理财明细_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function csvCell(s: string): string {
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }

  // CSV 导入
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseCsv(String(reader.result))
        bulkImport(imported)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'CSV 解析失败')
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  function parseCsv(text: string): Position[] {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) throw new Error('文件中没有可导入的数据行')
    const head = parseCsvLine(lines[0]).map((h) => h.trim())
    const idx: Record<string, number> = {}
    head.forEach((h, i) => (idx[h] = i))
    if (idx['项目'] == null || idx['分类'] == null) throw new Error('CSV 需包含「项目」「分类」列')
    const now = Date.now()
    const out: Position[] = []
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i])
      const proj = (cells[idx['项目']] || '').trim()
      const cat = (cells[idx['分类']] || '').trim()
      const amt = Math.round(parseFloat(cells[idx['当前金额']] || '0') * 100)
      if (!proj || !cat || !(amt >= 0)) continue
      const gainRaw = cells[idx['距上次收益']]
      const gain = gainRaw !== '' && gainRaw != null ? Math.round(parseFloat(gainRaw) * 100) : 0
      const date = (cells[idx['更新日期']] || '').trim()
      const expiry = (cells[idx['到期时间']] || '').trim()
      const app = (cells[idx['APP']] || '').trim()
      out.push({
        id: 'imp-' + now + '-' + i,
        project: proj,
        category: (['定期存款', '理财', '其他'].includes(cat) ? cat : '其他') as Position['category'],
        app,
        amount: amt,
        prevAmount: amt - (gain > 0 ? gain : 0),
        lastGain: gain,
        gainType: gain !== 0 ? 'market' : 'base',
        date: date || new Date().toISOString().slice(0, 10),
        prevDate: date || new Date().toISOString().slice(0, 10),
        note: '',
        expiry,
        ts: now,
        lastDeposit: 0
      })
    }
    if (out.length === 0) throw new Error('没有可导入的有效行')
    return out
  }

  function parseCsvLine(line: string): string[] {
    const out: string[] = []
    let cur = ''
    let q = false
    let i = 0
    while (i < line.length) {
      const ch = line[i]
      if (q) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"'
            i += 2
            continue
          }
          q = false
          i++
          continue
        }
        cur += ch
        i++
      } else {
        if (ch === '"') {
          q = true
          i++
          continue
        }
        if (ch === ',') {
          out.push(cur)
          cur = ''
          i++
          continue
        }
        cur += ch
        i++
      }
    }
    out.push(cur)
    return out
  }

  async function bulkImport(list: Position[]) {
    await bulkSavePositions(list)
    await reload()
    alert(`已导入 ${list.length} 行（按 项目 + 分类 合并）`)
  }

  const summary = portfolioSummaryLocal(portfolio)

  return (
    <>
      <PageHeader title="明细" />
      <div className="page">
        <div className="card">
          <h3 className="card__title">存款与理财明细</h3>
          <div className="summary-strip">
            <div className="sum-chip">
              <div className="sum-chip__l">持仓总市值</div>
              <div className="sum-chip__v">{formatCNY(summary.totalMarket)}</div>
            </div>
            <div className="sum-chip">
              <div className="sum-chip__l">持仓项目数</div>
              <div className="sum-chip__v">{positions.length}</div>
            </div>
            <div className="sum-chip">
              <div className="sum-chip__l">累计收益</div>
              <div className="sum-chip__v" style={{ color: summary.cumulativeGain >= 0 ? 'var(--red)' : 'var(--green)' }}>
                {formatSignedCNY(summary.cumulativeGain)}
              </div>
            </div>
          </div>

          <div className="toolbar">
            <button className="btn btn--ghost btn--sm" onClick={exportCsv}>
              导出CSV
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
              导入CSV
            </button>
            <button className="btn btn--danger btn--sm" onClick={() => setConfirmClear(true)}>
              清空全部
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFilePick} />
          </div>

          {positions.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>
              暂无明细，去「记一笔」存第一笔吧。
            </div>
          ) : (
            <div className="table-scroll">
              <table className="detail-table">
                <thead>
                  <tr>
                    <SortTh k="project" label="项目" cur={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh k="category" label="分类" cur={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh k="app" label="APP" cur={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh k="amount" label="当前金额" cur={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh k="expiry" label="到期时间" cur={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh k="gain" label="距上次收益" cur={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh k="ann" label="距上次年化" cur={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh k="date" label="更新日期" cur={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => {
                    const ann = annualized(p)
                    const gPositive = p.lastGain > 0
                    const gNegative = p.lastGain < 0
                    return (
                      <tr key={p.id}>
                        <td>{p.project}</td>
                        <td>
                          <span className="cate">
                            <span className="cate__dot" style={{ background: catColor(p.category) }} />
                            {p.category}
                          </span>
                        </td>
                        <td>{p.app || '—'}</td>
                        <td className="td-amt">{formatCNY(p.amount)}</td>
                        <td>{p.expiry ? fmtMonthDay(p.expiry) : '—'}</td>
                        <td className={`td-gain${gPositive ? ' pos' : gNegative ? ' neg' : ''}`}>{gainText(p)}</td>
                        <td>{ann == null ? '—' : (ann >= 0 ? '+' : '') + ann.toFixed(1) + '%'}</td>
                        <td>{fmtMonthDay(p.date)}</td>
                        <td>
                          <div className="row-ops">
                            <button className="iconbtn" title="更新金额" onClick={() => { setEditId(p.id); setEAmount(formatYuan(p.amount)); setEDeposit('0'); setEDate(p.date) }}>
                              <Icon name="pen" size={16} />
                            </button>
                            <button className="iconbtn iconbtn--red" title="删除" onClick={() => setDeleteTarget(p.id)}>
                              <Icon name="trash" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="note">
            说明：每个「项目 + 分类」合并为一行。点「更新金额」输入<strong>当前金额</strong>与<strong>新存入</strong>，
            收益自动计算：<strong>当前金额 − 新存入 − 当前项目金额</strong>。距上次年化仅对理财类按复利折算。
          </div>
        </div>
      </div>

      {/* 更新金额弹窗 */}
      <Sheet open={!!editId} title="更新金额" onClose={() => setEditId(null)}>
        {editPos && (
          <div className="kv" style={{ marginBottom: 12 }}>
            <span className="kv__key">项目</span>
            <span className="kv__val">
              {editPos.project} · {editPos.category}
            </span>
          </div>
        )}
        <div className="field">
          <label className="field__label">当前金额（元）</label>
          <div className="amount-line">
            <span className="amount-prefix">¥</span>
            <input
              className="input input--amount"
              inputMode="decimal"
              value={eAmount}
              onChange={(e) => setEAmount(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </div>
        </div>
        <div className="field">
          <label className="field__label">新存入（元）</label>
          <div className="amount-line">
            <span className="amount-prefix">¥</span>
            <input
              className="input input--amount"
              inputMode="decimal"
              value={eDeposit}
              onChange={(e) => setEDeposit(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </div>
        </div>
        <div className="field">
          <label className="field__label">更新日期</label>
          <input className="input" type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
        </div>
        <div className="calcpreview">
          收益自动计算：<b>{formatSignedCNY(editGain)}</b>　＝　当前金额 {formatCNY(toCents(eAmount))} − 新存入{' '}
          {formatCNY(toCents(eDeposit))} − 当前项目金额 {editPos ? formatCNY(editPos.amount) : '¥0.00'}
        </div>
        <div className="btn-row">
          <button className="btn btn--muted" onClick={() => setEditId(null)}>
            取消
          </button>
          <button className="btn btn--primary" onClick={handleEditSave}>
            保存更新
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除"
        text="删除后不可恢复，确定要删除这条持仓吗？"
        confirmText="删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deletePosition(deleteTarget)
          setDeleteTarget(null)
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="清空所有数据"
        text="将删除全部存款、理财与备用金数据，且不可恢复。建议先点「设置 → 导出备份」。确定要清空吗？"
        confirmText="清空"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearAllData()
          setConfirmClear(false)
        }}
      />
    </>
  )
}

function catColor(cat: string): string {
  const map: Record<string, string> = { 定期存款: '#2563eb', 理财: '#f59e0b', 其他: '#10b981' }
  return map[cat] || '#94a3b8'
}

function portfolioSummaryLocal(p: PortfolioSummary) {
  return { totalMarket: p.totalMarket, cumulativeGain: p.cumulativeGain }
}

function SortTh({
  k,
  label,
  cur,
  dir,
  onSort
}: {
  k: SortKey
  label: string
  cur: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
}) {
  return (
    <th onClick={() => onSort(k)} className={cur === k ? 'sort-on' : ''}>
      {label}
      <span className="ar">{cur === k ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
    </th>
  )
}
