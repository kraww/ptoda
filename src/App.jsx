import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PetProvider } from './context/PetContext'

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
import LoadingSpinner from './components/ui/LoadingSpinner'

function AppRoutes() {
  const { user, loading, profile } = useAuth()

  useEffect(() => {
    const THEMES = {
      dark:    { bg: '#0e0e10', sidebar: '#141416', surface: '#1c1c1f', card: '#242428', hover: '#2e2e33', border: '#2e2e33', textPrimary: '#f2f3f5', textSecondary: '#a1a1aa', textMuted: '#52525b' },
      light:   { bg: '#f0f0f3', sidebar: '#e8e8ec', surface: '#ffffff', card: '#f5f5f8', hover: '#ebebef', border: '#dddde3', textPrimary: '#18181b', textSecondary: '#52525b', textMuted: '#a1a1aa' },
      neutral: { bg: '#1a1815', sidebar: '#201e1a', surface: '#28251f', card: '#302c25', hover: '#3a352c', border: '#3a352c', textPrimary: '#f0ebe0', textSecondary: '#a89880', textMuted: '#6b5e4a' },
      forest:  { bg: '#0d1410', sidebar: '#111a14', surface: '#182118', card: '#1e2a1e', hover: '#263426', border: '#2a3a2a', textPrimary: '#e8f0e8', textSecondary: '#8aaa8a', textMuted: '#4a6a4a' },
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
      <Route path="/profile"   element={user ? <AppShell><ProfilePage /></AppShell>   : <Navigate to="/login" replace />} />

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
          <AppRoutes />
        </PetProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
