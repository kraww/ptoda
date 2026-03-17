import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminNav from './components/AdminNav'
import AdminDashboard from './pages/AdminDashboard'
import AdminSpecies from './pages/AdminSpecies'
import AdminItems from './pages/AdminItems'
import AdminDecay from './pages/AdminDecay'
import AdminUsers from './pages/AdminUsers'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const ADMIN_IDS = ['a9a09202-6f21-4b9a-bb20-d0d38c49d9d7']

export default function AdminApp() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user || (!ADMIN_IDS.includes(user.id) && ADMIN_IDS.length > 0)) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-primary-400">T'poda Admin</h1>
          <span className="text-slate-500 text-xs">{user.email}</span>
        </div>
      </div>
      <AdminNav />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="species" element={<AdminSpecies />} />
          <Route path="items"   element={<AdminItems />} />
          <Route path="decay"   element={<AdminDecay />} />
          <Route path="users"   element={<AdminUsers />} />
        </Routes>
      </main>
    </div>
  )
}
