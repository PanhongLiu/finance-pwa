import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function EmptyState({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon ?? <Icon name="list" size={40} />}</div>
      <div className="empty__text">{text}</div>
    </div>
  )
}
