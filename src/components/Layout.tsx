import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="app-shell">
      <Outlet />
      <TabBar />
    </div>
  )
}

const TABS = [
  { to: '/', label: '记一笔', icon: '✍️', end: true },
  { to: '/reserve', label: '备用金', icon: '🧰' },
  { to: '/assets', label: '明细', icon: '📋' }
]

function TabBar() {
  return (
    <nav className="tab-bar">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `tab-bar__item${isActive ? ' tab-bar__item--active' : ''}`}
        >
          <span className="tab-bar__icon">{t.icon}</span>
          <span className="tab-bar__label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
