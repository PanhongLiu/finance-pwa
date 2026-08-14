import type { ReactNode } from 'react'

export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__title">{title}</div>
        {right ?? <div style={{ width: 36 }} />}
      </div>
    </header>
  )
}
