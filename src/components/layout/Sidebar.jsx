import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ShoppingBag, User, LogOut, Shield, Newspaper } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/pet',    label: 'Home',  Icon: Home },
  { to: '/shop',   label: 'Shop',  Icon: ShoppingBag },
  { to: '/news',   label: 'News',  Icon: Newspaper },
  { to: '/profile',label: 'Profile',Icon: User },
]

const ADMIN_ID = 'a9a09202-6f21-4b9a-bb20-d0d38c49d9d7'

export default function Sidebar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 bg-sidebar border-r border-border z-40">
      <div className="px-4 py-5 border-b border-border">
        <span className="text-lg font-bold text-text-primary tracking-tight">T'poda</span>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        <p className="section-label px-2 mb-2">Menu</p>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors
              ${isActive ? 'bg-accent/15 text-accent-light' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`
            }
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}

        {user?.id === ADMIN_ID && (
          <>
            <p className="section-label px-2 mt-4 mb-2">Admin</p>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors
                ${isActive ? 'bg-accent/15 text-accent-light' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`
              }
            >
              <Shield size={16} strokeWidth={2} />
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      <div className="px-2 py-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-2 rounded hover:bg-hover transition-colors group">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <User size={14} className="text-accent-light" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{profile?.username ?? '…'}</p>
            <p className="text-2xs text-text-muted truncate">{profile?.coins ?? 0} coins</p>
          </div>
          <button
            onClick={handleSignOut}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-danger"
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
