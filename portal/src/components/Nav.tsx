import { NavLink } from 'react-router-dom'

const TABS = [
  { path: '', label: 'Dashboard' },
  { path: 'proposals', label: 'Proposals' },
  { path: 'bounties', label: 'Bounties' },
  { path: 'explorer', label: 'Explorer' },
  { path: 'mint', label: 'Mint' },
  { path: 'ecosystem', label: 'Ecosystem' },
]

export function Nav() {
  return (
    <nav className="nav">
      {TABS.map((t) => (
        <NavLink
          key={t.path}
          to={t.path}
          end={t.path === ''}
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
