import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin',         label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/species', label: 'Species',   icon: '🐾' },
  { to: '/admin/items',   label: 'Items',     icon: '📦' },
  { to: '/admin/decay',   label: 'Decay',     icon: '⏱️' },
  { to: '/admin/users',   label: 'Users',     icon: '👥' },
]

export default function AdminNav() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-4">
      <div className="flex gap-1 overflow-x-auto max-w-4xl mx-auto">
        {LINKS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${isActive ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`
            }
          >
            <span>{icon}</span> {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
