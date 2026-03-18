import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Dna, Package, Clock, Users, Newspaper, Trophy, UserCircle, Gamepad2, MessageSquare } from 'lucide-react'

const LINKS = [
  { to: '/admin',              label: 'Dashboard',    Icon: LayoutDashboard, end: true },
  { to: '/admin/posts',        label: 'Posts',        Icon: Newspaper },
  { to: '/admin/forum',        label: 'Forum',        Icon: MessageSquare },
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
    <nav className="flex flex-col gap-0.5 p-2">
      {LINKS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors
            ${isActive
              ? 'bg-accent/10 text-accent-light'
              : 'text-text-muted hover:text-text-primary hover:bg-hover'}`
          }
        >
          <Icon size={15} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
