import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Dna, Package, Clock, Users, Newspaper, Trophy, UserCircle, Gamepad2 } from 'lucide-react'

const LINKS = [
  { to: '/admin',              label: 'Dashboard',    Icon: LayoutDashboard, end: true },
  { to: '/admin/posts',        label: 'Posts',        Icon: Newspaper },
  { to: '/admin/species',      label: 'Species',      Icon: Dna },
  { to: '/admin/items',        label: 'Items',        Icon: Package },
  { to: '/admin/decay',        label: 'Decay',        Icon: Clock },
  { to: '/admin/users',        label: 'Users',        Icon: Users },
  { to: '/admin/achievements', label: 'Achievements', Icon: Trophy },
  { to: '/admin/avatars',      label: 'Avatars',      Icon: UserCircle },
  { to: '/admin/games',        label: 'Games',        Icon: Gamepad2 },
]

export default function AdminNav() {
  return (
    <nav className="bg-sidebar border-b border-border">
      <div className="flex gap-0 overflow-x-auto max-w-4xl mx-auto px-4">
        {LINKS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${isActive
                ? 'border-accent text-accent-light'
                : 'border-transparent text-text-muted hover:text-text-secondary'}`
            }
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
