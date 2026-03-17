import { NavLink } from 'react-router-dom'
import { Home, ShoppingBag, User, Gamepad2, Users } from 'lucide-react'
import { useSocial } from '../../context/SocialContext'

const LINKS = [
  { to: '/pet',    label: 'Home',   Icon: Home },
  { to: '/games',  label: 'Games',  Icon: Gamepad2 },
  { to: '/shop',   label: 'Shop',   Icon: ShoppingBag },
  { to: '/social', label: 'Social', Icon: Users, social: true },
  { to: '/profile',label: 'Me',     Icon: User },
]

export default function BottomNav() {
  const { pendingCount, unreadCount } = useSocial()
  const totalSocial = pendingCount + unreadCount

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-border">
      <div className="flex justify-around items-center h-14">
        {LINKS.map(({ to, label, Icon, social }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 transition-colors relative
              ${isActive ? 'text-accent-light' : 'text-text-muted hover:text-text-secondary'}`
            }
          >
            <div className="relative">
              <Icon size={18} strokeWidth={2} />
              {social && totalSocial > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-accent rounded-full flex items-center justify-center text-white font-bold" style={{ fontSize: 8 }}>
                  {totalSocial > 9 ? '9+' : totalSocial}
                </span>
              )}
            </div>
            <span className="text-2xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
