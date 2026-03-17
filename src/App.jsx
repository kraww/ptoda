import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
  const { user, loading } = useAuth()

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
