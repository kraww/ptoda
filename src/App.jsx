import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PetProvider } from './context/PetContext'
import { SocialProvider } from './context/SocialContext'

import AppShell from './components/layout/AppShell'
import LandingPage    from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import AdoptPage      from './pages/AdoptPage'
import PetPage        from './pages/PetPage'
import ShopPage       from './pages/ShopPage'
import InventoryPage  from './pages/InventoryPage'
import NewsPage       from './pages/NewsPage'
import ProfilePage       from './pages/ProfilePage'
import PublicProfilePage from './pages/PublicProfilePage'
import NotFoundPage      from './pages/NotFoundPage'
import AdminApp       from './admin/AdminApp'
import GamesPage         from './pages/GamesPage'
import SocialPage        from './pages/SocialPage'
import MeterStopperGame  from './pages/games/MeterStopperGame'
import SimonGame         from './pages/games/SimonGame'
import LuckyRollGame     from './pages/games/LuckyRollGame'
import ForumThread       from './pages/forum/ForumThread'
import LoadingSpinner from './components/ui/LoadingSpinner'

function AppRoutes() {
  const { user, loading, profile } = useAuth()

  useEffect(() => {
    const THEMES = {
      dark:    { bg: '14 14 16',    sidebar: '20 20 22',   surface: '28 28 31',  card: '36 36 40',  hover: '46 46 51',   border: '46 46 51',   textPrimary: '242 243 245', textSecondary: '161 161 170', textMuted: '82 82 91'   },
      light:   { bg: '240 240 243', sidebar: '232 232 236', surface: '255 255 255', card: '245 245 248', hover: '235 235 239', border: '221 221 227', textPrimary: '24 24 27',   textSecondary: '82 82 91',    textMuted: '161 161 170' },
      neutral: { bg: '42 42 48',    sidebar: '50 50 58',   surface: '60 60 68',  card: '70 70 80',  hover: '82 82 94',   border: '82 82 94',   textPrimary: '232 232 240', textSecondary: '176 176 192', textMuted: '120 120 144' },
      forest:  { bg: '13 20 16',    sidebar: '17 26 20',   surface: '24 33 24',  card: '30 42 30',  hover: '38 52 38',   border: '42 58 42',   textPrimary: '232 240 232', textSecondary: '138 170 138', textMuted: '74 106 74'  },
    }
    const t = THEMES[profile?.active_theme ?? 'dark'] ?? THEMES.dark
    const r = document.documentElement
    r.style.setProperty('--color-bg',             t.bg)
    r.style.setProperty('--color-sidebar',        t.sidebar)
    r.style.setProperty('--color-surface',        t.surface)
    r.style.setProperty('--color-card',           t.card)
    r.style.setProperty('--color-hover',          t.hover)
    r.style.setProperty('--color-border',         t.border)
    r.style.setProperty('--color-text-primary',   t.textPrimary)
    r.style.setProperty('--color-text-secondary', t.textSecondary)
    r.style.setProperty('--color-text-muted',     t.textMuted)
  }, [profile?.active_theme])

  if (loading) return <LoadingSpinner message="Starting up…" />

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"         element={user ? <Navigate to="/pet" replace /> : <LandingPage />} />
      <Route path="/login"    element={user ? <Navigate to="/pet" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/pet" replace /> : <RegisterPage />} />

      {/* News is public — logged in or not */}
      <Route path="/news" element={
        user
          ? <AppShell><NewsPage /></AppShell>
          : <NewsPage />
      } />

      {/* Protected routes */}
      <Route path="/adopt"     element={user ? <AppShell><AdoptPage /></AppShell>     : <Navigate to="/login" replace />} />
      <Route path="/pet"       element={user ? <AppShell><PetPage /></AppShell>       : <Navigate to="/login" replace />} />
      <Route path="/shop"      element={user ? <AppShell><ShopPage /></AppShell>      : <Navigate to="/login" replace />} />
      <Route path="/inventory" element={user ? <AppShell><InventoryPage /></AppShell> : <Navigate to="/login" replace />} />
      <Route path="/social"    element={user ? <AppShell><SocialPage /></AppShell>    : <Navigate to="/login" replace />} />
      <Route path="/games"               element={user ? <AppShell><GamesPage /></AppShell>           : <Navigate to="/login" replace />} />
      <Route path="/games/meter-stopper" element={user ? <AppShell><MeterStopperGame /></AppShell>    : <Navigate to="/login" replace />} />
      <Route path="/games/simon"         element={user ? <AppShell><SimonGame /></AppShell>           : <Navigate to="/login" replace />} />
      <Route path="/games/lucky-roll"    element={user ? <AppShell><LuckyRollGame /></AppShell>       : <Navigate to="/login" replace />} />
      <Route path="/profile"   element={user ? <AppShell><ProfilePage /></AppShell>   : <Navigate to="/login" replace />} />

      {/* Forum threads — no login required to read, AppShell for logged-in users */}
      <Route path="/community/:postId" element={user ? <AppShell><ForumThread /></AppShell> : <ForumThread />} />

      {/* Public profiles — no login required */}
      <Route path="/user/:username" element={<PublicProfilePage />} />

      {/* Admin */}
      <Route path="/admin/*" element={<AdminApp />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PetProvider>
          <SocialProvider>
            <AppRoutes />
          </SocialProvider>
        </PetProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
