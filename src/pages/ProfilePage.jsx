import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import Button from '../components/ui/Button'
import { STAGE_EGG, STAGE_BABY, STAGE_EVOLVED } from '../lib/constants'

const STAGE_LABEL = { [STAGE_EGG]: 'Egg', [STAGE_BABY]: 'Baby', [STAGE_EVOLVED]: 'Evolved' }

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const { pet, species } = usePet()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-800 rounded-full flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <div className="font-semibold">{profile?.username ?? '…'}</div>
            <div className="text-slate-400 text-sm">{user?.email}</div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-3 flex justify-between text-sm">
          <span className="text-slate-400">Coins</span>
          <span className="text-primary-400 font-bold">{profile?.coins ?? 0} 🪙</span>
        </div>
      </div>

      {pet && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2">
          <h2 className="font-semibold text-slate-300">Current Pet</h2>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Name</span>
            <span>{pet.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Species</span>
            <span>{species?.name ?? '?'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Stage</span>
            <span className="capitalize">{STAGE_LABEL[pet.stage] ?? pet.stage}</span>
          </div>
          {pet.evolution_form && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Evolution</span>
              <span className="capitalize text-yellow-400">{pet.evolution_form}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <Button variant="danger" onClick={signOut} className="w-full">Log Out</Button>
      </div>
    </div>
  )
}
