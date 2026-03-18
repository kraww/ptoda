import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AdminNav from './components/AdminNav'
import AdminDashboard from './pages/AdminDashboard'
import AdminSpecies from './pages/AdminSpecies'
import AdminItems from './pages/AdminItems'
import AdminDecay from './pages/AdminDecay'
import AdminUsers from './pages/AdminUsers'
import AdminPosts        from './pages/AdminPosts'
import AdminForum        from './pages/AdminForum'
import AdminAchievements from './pages/AdminAchievements'
import AdminAvatars      from './pages/AdminAvatars'
import AdminGames        from './pages/AdminGames'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { isAdmin } from '../lib/admin'

export default function AdminApp() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user || !isAdmin(profile)) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-48 shrink-0 bg-sidebar border-r border-border flex flex-col min-h-screen">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="font-bold text-text-primary text-sm">T'poda <span className="text-text-muted font-normal">Admin</span></h1>
          <Link
            to="/pet"
            className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors text-xs mt-2"
          >
            <ArrowLeft size={12} />
            Back to site
          </Link>
        </div>
        <AdminNav />
        <div className="mt-auto px-4 py-3 border-t border-border">
          <p className="text-2xs text-text-muted truncate">{user.email}</p>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 px-6 py-6 bg-bg min-h-screen overflow-y-auto">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="species" element={<AdminSpecies />} />
          <Route path="items"   element={<AdminItems />} />
          <Route path="decay"   element={<AdminDecay />} />
          <Route path="users"   element={<AdminUsers />} />
          <Route path="posts"        element={<AdminPosts />} />
          <Route path="forum"        element={<AdminForum />} />
          <Route path="achievements" element={<AdminAchievements />} />
          <Route path="avatars"      element={<AdminAvatars />} />
          <Route path="games"        element={<AdminGames />} />
        </Routes>
      </main>
    </div>
  )
}
