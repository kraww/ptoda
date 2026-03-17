import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/pet',       label: 'Home',  icon: '🏠' },
  { to: '/shop',      label: 'Shop',  icon: '🛒' },
  { to: '/inventory', label: 'Items', icon: '🎒' },
  { to: '/profile',   label: 'Me',    icon: '👤' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {LINKS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors text-xs font-medium
              ${isActive ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}`
            }
          >
            <span className="text-2xl leading-none">{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
