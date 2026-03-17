import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="md:ml-56 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-20 md:pb-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
