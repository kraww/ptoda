import BottomNav from './BottomNav'

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
