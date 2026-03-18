import { LayoutProvider, useLayout } from '../../context/LayoutContext'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import OnboardingModal from '../OnboardingModal'

function Shell({ children }) {
  const { compact } = useLayout()
  const { profile } = useAuth()
  const showOnboarding = profile && profile.onboarding_complete === false

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="md:ml-56 min-h-screen">
        <div className={`px-4 pt-6 pb-20 md:pb-8 ${compact ? 'max-w-sm' : 'max-w-2xl mx-auto'}`}>
          {children}
        </div>
      </main>
      <BottomNav />
      {showOnboarding && <OnboardingModal />}
    </div>
  )
}

export default function AppShell({ children }) {
  return (
    <LayoutProvider>
      <Shell>{children}</Shell>
    </LayoutProvider>
  )
}
