export function EmptyState({ icon = '📭', text }: { icon?: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div className="empty__text">{text}</div>
    </div>
  )
}
