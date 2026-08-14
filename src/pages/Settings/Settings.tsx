import { useRef, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useFinance } from '../../store/FinanceContext'
import { todayISO } from '../../utils/date'
import type { BackupFile } from '../../services/finance'

export function SettingsPage() {
  const { exportAll, importAll, clearAllData } = useFinance()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importData, setImportData] = useState<BackupFile | null>(null)
  const [importError, setImportError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleExport() {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `personal-finance-backup-${todayISO()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setMsg('已导出备份文件')
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError('')
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupFile
        if (parsed.app !== 'deposit-workbench' || !parsed.data) {
          setImportError('文件格式不正确，不是本应用的备份')
          return
        }
        setImportData(parsed)
      } catch {
        setImportError('文件解析失败，请确认是有效的备份 JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleImportConfirm() {
    if (!importData) return
    try {
      await importAll(importData)
      setMsg('已恢复数据')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '恢复失败')
    } finally {
      setImportData(null)
    }
  }

  return (
    <>
      <PageHeader title="设置" />
      <div className="page">
        <div className="card">
          <h3 className="card__title">数据备份与安全</h3>
          <div className="kv">
            <span className="kv__key">数据存储</span>
            <span className="kv__val">本机 IndexedDB</span>
          </div>
          <div className="kv">
            <span className="kv__key">联网</span>
            <span className="kv__val">完全离线</span>
          </div>
          <div className="kv">
            <span className="kv__key">上传</span>
            <span className="kv__val">不上传任何数据</span>
          </div>

          <div className="btn-row">
            <button className="btn btn--ghost" onClick={handleExport}>
              导出数据
            </button>
            <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              导入数据
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={handleFilePick}
          />
          <div className="btn-row">
            <button className="btn btn--danger" onClick={() => setConfirmClear(true)}>
              清空所有数据
            </button>
          </div>

          {importError && (
            <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{importError}</div>
          )}
          {msg && (
            <div style={{ color: 'var(--green)', fontSize: 13, marginTop: 12 }}>{msg}</div>
          )}
        </div>

        <div className="card">
          <h3 className="card__title">关于</h3>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
            搞钱是一个本地优先的轻量级财务 App。所有数据仅保存在你的设备本地（IndexedDB），
            不登录、不联网、不上传，也不接入任何银行或证券账户。
          </p>
        </div>
      </div>

      {/* 导入二次确认 */}
      <ConfirmDialog
        open={!!importData}
        title="导入数据"
        text="导入将覆盖当前所有数据，且不可撤销。确定要继续吗？"
        confirmText="覆盖并导入"
        danger
        onCancel={() => setImportData(null)}
        onConfirm={handleImportConfirm}
      />

      {/* 清空确认 */}
      <ConfirmDialog
        open={confirmClear}
        title="清空所有数据"
        text="将删除全部账户、记录、存款、理财与备用金数据，且不可恢复。确定要清空吗？"
        confirmText="清空"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearAllData()
          setConfirmClear(false)
          setMsg('已清空所有数据')
        }}
      />
    </>
  )
}
