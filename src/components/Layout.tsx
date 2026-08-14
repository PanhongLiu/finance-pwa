import { NavLink, Outlet } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

export function Layout() {
  return (
    <div className="app-shell">
      <div className="app-main">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: '记一笔', icon: 'pen', end: true },
  { to: '/reserve', label: '备用金', icon: 'wallet' },
  { to: '/assets', label: '明细', icon: 'list' }
]

function TabBar() {
  return (
    <nav className="tab-bar">
      <div className="tab-bar__brand">
        <span className="tab-bar__logo">
          <Icon name="wallet" size={22} />
        </span>
          <span className="tab-bar__brand-text">
            <span className="tab-bar__brand-name">搞钱</span>
            <span className="tab-bar__brand-sub">存款·理财</span>
          </span>
      </div>

      <div className="tab-bar__nav">
        <div className="tab-bar__group-label">导航</div>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `tab-bar__item${isActive ? ' tab-bar__item--active' : ''}`}
          >
            <span className="tab-bar__icon">
              <Icon name={t.icon} size={18} />
            </span>
            <span className="tab-bar__label">{t.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="tab-bar__footer">
        <span className="tab-bar__footer-icon">
          <Icon name="shield" size={15} />
        </span>
        <span className="tab-bar__footer-text">数据本地存储 · 安全私密</span>
      </div>
    </nav>
  )
}
