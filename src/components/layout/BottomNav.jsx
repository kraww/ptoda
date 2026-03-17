import { NavLink } from 'react-router-dom'
import { Home, ShoppingBag, Package, User } from 'lucide-react'

const LINKS = [
  { to: '/pet',       label: 'Home',      Icon: Home },
  { to: '/shop',      label: 'Shop',      Icon: ShoppingBag },
  { to: '/inventory', label: 'Inventory', Icon: Package },
  { to: '/profile',   label: 'Profile',   Icon: User },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-border">
      <div className="flex justify-around items-center h-14">
        {LINKS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1.5 transition-colors
              ${isActive ? 'text-accent-light' : 'text-text-muted hover:text-text-secondary'}`
            }
          >
            <Icon size={20} strokeWidth={2} />
            <span className="text-2xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
