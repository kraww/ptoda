import { useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import Button from '../components/ui/Button'

const STAGE_LABEL = { egg: 'Egg', baby: 'Baby', evolved: 'Evolved' }

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const { pet, species } = usePet()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-5">

      <h1 className="text-2xl font-bold text-text-primary">Profile</h1>

      {/* Account */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
            <User size={18} className="text-accent-light" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">{profile?.username ?? '…'}</p>
            <p className="text-xs text-text-muted">{user?.email}</p>
          </div>
        </div>
        <div className="px-4 py-3 flex justify-between text-sm">
          <span className="text-text-muted">Coins</span>
          <span className="text-text-primary font-medium">{profile?.coins ?? 0}</span>
        </div>
      </div>

      {/* Current pet */}
      {pet && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <p className="section-label px-4 pt-4 pb-2">Current Pet</p>
          {[
            { label: 'Name',    value: pet.name },
            { label: 'Species', value: species?.name ?? '—' },
            { label: 'Stage',   value: STAGE_LABEL[pet.stage] ?? pet.stage },
            ...(pet.evolution_form ? [{ label: 'Evolution', value: pet.evolution_form }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between px-4 py-2.5 text-sm border-t border-border first:border-t-0">
              <span className="text-text-muted">{label}</span>
              <span className="text-text-primary capitalize">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sign out */}
      <Button variant="danger" onClick={handleSignOut} className="w-full">
        <LogOut size={14} /> Sign Out
      </Button>

    </div>
  )
}
