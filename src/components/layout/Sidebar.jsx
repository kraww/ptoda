import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ShoppingBag, User, LogOut, Shield, Newspaper, Gamepad2, Users, Mail, PanelLeftClose, PanelLeftOpen, Flame } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSocial } from '../../context/SocialContext'
import { useLayout } from '../../context/LayoutContext'
import { isAdmin } from '../../lib/admin'

const NAV = [
  { to: '/pet',    label: 'Home',    Icon: Home },
  { to: '/games',  label: 'Games',   Icon: Gamepad2 },
  { to: '/shop',   label: 'Shop',    Icon: ShoppingBag },
  { to: '/news',   label: 'News',    Icon: Newspaper },
  { to: '/social', label: 'Social',  Icon: Users, social: true },
  { to: '/profile',label: 'Profile', Icon: User },
]

function NotifBubble({ count, Icon, color }) {
  if (!count) return null
  return (
    <span className={`flex items-center gap-0.5 text-2xs font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      <Icon size={9} />
      {count}
    </span>
  )
}

export default function Sidebar() {
  const { user, profile, signOut, loginStreak } = useAuth()
  const { pendingCount, unreadCount } = useSocial()
  const { compact, toggleCompact } = useLayout()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 bg-sidebar border-r border-border z-40">
      <div className="px-4 py-4 border-b border-border">
        <img
          src="https://ikzzynpovxmrkrigmruz.supabase.co/storage/v1/object/public/assets/tpodadefaultlogo.png"
          alt="T'poda"
          className="h-12 w-auto object-contain"
        />
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        <p className="section-label px-2 mb-2">Menu</p>
        {NAV.map(({ to, label, Icon, social }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors
              ${isActive ? 'bg-accent/15 text-accent-light' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`
            }
          >
            <Icon size={16} strokeWidth={2} />
            <span className="flex-1">{label}</span>
            {social && (
              <span className="flex items-center gap-1">
                <NotifBubble count={pendingCount} Icon={Users} color="bg-accent/20 text-accent-light" />
                <NotifBubble count={unreadCount}  Icon={Mail}  color="bg-warn/20 text-warn" />
              </span>
            )}
          </NavLink>
        ))}

        {isAdmin(profile) && (
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

      <div className="px-4 py-2 border-t border-border flex justify-end">
        <button
          onClick={toggleCompact}
          title={compact ? 'Switch to full width' : 'Switch to compact'}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          {compact ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Login streak tracker */}
      <div className="px-4 py-2.5 border-t border-border">
        <div className="flex items-center gap-2">
          <Flame size={11} className={loginStreak >= 7 ? 'text-orange-400' : 'text-text-muted'} />
          <div className="flex flex-1 justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < loginStreak
                    ? loginStreak >= 7 ? 'bg-orange-400' : 'bg-accent'
                    : 'bg-card border border-border'
                }`}
              />
            ))}
          </div>
          <span className="text-2xs ml-auto font-medium">
            {loginStreak >= 7
              ? <span className="text-orange-400">7-day bonus!</span>
              : <span className="text-text-muted">{loginStreak}/7 days</span>
            }
          </span>
        </div>
      </div>

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
