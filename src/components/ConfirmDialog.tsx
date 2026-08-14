import { useEffect } from 'react'

export function ConfirmDialog({
  open,
  title,
  text,
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  text: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="dialog-mask" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__title">{title}</div>
        <div className="dialog__text">{text}</div>
        <div className="dialog__btns">
          <button className="btn btn--muted" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
