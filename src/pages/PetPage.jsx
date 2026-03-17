import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import { determineEvolution } from '../lib/evolutionLogic'
import {
  STAGE_EGG, STAGE_BABY, STAGE_EVOLVED,
  HATCH_ACTION_THRESHOLD, EVOLVE_ACTION_THRESHOLD,
  COINS_PER_ACTION, STAT_MAX, DEFAULT_RECOVERY_WINDOW_HOURS
} from '../lib/constants'
import PetSprite from '../components/pet/PetSprite'
import StatPanel from '../components/pet/StatPanel'
import Button from '../components/ui/Button'
import Toast from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const CARE_ACTIONS = [
  { id: 'feed',  label: 'Feed',  emoji: '🍖', stat: 'hunger' },
  { id: 'play',  label: 'Play',  emoji: '⭐', stat: 'happiness' },
  { id: 'clean', label: 'Clean', emoji: '🫧', stat: 'cleanliness' },
  { id: 'sleep', label: 'Sleep', emoji: '⚡', stat: 'energy' },
]

function getSickTimeLeft(sickSince, decayConfig) {
  if (!sickSince) return null
  const windowHours = decayConfig?.find(r => r.recovery_window_hours != null)?.recovery_window_hours
    ?? DEFAULT_RECOVERY_WINDOW_HOURS
  const sickMs   = new Date(sickSince).getTime()
  const expiryMs = sickMs + windowHours * 60 * 60 * 1000
  const msLeft   = expiryMs - Date.now()
  if (msLeft <= 0) return 'Overdue'
  const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60))
  const minsLeft  = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60))
  if (hoursLeft > 0) return `${hoursLeft}h ${minsLeft}m left`
  return `${minsLeft} minutes left`
}

export default function PetPage() {
  const { user, profile, loadProfile } = useAuth()
  const { pet, setPet, species, decayConfig, loading, error, reload } = usePet()
  const [toast, setToast] = useState(null)
  const [acting, setActing] = useState(false)

  if (loading) return <LoadingSpinner message="Loading your pet…" />
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="text-4xl">😵</div>
      <p className="text-red-400">{error}</p>
      <Button onClick={reload}>Try Again</Button>
    </div>
  )
  if (!pet) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <div className="text-5xl">🪺</div>
      <h2 className="text-xl font-bold">No pet yet</h2>
      <p className="text-slate-400 text-sm">Your egg is waiting for you</p>
      <Link to="/adopt"><Button size="lg">Adopt an Egg</Button></Link>
    </div>
  )

  const totalActions = Object.values(pet.action_counts ?? {}).reduce((a, b) => a + b, 0)
  const canHatch  = pet.stage === STAGE_EGG  && totalActions >= HATCH_ACTION_THRESHOLD
  const canEvolve = pet.stage === STAGE_BABY && totalActions >= EVOLVE_ACTION_THRESHOLD
  const timeLeft  = pet.is_sick ? getSickTimeLeft(pet.sick_since, decayConfig) : null

  async function doCareAction(action) {
    if (acting || pet.is_sick) return
    setActing(true)
    try {
      const stat   = action.stat
      const newVal = Math.min(STAT_MAX, (pet[stat] ?? 0) + 20)
      const newCounts = { ...pet.action_counts, [action.id]: (pet.action_counts?.[action.id] ?? 0) + 1 }

      await supabase.from('pets').update({
        [stat]: newVal,
        action_counts: newCounts,
        last_stat_update: new Date().toISOString(),
      }).eq('id', pet.id)

      await supabase.from('profiles').update({ coins: (profile?.coins ?? 0) + COINS_PER_ACTION }).eq('id', user.id)
      await loadProfile(user.id)
      await supabase.from('care_log').insert({ pet_id: pet.id, action: action.id, coins_earned: COINS_PER_ACTION })

      setPet(p => ({ ...p, [stat]: newVal, action_counts: newCounts }))
      setToast(`${action.emoji} ${action.label}! +${COINS_PER_ACTION} coins`)
    } catch (e) {
      setToast('Something went wrong')
    } finally {
      setActing(false)
    }
  }

  async function useMedicine() {
    if (acting) return
    setActing(true)
    try {
      // Find medicine in inventory
      const { data: inv } = await supabase
        .from('inventory')
        .select('id, quantity, items!inner(id, category)')
        .eq('user_id', user.id)
        .eq('items.category', 'medicine')
        .gt('quantity', 0)
        .limit(1)
        .maybeSingle()

      if (!inv) { setToast('No medicine in your bag!'); setActing(false); return }

      // Recover the pet — reset all stats to 40
      await supabase.from('pets').update({
        is_sick: false,
        sick_since: null,
        hunger: 40,
        happiness: 40,
        cleanliness: 40,
        energy: 40,
        last_stat_update: new Date().toISOString(),
      }).eq('id', pet.id)

      // Consume one medicine
      await supabase.from('inventory').update({ quantity: inv.quantity - 1 }).eq('id', inv.id)
      await supabase.from('care_log').insert({ pet_id: pet.id, action: 'medicine', item_id: inv.items.id, coins_earned: 0 })

      await reload()
      setToast(`💊 ${pet.name} is recovering!`)
    } catch (e) {
      setToast('Something went wrong')
    } finally {
      setActing(false)
    }
  }

  async function hatch() {
    if (acting) return
    setActing(true)
    try {
      await supabase.from('pets').update({ stage: STAGE_BABY, last_stat_update: new Date().toISOString() }).eq('id', pet.id)
      await reload()
      setToast('🐣 Your egg hatched!')
    } catch (e) {
      setToast('Something went wrong')
    } finally {
      setActing(false)
    }
  }

  async function evolve() {
    if (acting) return
    setActing(true)
    try {
      const form = determineEvolution(pet.action_counts)
      await supabase.from('pets').update({
        stage: STAGE_EVOLVED,
        evolution_form: form,
        evolved_at: new Date().toISOString(),
        last_stat_update: new Date().toISOString(),
      }).eq('id', pet.id)
      await reload()
      setToast(`✨ ${pet.name} evolved into a ${form}!`)
    } catch (e) {
      setToast('Something went wrong')
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{pet.name}</h1>
          <p className="text-slate-400 text-sm capitalize">{pet.stage} · {species?.name ?? '?'}</p>
        </div>
        <div className="text-right">
          <div className="text-primary-400 font-bold">{profile?.coins ?? 0} 🪙</div>
          <div className="text-slate-500 text-xs">coins</div>
        </div>
      </div>

      {/* Sick banner */}
      {pet.is_sick && (
        <div className="bg-red-950 border border-red-700 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤒</span>
            <div>
              <p className="font-bold text-red-300">{pet.name} is sick!</p>
              <p className="text-red-400 text-sm">Use medicine to nurse them back to health.</p>
            </div>
          </div>
          {timeLeft && (
            <p className="text-xs text-red-500 text-center font-mono bg-red-950/60 rounded-xl py-1.5">
              ⏳ Recovery window: {timeLeft}
            </p>
          )}
          <Button onClick={useMedicine} disabled={acting} variant="danger" className="w-full">
            💊 Use Medicine
          </Button>
          <p className="text-xs text-slate-500 text-center">
            No medicine? Buy some in the <Link to="/shop" className="text-primary-400 underline">Shop</Link>.
          </p>
        </div>
      )}

      {/* Pet display */}
      <div className={`flex justify-center py-4 rounded-2xl border ${pet.is_sick ? 'bg-red-950/20 border-red-900' : 'bg-slate-900 border-slate-800'}`}>
        <div className={pet.is_sick ? 'grayscale opacity-70' : ''}>
          <PetSprite pet={pet} species={species} size={160} />
        </div>
      </div>

      {/* Stage prompts (only when healthy) */}
      {!pet.is_sick && canHatch && (
        <div className="bg-primary-900/40 border border-primary-700 rounded-2xl p-4 text-center">
          <p className="text-primary-300 font-semibold mb-2">Your egg is ready to hatch! 🐣</p>
          <Button onClick={hatch} disabled={acting}>Hatch Now</Button>
        </div>
      )}
      {!pet.is_sick && canEvolve && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-2xl p-4 text-center">
          <p className="text-yellow-300 font-semibold mb-2">Your pet is ready to evolve! ✨</p>
          <Button onClick={evolve} disabled={acting}>Evolve</Button>
        </div>
      )}
      {!pet.is_sick && pet.stage === STAGE_EGG && !canHatch && (
        <div className="text-center text-slate-500 text-sm">
          Care for your egg {HATCH_ACTION_THRESHOLD - totalActions} more time{HATCH_ACTION_THRESHOLD - totalActions === 1 ? '' : 's'} to hatch it
        </div>
      )}

      {/* Stats */}
      <StatPanel pet={pet} />

      {/* Care actions — locked when sick */}
      <div className={`grid grid-cols-2 gap-3 ${pet.is_sick ? 'opacity-40 pointer-events-none' : ''}`}>
        {CARE_ACTIONS.map(action => (
          <button
            key={action.id}
            onClick={() => doCareAction(action)}
            disabled={acting || pet.is_sick}
            className="bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <span className="text-3xl">{action.emoji}</span>
            <span className="text-sm font-semibold">{action.label}</span>
          </button>
        ))}
      </div>
      {pet.is_sick && (
        <p className="text-center text-red-500 text-xs">Care actions are locked while your pet is sick</p>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
